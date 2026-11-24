"""Integration test for the assignment bug fix (flag-less experiments must be sticky).

Before the change, the "already assigned?" lookup was nested inside the flag-eligibility
block, so an experiment with no linked flag re-rolled a random variant on every call and
inserted a duplicate row each time. This exercises crud.assign_user_to_variant against a
temp SQLite DB to prove: repeated calls return the SAME variant and create exactly ONE row.
"""
import asyncio
import os
import tempfile

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from db import Base
import models  # noqa: F401  (register core tables)
import experiments.models  # noqa: F401  (register experiment tables)
from experiments.models import Experiment, Variant, UserAssignment
from experiments import crud as exp_crud


async def _scenario():
    path = tempfile.mktemp(suffix=".db")
    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        # A flag-less experiment with two even variants.
        async with Session() as db:
            exp = Experiment(name="exp_x", description="", status="active", flag_id=None)
            db.add(exp)
            await db.flush()
            eid = exp.id
            db.add_all([
                Variant(experiment_id=eid, name="control", traffic_split=0.5),
                Variant(experiment_id=eid, name="treatment", traffic_split=0.5),
            ])
            await db.commit()

        # Assign the same user three times across fresh sessions.
        picks = []
        for _ in range(3):
            async with Session() as db:
                v = await exp_crud.assign_user_to_variant(db, eid, "user_42")
                picks.append(v.name)

        assert picks[0] == picks[1] == picks[2], f"not sticky: {picks}"

        # Exactly one assignment row — no duplicates.
        async with Session() as db:
            rows = (await db.execute(
                select(UserAssignment).where(
                    UserAssignment.experiment_id == eid,
                    UserAssignment.user_id == "user_42",
                )
            )).scalars().all()
        assert len(rows) == 1, f"expected 1 assignment row, got {len(rows)}"

        # A different user is assigned independently (and also deterministically).
        async with Session() as db:
            other = await exp_crud.assign_user_to_variant(db, eid, "user_99")
        assert other is not None
    finally:
        await engine.dispose()
        if os.path.exists(path):
            os.remove(path)


def test_flagless_experiment_is_sticky_and_deduped():
    asyncio.run(_scenario())
