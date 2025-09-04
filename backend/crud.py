from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models import FeatureFlag, Rule, FlagExposure
from schemas import FeatureFlagIn


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

async def log_flag_exposure(db: AsyncSession, flag_id: int, flag_name: str, user_id: str, enabled: bool):
    """Log when a user is exposed to a feature flag"""
    exposure = FlagExposure(
        flag_id=flag_id,
        flag_name=flag_name,
        user_id=user_id,
        enabled="true" if enabled else "false"
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
