"""Phase 2: optimistic concurrency on flag updates (no lost updates).

Deterministic check of the version guard in crud.update_flag using a temp SQLite DB.
The "exactly one of N concurrent writers wins" behaviour is additionally validated
against the live Postgres stack during scale testing.
"""
import asyncio
import os
import tempfile

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import crud
from db import Base
import models  # noqa: F401  (registers tables)
from schemas import FeatureFlagIn


async def _scenario():
    path = tempfile.mktemp(suffix=".db")
    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with Session() as db:
            await crud.create_flag(db, FeatureFlagIn(name="f", description="d", rollout=0.5, rules=[]))
            flag = await crud.get_flag_by_name(db, "f")
            v = flag.version
        assert v == 1

        # Correct version -> succeeds, version bumps to 2.
        async with Session() as db:
            res = await crud.update_flag(db, "f", FeatureFlagIn(name="f", description="d", rollout=0.7, rules=[]), expected_version=v)
            assert res is not crud.FLAG_UPDATE_CONFLICT
            assert res.version == v + 1

        # Stale version (still v, but it's now v+1) -> CONFLICT, nothing written.
        async with Session() as db:
            res = await crud.update_flag(db, "f", FeatureFlagIn(name="f", description="d", rollout=0.9, rules=[]), expected_version=v)
            assert res is crud.FLAG_UPDATE_CONFLICT

        # The conflicting write must NOT have overwritten the winning edit.
        async with Session() as db:
            flag = await crud.get_flag_by_name(db, "f")
            assert flag.rollout == 0.7 and flag.version == v + 1

        # No expected_version -> last-writer-wins (backward compatible), still bumps.
        async with Session() as db:
            res = await crud.update_flag(db, "f", FeatureFlagIn(name="f", description="d", rollout=0.3, rules=[]))
            assert res is not crud.FLAG_UPDATE_CONFLICT
            assert res.version == v + 2 and res.rollout == 0.3
    finally:
        await engine.dispose()
        if os.path.exists(path):
            os.remove(path)


def test_optimistic_concurrency_guard():
    asyncio.run(_scenario())
