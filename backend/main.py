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
