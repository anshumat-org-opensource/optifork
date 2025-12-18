from pydantic import BaseModel
from typing import Optional, List, Any, Dict

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

# User Segment Schemas
class SegmentCondition(BaseModel):
    field: str  # e.g., "country", "age", "plan_type"
    operator: str  # e.g., "equals", "contains", "greater_than", "in", "not_in"
    value: Any  # The value to compare against
    
class UserSegmentIn(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: List[SegmentCondition] = []
    
class UserSegmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    conditions: List[Dict[str, Any]]  # JSON representation
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True
        
class FlagSegmentIn(BaseModel):
    segment_id: int
    enabled: bool = True
    rollout_percentage: float = 100.0
    priority: int = 0
    
class FlagSegmentOut(BaseModel):
    id: int
    flag_id: int
    segment_id: int
    enabled: bool
    rollout_percentage: float
    priority: int
    segment: UserSegmentOut
    
    class Config:
        orm_mode = True
        
class FeatureFlagWithSegmentsIn(BaseModel):
    name: str
    description: Optional[str] = None
    rollout: float
    rules: Optional[List[RuleIn]] = []
    segments: Optional[List[FlagSegmentIn]] = []
    
class FeatureFlagWithSegmentsOut(FeatureFlagOut):
    segments: List[FlagSegmentOut] = []
    
class UserContext(BaseModel):
    """User context for segment evaluation"""
    user_id: str
    traits: Dict[str, Any] = {}  # User traits like country, age, plan_type, etc.

# Remote Configuration Schemas
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
    
    class Config:
        from_attributes = True

class ConfigSegmentIn(BaseModel):
    segment_id: int
    value: str
    enabled: bool = True
    priority: int = 0

class ConfigSegmentOut(BaseModel):
    id: int
    config_id: int
    segment_id: int
    value: str
    enabled: bool
    priority: int
    segment: UserSegmentOut
    
    class Config:
        from_attributes = True

class RemoteConfigWithSegmentsOut(RemoteConfigOut):
    segments: List[ConfigSegmentOut] = []

class ConfigEvaluationRequest(BaseModel):
    """Request format for config evaluation"""
    user_id: str
    user_traits: Dict[str, Any] = {}

class ConfigEvaluationResponse(BaseModel):
    """Response format for config evaluation"""
    key: str
    value: Any  # Parsed value based on value_type
    value_type: str
    segment_id: Optional[int] = None
    segment_name: Optional[str] = None
