from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.experiments.models import Experiment, Variant, UserAssignment, ExposureLog
from backend.experiments.schemas import ExperimentCreate
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from backend.models import FeatureFlag as Flag
from backend.models import FeatureFlag 
import random
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
    return experiment


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
    

    # Check if user is eligible based on targeting flag
    if experiment.flag_id:
        flag_result = await db.execute(
            select(FeatureFlag)
            .options(selectinload(FeatureFlag.rules))  # ✅ eager load to avoid greenlet error
            .where(FeatureFlag.id == experiment.flag_id)
        )
        print('flag_result')
        flag = flag_result.scalars().first()
        print(flag)
        if flag and not evaluate_flag_rules(flag.rules, user_attributes):
            return None  # ❌ Not eligible


    # Already assigned?
        result = await db.execute(
            select(UserAssignment)
            .options(selectinload(UserAssignment.variant))  # <- eager load the variant
            .where(
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

    # Assign using traffic split
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

        print(f"Evaluating Rule → field: {attr}, op: {op}, value: {val}")
        user_val = user_attributes.get(attr)

        if op == "equals" and user_val != val:
            return False
        elif op == "not_equals" and user_val == val:
            return False
        # Add more ops as needed...

    return True