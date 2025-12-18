from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models import FeatureFlag, Rule, FlagExposure, UserSegment, FlagSegment, RemoteConfig, ConfigSegment, ConfigExposure
try:
    from backend.schemas import FeatureFlagIn, UserSegmentIn, FlagSegmentIn, UserContext, RemoteConfigIn, ConfigSegmentIn
except ImportError:
    from schemas import FeatureFlagIn, UserSegmentIn, FlagSegmentIn, UserContext, RemoteConfigIn, ConfigSegmentIn


async def get_flag_by_name(db: AsyncSession, name: str):
    result = await db.execute(
        select(FeatureFlag)
        .options(selectinload(FeatureFlag.rules))
        .where(FeatureFlag.name == name)
    )
    return result.scalar_one_or_none()

async def get_all_flags(db: AsyncSession):
    result = await db.execute(
        select(FeatureFlag)
        .options(selectinload(FeatureFlag.rules))
    )
    return result.scalars().all()

async def create_flag(db: AsyncSession, flag_in: FeatureFlagIn):
    flag = FeatureFlag(
        name=flag_in.name,
        description=flag_in.description,
        rollout=flag_in.rollout
    )
    db.add(flag)
    await db.flush()  # To get flag.id before adding rules

    for rule in flag_in.rules:
        db.add(Rule(
            flag_id=flag.id,
            field=rule.field,
            op=rule.op,
            value=rule.value
        ))

    await db.commit()
    await db.refresh(flag)
    return flag

async def update_flag(db: AsyncSession, flag_name: str, flag_in: FeatureFlagIn):
    # Get the existing flag
    existing_flag = await get_flag_by_name(db, flag_name)
    if not existing_flag:
        return None
    
    # Update basic fields
    existing_flag.name = flag_in.name
    existing_flag.description = flag_in.description
    existing_flag.rollout = flag_in.rollout
    
    # Delete existing rules
    for rule in existing_flag.rules:
        await db.delete(rule)
    
    # Add new rules
    for rule in flag_in.rules:
        db.add(Rule(
            flag_id=existing_flag.id,
            field=rule.field,
            op=rule.op,
            value=rule.value
        ))
    
    await db.commit()
    await db.refresh(existing_flag)
    return existing_flag

async def log_flag_exposure(db: AsyncSession, flag_id: int, flag_name: str, user_id: str, enabled: bool, segment_id: int = None):
    """Log when a user is exposed to a feature flag"""
    exposure = FlagExposure(
        flag_id=flag_id,
        flag_name=flag_name,
        user_id=user_id,
        enabled="true" if enabled else "false",
        segment_id=segment_id
    )
    db.add(exposure)
    await db.commit()
    return exposure

async def get_flag_exposures(db: AsyncSession, flag_name: str = None, limit: int = 100):
    """Get flag exposure logs"""
    query = select(FlagExposure).order_by(FlagExposure.timestamp.desc())
    
    if flag_name:
        query = query.where(FlagExposure.flag_name == flag_name)
    
    if limit:
        query = query.limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

# User Segment CRUD Operations

async def create_user_segment(db: AsyncSession, segment_in: UserSegmentIn):
    """Create a new user segment"""
    conditions_json = [condition.dict() for condition in segment_in.conditions]
    
    segment = UserSegment(
        name=segment_in.name,
        description=segment_in.description,
        conditions=conditions_json
    )
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return segment

async def get_user_segment_by_name(db: AsyncSession, name: str):
    """Get a user segment by name"""
    result = await db.execute(
        select(UserSegment).where(UserSegment.name == name)
    )
    return result.scalar_one_or_none()

async def get_user_segment_by_id(db: AsyncSession, segment_id: int):
    """Get a user segment by ID"""
    result = await db.execute(
        select(UserSegment).where(UserSegment.id == segment_id)
    )
    return result.scalar_one_or_none()

async def get_all_user_segments(db: AsyncSession):
    """Get all user segments"""
    result = await db.execute(select(UserSegment).order_by(UserSegment.name))
    return result.scalars().all()

async def update_user_segment(db: AsyncSession, segment_id: int, segment_in: UserSegmentIn):
    """Update an existing user segment"""
    segment = await get_user_segment_by_id(db, segment_id)
    if not segment:
        return None
    
    conditions_json = [condition.dict() for condition in segment_in.conditions]
    
    segment.name = segment_in.name
    segment.description = segment_in.description
    segment.conditions = conditions_json
    
    await db.commit()
    await db.refresh(segment)
    return segment

async def delete_user_segment(db: AsyncSession, segment_id: int):
    """Delete a user segment"""
    segment = await get_user_segment_by_id(db, segment_id)
    if not segment:
        return None
    
    await db.delete(segment)
    await db.commit()
    return segment

# Flag-Segment Association Operations

