from pydantic import BaseModel
from typing import List, Optional


class VariantIn(BaseModel):
    name: str
    traffic_split: float  # should be between 0 and 1


class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    flag_id: Optional[int]  # ✅ Add this line
    variants: List[VariantIn]


class ExperimentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    flag_id: Optional[int]  # ✅ Add this line
    variants: List[VariantIn]

    class Config:
        orm_mode = True


class UserAssignmentOut(BaseModel):
    user_id: str
    variant_name: str


class ExposureLogIn(BaseModel):
    user_id: str
    experiment_id: int
    variant_id: int

class VariantOut(BaseModel):
    id: int
    name: str
    traffic_split: float

    class Config:
        from_attributes = True  # Update this for Pydantic v2


class AssignmentResponse(BaseModel):
    experiment: str
    user_id: str
    variant: str
