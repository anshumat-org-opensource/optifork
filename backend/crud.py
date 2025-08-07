from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.models import FeatureFlag, Rule
from backend.schemas import FeatureFlagIn


async def get_flag_by_name(db: AsyncSession, name: str):
    result = await db.execute(
        select(FeatureFlag)
        .options(selectinload(FeatureFlag.rules))
        .where(FeatureFlag.name == name)
    )
    return result.scalar_one_or_none()

async def get_all_flags(db: AsyncSession):
    result = await db.execute(
        select(FeatureFlag)
        .options(selectinload(FeatureFlag.rules))
    )
    return result.scalars().all()

async def create_flag(db: AsyncSession, flag_in: FeatureFlagIn):
    flag = FeatureFlag(
        name=flag_in.name,
        description=flag_in.description,
        rollout=flag_in.rollout
    )
    db.add(flag)
    await db.flush()  # To get flag.id before adding rules

    for rule in flag_in.rules:
        db.add(Rule(
            flag_id=flag.id,
            field=rule.field,
            op=rule.op,
            value=rule.value
        ))

    await db.commit()
    await db.refresh(flag)
    return flag