async def add_segment_to_flag(db: AsyncSession, flag_id: int, segment_association: FlagSegmentIn):
    """Associate a segment with a feature flag"""
    flag_segment = FlagSegment(
        flag_id=flag_id,
        segment_id=segment_association.segment_id,
        enabled=segment_association.enabled,
        rollout_percentage=segment_association.rollout_percentage,
        priority=segment_association.priority
    )
    db.add(flag_segment)
    await db.commit()
    await db.refresh(flag_segment)
    return flag_segment

async def remove_segment_from_flag(db: AsyncSession, flag_id: int, segment_id: int):
    """Remove a segment association from a feature flag"""
    result = await db.execute(
        select(FlagSegment).where(
            FlagSegment.flag_id == flag_id,
            FlagSegment.segment_id == segment_id
        )
    )
    flag_segment = result.scalar_one_or_none()
    
    if not flag_segment:
        return None
    
    await db.delete(flag_segment)
    await db.commit()
    return flag_segment

async def get_flag_segments(db: AsyncSession, flag_id: int):
    """Get all segments associated with a feature flag"""
    result = await db.execute(
        select(FlagSegment)
        .options(selectinload(FlagSegment.segment))
        .where(FlagSegment.flag_id == flag_id)
        .order_by(FlagSegment.priority.desc())
    )
    return result.scalars().all()

# Segment Evaluation Logic

def evaluate_segment_condition(user_traits: dict, condition: dict) -> bool:
    """Evaluate a single segment condition against user traits"""
    field = condition.get("field")
    operator = condition.get("operator")
    expected_value = condition.get("value")
    
    if field not in user_traits:
        return False
    
    actual_value = user_traits[field]
    
    if operator == "equals":
        return actual_value == expected_value
    elif operator == "not_equals":
        return actual_value != expected_value
    elif operator == "contains":
        return str(expected_value).lower() in str(actual_value).lower()
    elif operator == "not_contains":
        return str(expected_value).lower() not in str(actual_value).lower()
    elif operator == "in":
        return actual_value in expected_value if isinstance(expected_value, list) else False
    elif operator == "not_in":
        return actual_value not in expected_value if isinstance(expected_value, list) else True
    elif operator == "greater_than":
        try:
            return float(actual_value) > float(expected_value)
        except (ValueError, TypeError):
            return False
    elif operator == "less_than":
        try:
            return float(actual_value) < float(expected_value)
        except (ValueError, TypeError):
            return False
    elif operator == "greater_than_or_equal":
        try:
            return float(actual_value) >= float(expected_value)
        except (ValueError, TypeError):
            return False
    elif operator == "less_than_or_equal":
        try:
            return float(actual_value) <= float(expected_value)
        except (ValueError, TypeError):
            return False
    elif operator == "starts_with":
        return str(actual_value).lower().startswith(str(expected_value).lower())
    elif operator == "ends_with":
        return str(actual_value).lower().endswith(str(expected_value).lower())
    else:
        return False

async def evaluate_user_segment(db: AsyncSession, segment_id: int, user_context: UserContext) -> bool:
    """Evaluate if a user matches a segment"""
    segment = await get_user_segment_by_id(db, segment_id)
    if not segment:
        return False
    
    # If no conditions, segment matches everyone
    if not segment.conditions:
        return True
    
    # All conditions must be true (AND logic)
    for condition in segment.conditions:
        if not evaluate_segment_condition(user_context.traits, condition):
            return False
    
    return True

async def find_matching_segments(db: AsyncSession, flag_id: int, user_context: UserContext):
    """Find all segments that match a user for a specific flag, ordered by priority"""
    flag_segments = await get_flag_segments(db, flag_id)
    matching_segments = []
    
    for flag_segment in flag_segments:
        if flag_segment.enabled and await evaluate_user_segment(db, flag_segment.segment_id, user_context):
            matching_segments.append(flag_segment)
    
    return matching_segments

# Remote Configuration CRUD Operations

