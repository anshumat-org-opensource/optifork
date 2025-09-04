# routers/experiment_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from db import get_db
from experiments import crud
from experiments.models import Experiment
from experiments.schemas import (
    ExperimentCreate, ExperimentOut,
    VariantOut, AssignmentResponse
)
from typing import List

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.post("/", response_model=ExperimentOut)
async def create_experiment(payload: ExperimentCreate, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_experiment_by_name(db, payload.name)
    if existing:
        raise HTTPException(status_code=400, detail="Experiment with this name already exists.")
    return await crud.create_experiment(db, payload)


@router.get("/", response_model=List[ExperimentOut])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Experiment).options(selectinload(Experiment.variants))
    )
    experiments = result.scalars().all()
    return experiments


@router.get("/{experiment_name}/assign", response_model=AssignmentResponse)
async def assign_user(
    experiment_name: str,
    user_id: str,
    country: Optional[str] = None,  # 👈 Add more attributes as needed
    db: AsyncSession = Depends(get_db)
):
    experiment = await crud.get_experiment_by_name(db, experiment_name)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    # 👇 Construct user attributes dict
    user_attributes = {}
    if country:
        user_attributes["country"] = country

    # 👇 Pass user attributes to the assignment logic
    print('user_attributes')
    print(user_attributes)
    variant = await crud.assign_user_to_variant(
        db, experiment.id, user_id, user_attributes=user_attributes
    )
    print('variant')
    print(variant)
    if not variant:
        raise HTTPException(status_code=400, detail="User not eligible for any variant.")

    return AssignmentResponse(
        experiment=experiment.name,
        user_id=user_id,
        variant=variant.name
    )



@router.post("/{experiment_name}/exposure")
async def log_exposure(experiment_name: str, user_id: str, db: AsyncSession = Depends(get_db)):
    experiment = await crud.get_experiment_by_name(db, experiment_name)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    variant = await crud.assign_user_to_variant(db, experiment.id, user_id)
    await crud.log_exposure(db, experiment.id, variant.id, user_id)
    return {
        "message": f"Exposure logged for user '{user_id}' in experiment '{experiment_name}' with variant '{variant.name}'"
    }


@router.get("/results")
async def get_experiment_results(db: AsyncSession = Depends(get_db)):
    return await crud.get_experiment_results(db)
