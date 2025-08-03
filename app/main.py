from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import hashlib

app = FastAPI()

# In-memory feature flag store for now (replace with DB later)
feature_flags: Dict[str, Dict[str, Any]] = {}

class Rule(BaseModel):
    field: str
    op: str  # 'eq', 'ne', 'gt', 'lt', etc.
    value: Any

class FeatureFlag(BaseModel):
    name: str
    description: Optional[str] = None
    rollout: float  # Value between 0.0 and 1.0
    rules: Optional[List[Rule]] = []

class FlagResponse(BaseModel):
    flag: str
    user_id: str
    enabled: bool

@app.post("/flags")
def create_flag(flag: FeatureFlag):
    if flag.name in feature_flags:
        raise HTTPException(status_code=400, detail="Flag already exists")
    if not 0.0 <= flag.rollout <= 1.0:
        raise HTTPException(status_code=400, detail="Rollout must be between 0 and 1")
    feature_flags[flag.name] = flag.dict()
    return {"message": f"Flag '{flag.name}' created with rollout {flag.rollout}"}

def evaluate_rules(rules: List[Rule], user_attrs: Dict[str, Any]) -> bool:
    for rule in rules:
        field_val = user_attrs.get(rule.field)
        if field_val is None:
            continue
        if rule.op == "eq" and field_val == rule.value:
            return True
        elif rule.op == "ne" and field_val != rule.value:
            return True
        elif rule.op == "gt" and field_val > rule.value:
            return True
        elif rule.op == "lt" and field_val < rule.value:
            return True
    return False

@app.get("/flags/{flag_name}", response_model=FlagResponse)
def evaluate_flag(flag_name: str, user_id: str, request: Request):
    if flag_name not in feature_flags:
        raise HTTPException(status_code=404, detail="Flag not found")
    flag_data = feature_flags[flag_name]
    rules = [Rule(**r) for r in flag_data.get("rules", [])]

    user_attrs = dict(request.query_params)
    user_attrs["user_id"] = user_id

    if evaluate_rules(rules, user_attrs):
        return FlagResponse(flag=flag_name, user_id=user_id, enabled=True)

    # fallback to rollout logic
    rollout = flag_data["rollout"]
    hash_val = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
    normalized = (hash_val % 10000) / 10000.0
    enabled = normalized < rollout
    return FlagResponse(flag=flag_name, user_id=user_id, enabled=enabled)
