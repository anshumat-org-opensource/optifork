from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from experiments.models import Experiment, Variant, UserAssignment, ExposureLog
from experiments.schemas import ExperimentCreate
from sqlalchemy.orm import selectinload
from sqlalchemy import func
import random


async def create_experiment(db: AsyncSession, experiment_data: ExperimentCreate):
    experiment = Experiment(
        name=experiment_data.name,
        description=experiment_data.description,
        flag_id=experiment_data.flag_id,  # ✅ link to targeting gate
        status="active"
    )
    db.add(experiment)
    await db.flush()  # to get experiment.id before committing

    variants = [
        Variant(
            name=v.name,
            traffic_split=v.traffic_split,
            experiment_id=experiment.id
        )
        for v in experiment_data.variants
    ]
    db.add_all(variants)
    await db.commit()
    return experiment


async def get_experiment_by_name(db: AsyncSession, name: str):
    result = await db.execute(
        select(Experiment).where(Experiment.name == name)
    )
    return result.scalars().first()


async def list_experiments(db: AsyncSession):
    result = await db.execute(select(Experiment))
    return result.scalars().all()


async def assign_user_to_variant(db: AsyncSession, experiment_id: int, user_id: str):
    # Check if already assigned
    result = await db.execute(
        select(UserAssignment).where(
            UserAssignment.experiment_id == experiment_id,
            UserAssignment.user_id == user_id
        )
    )
    assignment = result.scalars().first()
    if assignment:
        return assignment.variant

    # Fetch variants
    result = await db.execute(
        select(Variant).where(Variant.experiment_id == experiment_id)
    )
    variants = result.scalars().all()
    if not variants:
        return None

    # Assign using traffic split logic
    rnd = random.random()
    acc = 0.0
    for variant in variants:
        acc += variant.traffic_split
        if rnd <= acc:
            assigned_variant = variant
            break
    else:
        assigned_variant = variants[-1]

    new_assignment = UserAssignment(
        experiment_id=experiment_id,
        variant_id=assigned_variant.id,
        user_id=user_id
    )
    db.add(new_assignment)
    await db.commit()
    return assigned_variant


async def log_exposure(db: AsyncSession, experiment_id: int, variant_id: int, user_id: str):
    log = ExposureLog(
        experiment_id=experiment_id,
        variant_id=variant_id,
        user_id=user_id
    )
    db.add(log)
    await db.commit()
    return log



async def get_experiment_results(db: AsyncSession):
    experiments = await db.execute(select(Experiment).options(selectinload(Experiment.variants)))
    experiments = experiments.scalars().all()
    results = []

    for exp in experiments:
        exp_result = {
            "id": exp.id,
            "name": exp.name,
            "description": exp.description,
            "status": exp.status,
            "variants": [],
        }

        for v in exp.variants:
            # Count assignments
            assignment_count = await db.execute(
                select(func.count()).where(UserAssignment.variant_id == v.id)
            )
            exposure_count = await db.execute(
                select(func.count()).where(ExposureLog.variant_id == v.id)
            )
            exp_result["variants"].append({
                "id": v.id,
                "name": v.name,
                "traffic_split": v.traffic_split,
                "assignments": assignment_count.scalar(),
                "exposures": exposure_count.scalar(),
            })

        results.append(exp_result)

    return results