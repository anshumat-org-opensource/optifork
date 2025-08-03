from pydantic import BaseModel
from typing import Optional, List, Any

class RuleIn(BaseModel):
    field: str
    op: str
    value: Any

class FeatureFlagIn(BaseModel):
    name: str
    description: Optional[str] = None
    rollout: float
    rules: Optional[List[RuleIn]] = []

class RuleOut(RuleIn):
    id: int
    flag_id: int

class FeatureFlagOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    rollout: float
    rules: List[RuleOut]

    class Config:
        orm_mode = True