async def create_remote_config(db: AsyncSession, config_in: RemoteConfigIn):
    """Create a new remote configuration"""
    config = RemoteConfig(
        key=config_in.key,
        description=config_in.description,
        value_type=config_in.value_type,
        default_value=config_in.default_value
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

async def get_remote_config_by_key(db: AsyncSession, key: str):
    """Get a remote config by key"""
    result = await db.execute(
        select(RemoteConfig)
        .options(selectinload(RemoteConfig.config_segments).selectinload(ConfigSegment.segment))
        .where(RemoteConfig.key == key)
    )
    return result.scalar_one_or_none()

async def get_remote_config_by_id(db: AsyncSession, config_id: int):
    """Get a remote config by ID"""
    result = await db.execute(
        select(RemoteConfig)
        .options(selectinload(RemoteConfig.config_segments).selectinload(ConfigSegment.segment))
        .where(RemoteConfig.id == config_id)
    )
    return result.scalar_one_or_none()

async def get_all_remote_configs(db: AsyncSession):
    """Get all remote configurations"""
    result = await db.execute(
        select(RemoteConfig)
        .options(selectinload(RemoteConfig.config_segments).selectinload(ConfigSegment.segment))
        .order_by(RemoteConfig.key)
    )
    return result.scalars().all()

async def update_remote_config(db: AsyncSession, config_id: int, config_in: RemoteConfigIn):
    """Update an existing remote configuration"""
    config = await get_remote_config_by_id(db, config_id)
    if not config:
        return None
    
    config.key = config_in.key
    config.description = config_in.description
    config.value_type = config_in.value_type
    config.default_value = config_in.default_value
    
    await db.commit()
    await db.refresh(config)
    return config

async def delete_remote_config(db: AsyncSession, config_id: int):
    """Delete a remote configuration"""
    config = await get_remote_config_by_id(db, config_id)
    if not config:
        return None
    
    await db.delete(config)
    await db.commit()
    return config

# Config-Segment Association Operations

async def add_segment_to_config(db: AsyncSession, config_id: int, segment_association: ConfigSegmentIn):
    """Associate a segment with a remote config"""
    config_segment = ConfigSegment(
        config_id=config_id,
        segment_id=segment_association.segment_id,
        value=segment_association.value,
        enabled=segment_association.enabled,
        priority=segment_association.priority
    )
    db.add(config_segment)
    await db.commit()
    await db.refresh(config_segment)
    return config_segment

async def remove_segment_from_config(db: AsyncSession, config_id: int, segment_id: int):
    """Remove a segment association from a remote config"""
    result = await db.execute(
        select(ConfigSegment).where(
            ConfigSegment.config_id == config_id,
            ConfigSegment.segment_id == segment_id
        )
    )
    config_segment = result.scalar_one_or_none()
    
    if not config_segment:
        return None
    
    await db.delete(config_segment)
    await db.commit()
    return config_segment

async def get_config_segments(db: AsyncSession, config_id: int):
    """Get all segments associated with a remote config"""
    result = await db.execute(
        select(ConfigSegment)
        .options(selectinload(ConfigSegment.segment))
        .where(ConfigSegment.config_id == config_id)
        .order_by(ConfigSegment.priority.desc())
    )
    return result.scalars().all()

# Config Evaluation Logic

def parse_config_value(value: str, value_type: str):
    """Parse a config value based on its type"""
    if value_type == "string":
        return value
    elif value_type == "number":
        try:
            # Try int first, then float
            if "." in value:
                return float(value)
            else:
                return int(value)
        except ValueError:
            return value  # Return as string if parsing fails
    elif value_type == "boolean":
        return value.lower() in ("true", "1", "yes", "on")
    elif value_type == "json":
        try:
            import json
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return value  # Return as string if JSON parsing fails
    else:
        return value

async def find_matching_config_segments(db: AsyncSession, config_id: int, user_context: UserContext):
    """Find all segments that match a user for a specific config, ordered by priority"""
    config_segments = await get_config_segments(db, config_id)
    matching_segments = []
    
    for config_segment in config_segments:
        if config_segment.enabled and await evaluate_user_segment(db, config_segment.segment_id, user_context):
            matching_segments.append(config_segment)
    
    return matching_segments

async def evaluate_remote_config(db: AsyncSession, key: str, user_context: UserContext):
    """Evaluate a remote config for a specific user"""
    config = await get_remote_config_by_key(db, key)
    if not config:
        return None
    
    # Check for matching segments first (higher priority)
    matching_segments = await find_matching_config_segments(db, config.id, user_context)
    
    if matching_segments:
        # Use the highest priority matching segment
        selected_segment = matching_segments[0]  # Already sorted by priority
        value = selected_segment.value
        segment_id = selected_segment.segment_id
        segment_name = selected_segment.segment.name
    else:
        # Use default value
        value = config.default_value
        segment_id = None
        segment_name = None
    
    # Parse the value based on type
    parsed_value = parse_config_value(value, config.value_type)
    
    # Log the exposure
    await log_config_exposure(db, config.id, config.key, user_context.user_id, value, segment_id)
    
    return {
        "key": config.key,
        "value": parsed_value,
        "value_type": config.value_type,
        "segment_id": segment_id,
        "segment_name": segment_name
    }

async def evaluate_multiple_configs(db: AsyncSession, keys: list, user_context: UserContext):
    """Evaluate multiple remote configs for a specific user"""
    results = {}
    
    for key in keys:
        result = await evaluate_remote_config(db, key, user_context)
        if result:
            results[key] = result
    
    return results

async def log_config_exposure(db: AsyncSession, config_id: int, config_key: str, user_id: str, value: str, segment_id: int = None):
    """Log when a user is exposed to a remote config"""
    exposure = ConfigExposure(
        config_id=config_id,
        config_key=config_key,
        user_id=user_id,
        value=value,
        segment_id=segment_id
    )
    db.add(exposure)
    await db.commit()
    return exposure

async def get_config_exposures(db: AsyncSession, config_key: str = None, limit: int = 100):
    """Get config exposure logs"""
    query = select(ConfigExposure).order_by(ConfigExposure.timestamp.desc())
    
    if config_key:
        query = query.where(ConfigExposure.config_key == config_key)
    
    if limit:
        query = query.limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
