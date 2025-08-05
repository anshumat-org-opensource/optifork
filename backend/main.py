from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from db import SessionLocal, engine
from models import Base
import crud
from routers import experiment_router

app = FastAPI()

# ✅ Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict this in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register experiment routes
app.include_router(experiment_router.router)

# ✅ Create DB tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ✅ Dependency to get DB session
async def get_db():
    async with SessionLocal() as session:
        yield session

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

    if evaluate_rules(rules, user_attrs):
        return FlagResponse(flag=flag_name, user_id=user_id, enabled=True)

    # Fallback: rollout-based assignment
    hash_val = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
    normalized = (hash_val % 10000) / 10000.0
    enabled = normalized < flag.rollout
    return FlagResponse(flag=flag_name, user_id=user_id, enabled=enabled)
