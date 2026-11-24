from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from experiments.models import Experiment, Variant, UserAssignment, ExposureLog
from experiments.schemas import ExperimentCreate
from experiments.assignment import variant_for
from sqlalchemy.orm import selectinload
from sqlalchemy import func
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import FeatureFlag as Flag
from models import FeatureFlag
import json


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
    
    # Refresh and load variants
    await db.refresh(experiment)
    result = await db.execute(
        select(Experiment)
        .where(Experiment.id == experiment.id)
        .options(selectinload(Experiment.variants))
    )
    return result.scalars().first()


async def get_experiment_by_name(db: AsyncSession, name: str):
    result = await db.execute(
        select(Experiment).where(Experiment.name == name)
    )
    return result.scalars().first()


async def list_experiments(db: AsyncSession):
    result = await db.execute(select(Experiment))
    return result.scalars().all()


async def assign_user_to_variant(
    db: AsyncSession,
    experiment_id: int,
    user_id: str,
    user_attributes: dict = {}  # ✅ Accept user context
):
    # Get experiment (with flag_id)
    exp_result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    experiment = exp_result.scalars().first()
    if not experiment:
        return None

    # Eligibility: a linked flag gates who can enter the experiment (unchanged).
    if experiment.flag_id:
        flag_result = await db.execute(
            select(FeatureFlag)
            .options(selectinload(FeatureFlag.rules))  # eager load to avoid greenlet error
            .where(FeatureFlag.id == experiment.flag_id)
        )
        flag = flag_result.scalars().first()
        if flag and not evaluate_flag_rules(flag.rules, user_attributes):
            return None  # ❌ Not eligible

    # Honor an existing assignment, for ALL experiments (previously this was mistakenly
    # nested inside the flag check, so flag-less experiments re-rolled every call). This
    # also keeps users assigned under the old random logic on their current variant.
    result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.variant))
        .where(
            UserAssignment.experiment_id == experiment_id,
            UserAssignment.user_id == user_id,
        )
    )
    existing = result.scalars().first()
    if existing:
        return existing.variant

    # Fetch variants in a stable order so the cumulative split is deterministic.
    result = await db.execute(
        select(Variant).where(Variant.experiment_id == experiment_id).order_by(Variant.id)
    )
    variants = result.scalars().all()
    if not variants:
        return None

    # Deterministic assignment: hash(experiment_id : user_id) → bucket → cumulative split.
    # Same user + experiment always resolves to the same variant (no RNG, reproducible).
    assigned_variant = variant_for(str(experiment.id), user_id, variants)

    db.add(UserAssignment(
        experiment_id=experiment_id,
        variant_id=assigned_variant.id,
        user_id=user_id,
    ))
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


async def get_experiment_results(db: AsyncSession, limit: int = 100, offset: int = 0):
    # Bounded page — never load every experiment at once (Phase 2 target).
    limit = max(1, min(int(limit), 500))
    offset = max(0, int(offset or 0))
    experiments = await db.execute(
        select(Experiment)
        .options(selectinload(Experiment.variants))
        .order_by(Experiment.name)
        .limit(limit)
        .offset(offset)
    )
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


# def evaluate_flag_rules(rules_json: str, user_attributes: dict) -> bool:
#     try:
#         rules = json.loads(rules_json)
#     except Exception:
#         print('i am here in exception')
#         return False

#     for rule in rules:
#         attr = rule.get("attribute")
#         op = rule.get("operator")
#         val = rule.get("value")
#         print('i am here........')
#         print(attr)
#         print(op)
#         print(val)
#         user_val = user_attributes.get(attr)

#         if op == "equals" and user_val != val:
#             return False
#         elif op == "not_equals" and user_val == val:
#             return False
#         # Add more ops as needed...

#     return True


def evaluate_flag_rules(rules: list, user_attributes: dict) -> bool:
    for rule in rules:
        attr = getattr(rule, "field", None) or getattr(rule, "attribute", None)
        op = getattr(rule, "op", None) or getattr(rule, "operator", None)
        val = getattr(rule, "value", None)

        user_val = user_attributes.get(attr)

        if op == "equals" and user_val != val:
            return False
        elif op == "not_equals" and user_val == val:
            return False
        # Add more ops as needed...

    return True