import os
import logging
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import hashlib
from sqlalchemy.ext.asyncio import AsyncSession

# Production imports
from db import init_database, get_db
from models import Base, SnowflakeConfig
import crud as crud
from routers import experiment_router
from routers import integrations
from routers import ai_experiments
# from scheduler import start_background_scheduler

# Production features (temporarily disabled)
# from middleware import setup_security_middleware, limiter, rate_limit
# from monitoring import router as monitoring_router
# from backup import router as backup_router
# from cache import init_cache, warm_up_cache

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
if log_level not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
    log_level = "INFO"

logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app with production settings
app = FastAPI(
    title="OptiFork",
    description="Open Source Feature Flag and A/B Testing Platform",
    version=os.getenv("APP_VERSION", "1.0.0"),
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT", "development") == "development" else None
)

# Setup CORS middleware - explicitly allow localhost origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000", 
        "http://localhost:80",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:80",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OptiFork"}

# Register routers
# app.include_router(monitoring_router)  # Health checks and metrics
# app.include_router(backup_router)      # Backup and restore
app.include_router(experiment_router.router)
app.include_router(integrations.router)
app.include_router(ai_experiments.router)

# Production startup sequence
@app.on_event("startup")
async def startup():
    """Initialize all production systems"""
    logger.info("🚀 Starting OptiFork production server...")
    
    # 1. Initialize database
    db_success = await init_database()
    if not db_success:
        logger.error("❌ Database initialization failed")
        raise Exception("Database initialization failed")
    
    # 2. Initialize cache - temporarily disabled
    # await init_cache()
    
    # 3. Warm up cache with frequently accessed data - temporarily disabled
    # await warm_up_cache()
    
    # 4. Start background scheduler - temporarily disabled
    # start_background_scheduler()
    
    logger.info("✅ OptiFork production server started successfully")

@app.on_event("shutdown")
async def shutdown():
    """Cleanup on server shutdown"""
    logger.info("🛑 Shutting down OptiFork server...")
    
    # Cleanup cache connections - temporarily disabled
    # from cache import cache_manager
    # await cache_manager.disconnect()
    
    logger.info("✅ OptiFork server shutdown complete")

# ✅ Models for Feature Flag
class RuleIn(BaseModel):
    field: str
    op: str
    value: Any

class FeatureFlagIn(BaseModel):
    name: str
    description: Optional[str] = None
    rollout: float
    rules: Optional[List[RuleIn]] = []

class FlagResponse(BaseModel):
    flag: str
    user_id: str
    enabled: bool

class UserContext(BaseModel):
    """User context for segment evaluation"""
    user_id: str
    traits: Dict[str, Any] = {}

# ✅ Create flag
@app.post("/flags")
async def create_flag(flag: FeatureFlagIn, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_flag_by_name(db, flag.name)
    if existing:
        raise HTTPException(status_code=400, detail="Flag already exists")
    if not 0.0 <= flag.rollout <= 1.0:
        raise HTTPException(status_code=400, detail="Rollout must be between 0 and 1")
    await crud.create_flag(db, flag)
    return {"message": f"Flag '{flag.name}' created successfully"}

# ✅ List flags
@app.get("/flags")
async def list_flags(db: AsyncSession = Depends(get_db)):
    return await crud.get_all_flags(db)

# ✅ Update flag
@app.put("/flags/{flag_name}")
async def update_flag(flag_name: str, flag: FeatureFlagIn, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_flag_by_name(db, flag_name)
    if not existing:
        raise HTTPException(status_code=404, detail="Flag not found")
    if not 0.0 <= flag.rollout <= 1.0:
        raise HTTPException(status_code=400, detail="Rollout must be between 0 and 1")
    await crud.update_flag(db, flag_name, flag)
    return {"message": f"Flag '{flag_name}' updated successfully"}

# ✅ Get flag exposures
@app.get("/flags/{flag_name}/exposures")
async def get_flag_exposures(flag_name: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    exposures = await crud.get_flag_exposures(db, flag_name, limit)
    return [
        {
            "id": exp.id,
            "flag_name": exp.flag_name,
            "user_id": exp.user_id,
            "enabled": exp.enabled == "true",
            "timestamp": exp.timestamp
        }
        for exp in exposures
    ]

# ✅ Get all flag exposures
@app.get("/exposures")
async def get_all_exposures(limit: int = 100, db: AsyncSession = Depends(get_db)):
    exposures = await crud.get_flag_exposures(db, None, limit)
    return [
        {
            "id": exp.id,
            "flag_name": exp.flag_name,
            "user_id": exp.user_id,
            "enabled": exp.enabled == "true",
            "timestamp": exp.timestamp
        }
        for exp in exposures
    ]

# ✅ Evaluate flag logic
def evaluate_rules(rules: List[Dict[str, Any]], user_attrs: Dict[str, Any]) -> bool:
    for rule in rules:
        field_val = user_attrs.get(rule["field"])
        if field_val is None:
            continue
        if rule["op"] == "eq" and field_val == rule["value"]:
            return True
        elif rule["op"] == "ne" and field_val != rule["value"]:
            return True
        elif rule["op"] == "gt" and field_val > rule["value"]:
            return True
        elif rule["op"] == "lt" and field_val < rule["value"]:
            return True
    return False

# ✅ Test if flag is enabled
@app.get("/flags/{flag_name}", response_model=FlagResponse)
async def evaluate_flag(flag_name: str, user_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    flag = await crud.get_flag_by_name(db, flag_name)
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    user_attrs = dict(request.query_params)
    user_attrs["user_id"] = user_id
    
    # Create user context for segment evaluation
    user_context = UserContext(user_id=user_id, traits=user_attrs)
    
    # Check for matching segments first (higher priority than rules)
    matching_segments = await crud.find_matching_segments(db, flag.id, user_context)
    
    if matching_segments:
        # Use the highest priority matching segment
        selected_segment = matching_segments[0]  # Already sorted by priority
        
        # Apply segment-specific rollout percentage
        hash_val = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
        normalized = (hash_val % 10000) / 10000.0
        enabled = normalized < (selected_segment.rollout_percentage / 100.0)
        
        # Log the exposure with segment info
        await crud.log_flag_exposure(db, flag.id, flag.name, user_id, enabled, selected_segment.segment_id)
        
        return FlagResponse(flag=flag_name, user_id=user_id, enabled=enabled)
    
    # Fall back to legacy rule-based evaluation if no segments match
    rules = [
        {"field": r.field, "op": r.op, "value": r.value}
        for r in flag.rules
    ]

    # If rules exist, they act as gates - user must match rules to be eligible for rollout
    if rules and not evaluate_rules(rules, user_attrs):
        # Log the exposure (disabled due to rules)
        await crud.log_flag_exposure(db, flag.id, flag.name, user_id, False)
        return FlagResponse(flag=flag_name, user_id=user_id, enabled=False)

    # Apply rollout-based assignment (either no rules, or rules matched)
    hash_val = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
    normalized = (hash_val % 10000) / 10000.0
    enabled = normalized < flag.rollout
    
    # Log the exposure
    await crud.log_flag_exposure(db, flag.id, flag.name, user_id, enabled)
    
    return FlagResponse(flag=flag_name, user_id=user_id, enabled=enabled)

# ✅ User Segment Management Endpoints

class UserSegmentIn(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: List[Dict[str, Any]] = []

class UserSegmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    conditions: List[Dict[str, Any]]
    created_at: str
    updated_at: str

@app.post("/segments", response_model=UserSegmentOut)
async def create_user_segment(segment: UserSegmentIn, db: AsyncSession = Depends(get_db)):
    """Create a new user segment"""
    # Convert dict conditions to SegmentCondition objects
    try:
        from backend.schemas import SegmentCondition, UserSegmentIn as UserSegmentInSchema
    except ImportError:
        from schemas import SegmentCondition, UserSegmentIn as UserSegmentInSchema
    
    segment_conditions = [
        SegmentCondition(**condition) for condition in segment.conditions
    ]
    segment_schema = UserSegmentInSchema(
        name=segment.name,
        description=segment.description,
        conditions=segment_conditions
    )
    
    existing = await crud.get_user_segment_by_name(db, segment.name)
    if existing:
        raise HTTPException(status_code=400, detail="Segment with this name already exists")
    
    new_segment = await crud.create_user_segment(db, segment_schema)
    return UserSegmentOut(
        id=new_segment.id,
        name=new_segment.name,
        description=new_segment.description,
        conditions=new_segment.conditions,
        created_at=str(new_segment.created_at),
        updated_at=str(new_segment.updated_at)
    )

@app.get("/segments", response_model=List[UserSegmentOut])
async def list_user_segments(db: AsyncSession = Depends(get_db)):
    """List all user segments"""
    segments = await crud.get_all_user_segments(db)
    return [
        UserSegmentOut(
            id=segment.id,
            name=segment.name,
            description=segment.description,
            conditions=segment.conditions,
            created_at=str(segment.created_at),
            updated_at=str(segment.updated_at)
        ) for segment in segments
    ]

@app.get("/segments/{segment_id}", response_model=UserSegmentOut)
async def get_user_segment(segment_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific user segment"""
    segment = await crud.get_user_segment_by_id(db, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return UserSegmentOut(
        id=segment.id,
        name=segment.name,
        description=segment.description,
        conditions=segment.conditions,
        created_at=str(segment.created_at),
        updated_at=str(segment.updated_at)
    )

@app.put("/segments/{segment_id}", response_model=UserSegmentOut)
async def update_user_segment(segment_id: int, segment: UserSegmentIn, db: AsyncSession = Depends(get_db)):
    """Update an existing user segment"""
    # Convert dict conditions to SegmentCondition objects
    try:
        from backend.schemas import SegmentCondition, UserSegmentIn as UserSegmentInSchema
    except ImportError:
        from schemas import SegmentCondition, UserSegmentIn as UserSegmentInSchema
    
    segment_conditions = [
        SegmentCondition(**condition) for condition in segment.conditions
    ]
    segment_schema = UserSegmentInSchema(
        name=segment.name,
        description=segment.description,
        conditions=segment_conditions
    )
    
    updated_segment = await crud.update_user_segment(db, segment_id, segment_schema)
    if not updated_segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return UserSegmentOut(
        id=updated_segment.id,
        name=updated_segment.name,
        description=updated_segment.description,
        conditions=updated_segment.conditions,
        created_at=str(updated_segment.created_at),
        updated_at=str(updated_segment.updated_at)
    )

@app.delete("/segments/{segment_id}")
async def delete_user_segment(segment_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a user segment"""
    deleted_segment = await crud.delete_user_segment(db, segment_id)
    if not deleted_segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return {"message": "Segment deleted successfully"}

# ✅ Flag-Segment Association Endpoints

class FlagSegmentIn(BaseModel):
    segment_id: int
    enabled: bool = True
    rollout_percentage: float = 100.0
    priority: int = 0

@app.post("/flags/{flag_id}/segments")
async def add_segment_to_flag(flag_id: int, association: FlagSegmentIn, db: AsyncSession = Depends(get_db)):
    """Associate a segment with a feature flag"""
    # Check if segment exists
    segment = await crud.get_user_segment_by_id(db, association.segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    try:
        from backend.schemas import FlagSegmentIn as FlagSegmentInSchema
    except ImportError:
        from schemas import FlagSegmentIn as FlagSegmentInSchema
    association_schema = FlagSegmentInSchema(
        segment_id=association.segment_id,
        enabled=association.enabled,
        rollout_percentage=association.rollout_percentage,
        priority=association.priority
    )
    
    flag_segment = await crud.add_segment_to_flag(db, flag_id, association_schema)
    return {"message": "Segment associated with flag successfully", "id": flag_segment.id}

@app.delete("/flags/{flag_id}/segments/{segment_id}")
async def remove_segment_from_flag(flag_id: int, segment_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a segment association from a feature flag"""
    removed = await crud.remove_segment_from_flag(db, flag_id, segment_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Segment association not found")
    
    return {"message": "Segment removed from flag successfully"}

@app.get("/flags/{flag_id}/segments")
async def get_flag_segments(flag_id: int, db: AsyncSession = Depends(get_db)):
    """Get all segments associated with a feature flag"""
    flag_segments = await crud.get_flag_segments(db, flag_id)
    
    return [
        {
            "id": fs.id,
            "flag_id": fs.flag_id,
            "segment_id": fs.segment_id,
            "enabled": fs.enabled,
            "rollout_percentage": fs.rollout_percentage,
            "priority": fs.priority,
            "segment": {
                "id": fs.segment.id,
                "name": fs.segment.name,
                "description": fs.segment.description,
                "conditions": fs.segment.conditions
            }
        } for fs in flag_segments
    ]

# ✅ Remote Configuration Management Endpoints

class RemoteConfigIn(BaseModel):
    key: str
    description: Optional[str] = None
    value_type: str  # "string", "number", "boolean", "json"
    default_value: str

class RemoteConfigOut(BaseModel):
    id: int
    key: str
    description: Optional[str]
    value_type: str
    default_value: str
    created_at: str
    updated_at: str

class ConfigSegmentIn(BaseModel):
    segment_id: int
    value: str
    enabled: bool = True
    priority: int = 0

@app.post("/configs", response_model=RemoteConfigOut)
async def create_remote_config(config: RemoteConfigIn, db: AsyncSession = Depends(get_db)):
    """Create a new remote configuration"""
    try:
        from backend.schemas import RemoteConfigIn as RemoteConfigInSchema
    except ImportError:
        from schemas import RemoteConfigIn as RemoteConfigInSchema
    
    # Validate value_type
    valid_types = ["string", "number", "boolean", "json"]
    if config.value_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"value_type must be one of: {valid_types}")
    
    # Check if key already exists
    existing = await crud.get_remote_config_by_key(db, config.key)
    if existing:
        raise HTTPException(status_code=400, detail="Config with this key already exists")
    
    # Validate default value based on type
    try:
        crud.parse_config_value(config.default_value, config.value_type)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid default value for type '{config.value_type}'")
    
    config_schema = RemoteConfigInSchema(
        key=config.key,
        description=config.description,
        value_type=config.value_type,
        default_value=config.default_value
    )
    
    new_config = await crud.create_remote_config(db, config_schema)
    return RemoteConfigOut(
        id=new_config.id,
        key=new_config.key,
        description=new_config.description,
        value_type=new_config.value_type,
        default_value=new_config.default_value,
        created_at=str(new_config.created_at),
        updated_at=str(new_config.updated_at)
    )

@app.get("/configs", response_model=List[RemoteConfigOut])
async def list_remote_configs(db: AsyncSession = Depends(get_db)):
    """List all remote configurations"""
    configs = await crud.get_all_remote_configs(db)
    return [
        RemoteConfigOut(
            id=config.id,
            key=config.key,
            description=config.description,
            value_type=config.value_type,
            default_value=config.default_value,
            created_at=str(config.created_at),
            updated_at=str(config.updated_at)
        ) for config in configs
    ]

@app.get("/configs/{config_id}", response_model=RemoteConfigOut)
async def get_remote_config(config_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific remote configuration"""
    config = await crud.get_remote_config_by_id(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return RemoteConfigOut(
        id=config.id,
        key=config.key,
        description=config.description,
        value_type=config.value_type,
        default_value=config.default_value,
        created_at=str(config.created_at),
        updated_at=str(config.updated_at)
    )

@app.put("/configs/{config_id}", response_model=RemoteConfigOut)
async def update_remote_config(config_id: int, config: RemoteConfigIn, db: AsyncSession = Depends(get_db)):
    """Update an existing remote configuration"""
    try:
        from backend.schemas import RemoteConfigIn as RemoteConfigInSchema
    except ImportError:
        from schemas import RemoteConfigIn as RemoteConfigInSchema
    
    # Validate value_type
    valid_types = ["string", "number", "boolean", "json"]
    if config.value_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"value_type must be one of: {valid_types}")
    
    # Validate default value based on type
    try:
        crud.parse_config_value(config.default_value, config.value_type)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid default value for type '{config.value_type}'")
    
    config_schema = RemoteConfigInSchema(
        key=config.key,
        description=config.description,
        value_type=config.value_type,
        default_value=config.default_value
    )
    
    updated_config = await crud.update_remote_config(db, config_id, config_schema)
    if not updated_config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return RemoteConfigOut(
        id=updated_config.id,
        key=updated_config.key,
        description=updated_config.description,
        value_type=updated_config.value_type,
        default_value=updated_config.default_value,
        created_at=str(updated_config.created_at),
        updated_at=str(updated_config.updated_at)
    )

@app.delete("/configs/{config_id}")
async def delete_remote_config(config_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a remote configuration"""
    deleted_config = await crud.delete_remote_config(db, config_id)
    if not deleted_config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return {"message": "Config deleted successfully"}

# ✅ Config-Segment Association Endpoints

@app.post("/configs/{config_id}/segments")
async def add_segment_to_config(config_id: int, association: ConfigSegmentIn, db: AsyncSession = Depends(get_db)):
    """Associate a segment with a remote config"""
    # Check if config exists
    config = await crud.get_remote_config_by_id(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Check if segment exists
    segment = await crud.get_user_segment_by_id(db, association.segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    # Validate segment value based on config type
    try:
        crud.parse_config_value(association.value, config.value_type)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid value for type '{config.value_type}'")
    
    try:
        from backend.schemas import ConfigSegmentIn as ConfigSegmentInSchema
    except ImportError:
        from schemas import ConfigSegmentIn as ConfigSegmentInSchema
    
    association_schema = ConfigSegmentInSchema(
        segment_id=association.segment_id,
        value=association.value,
        enabled=association.enabled,
        priority=association.priority
    )
    
    config_segment = await crud.add_segment_to_config(db, config_id, association_schema)
    return {"message": "Segment associated with config successfully", "id": config_segment.id}

@app.delete("/configs/{config_id}/segments/{segment_id}")
async def remove_segment_from_config(config_id: int, segment_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a segment association from a remote config"""
    removed = await crud.remove_segment_from_config(db, config_id, segment_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Segment association not found")
    
    return {"message": "Segment removed from config successfully"}

@app.get("/configs/{config_id}/segments")
async def get_config_segments(config_id: int, db: AsyncSession = Depends(get_db)):
    """Get all segments associated with a remote config"""
    config_segments = await crud.get_config_segments(db, config_id)
    
    return [
        {
            "id": cs.id,
            "config_id": cs.config_id,
            "segment_id": cs.segment_id,
            "value": cs.value,
            "enabled": cs.enabled,
            "priority": cs.priority,
            "segment": {
                "id": cs.segment.id,
                "name": cs.segment.name,
                "description": cs.segment.description,
                "conditions": cs.segment.conditions
            }
        } for cs in config_segments
    ]

# ✅ Config Evaluation Endpoints

class ConfigEvaluationResponse(BaseModel):
    key: str
    value: Any
    value_type: str
    segment_id: Optional[int] = None
    segment_name: Optional[str] = None

@app.get("/configs/evaluate/{config_key}", response_model=ConfigEvaluationResponse)
async def evaluate_config(config_key: str, user_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Evaluate a remote config for a specific user"""
    user_attrs = dict(request.query_params)
    user_attrs["user_id"] = user_id
    
    # Create user context for evaluation
    user_context = UserContext(user_id=user_id, traits=user_attrs)
    
    result = await crud.evaluate_remote_config(db, config_key, user_context)
    if not result:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return ConfigEvaluationResponse(
        key=result["key"],
        value=result["value"],
        value_type=result["value_type"],
        segment_id=result["segment_id"],
        segment_name=result["segment_name"]
    )

@app.post("/configs/evaluate/batch")
async def evaluate_multiple_configs(
    config_keys: List[str], 
    user_id: str, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    """Evaluate multiple remote configs for a specific user"""
    user_attrs = dict(request.query_params)
    user_attrs["user_id"] = user_id
    
    # Create user context for evaluation
    user_context = UserContext(user_id=user_id, traits=user_attrs)
    
    results = await crud.evaluate_multiple_configs(db, config_keys, user_context)
    
    return {
        "user_id": user_id,
        "configs": results
    }

# ✅ Config Exposures Endpoint

@app.get("/configs/exposures")
async def get_config_exposures(config_key: str = None, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Get config exposure logs"""
    exposures = await crud.get_config_exposures(db, config_key, limit)
    
    return [
        {
            "id": exposure.id,
            "config_key": exposure.config_key,
            "user_id": exposure.user_id,
            "value": exposure.value,
            "segment_id": exposure.segment_id,
            "timestamp": str(exposure.timestamp)
        } for exposure in exposures
    ]
