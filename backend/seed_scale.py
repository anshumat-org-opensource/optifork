#!/usr/bin/env python3
"""Production-scale seed script (Phase 1 scale harness).

Loads production-scale data into a FRESH database so the backend and frontend
benchmarks run against a realistic dataset rather than a near-empty one.
See goal.md Phase 1.

Targets (``--scale full``, the default):
  * 10,000 feature flags (a subset carry up to 50 targeting rules)
  * 1,000 user segments (a subset carry up to 50 conditions)
  * 5,000 experiments, 500 of them active, each with 2-4 variants
  * 1,000 remote configs
  * 1,000,000+ distinct user IDs of exposure data (flag + config + experiment)
  * Realistic messiness: long names, unicode, near-duplicate names, deep tag lists

The "100,000 audit/change-history records" target from goal.md is intentionally
**N/A**: OptiFork has no audit/change-history feature and none is being built
(frozen scope — see FEATURES.md -> "Gaps - not built").

Usage:
  # against the Docker prod Postgres build
  DATABASE_URL=postgresql://optifork:optifork_secret@localhost:15432/optifork \
      python seed_scale.py --scale full --fresh

  # tiny dataset for a quick local sanity check
  python seed_scale.py --scale smoke --fresh

Run from the ``backend/`` directory (same import layout as main.py).
"""

import argparse
import asyncio
import os
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import create_async_engine

# Import the ORM metadata. Importing these registers every table on Base.metadata
# so --fresh can drop/create the whole schema. (AI-experiment tables live in
# models.py; experiment/variant/assignment/exposure tables in experiments.models.)
from db import Base, get_database_url
import models  # noqa: F401  (registers feature_flags, rules, segments, configs, exposures, ...)
from models import (
    FeatureFlag, Rule, UserSegment, FlagSegment,
    RemoteConfig, ConfigSegment, FlagExposure, ConfigExposure,
)
from experiments import models as exp_models  # noqa: F401
from experiments.models import Experiment, Variant, UserAssignment, ExposureLog


# --------------------------------------------------------------------------- #
# Scale presets
# --------------------------------------------------------------------------- #

@dataclass
class ScaleConfig:
    flags: int
    segments: int
    experiments: int
    active_experiments: int
    configs: int
    exposure_users: int          # distinct user IDs in flag_exposures
    config_exposures: int        # extra config exposure rows (reuse users)
    experiment_rows: int         # user_assignments + exposures for active experiments
    max_conditions: int = 50     # ceiling for flag rules / segment conditions


PRESETS = {
    "full": ScaleConfig(
        flags=10_000,
        segments=1_000,
        experiments=5_000,
        active_experiments=500,
        configs=1_000,
        exposure_users=1_000_000,
        config_exposures=100_000,
        experiment_rows=200_000,
    ),
    # ~1/500th of full — runs in seconds, for CI smoke / local sanity checks.
    "smoke": ScaleConfig(
        flags=50,
        segments=20,
        experiments=40,
        active_experiments=10,
        configs=20,
        exposure_users=2_000,
        config_exposures=500,
        experiment_rows=800,
    ),
}


# --------------------------------------------------------------------------- #
# Messiness helpers — long names, unicode, near-duplicates, deep tag lists
# --------------------------------------------------------------------------- #

UNICODE_BITS = [
    "日本語", "Ωmega", "café", "naïve", "emoji🚩", "Ωρα", "Δelta",
    "مرحبا", "Привет", "🌍🌎🌏", "ﬂag", "Ｆｕｌｌｗｉｄｔｈ", " zero​width",
]
TAG_VOCAB = [
    "growth", "checkout", "payments", "onboarding", "ios", "android", "web",
    "beta", "internal", "killswitch", "holdout", "legacy", "q1", "q2", "q3", "q4",
    "team-core", "team-growth", "team-payments", "pci", "gdpr", "experiment",
    "latency-sensitive", "high-traffic", "deprecated", "migration", "rollback",
]
WORDS = [
    "checkout", "dashboard", "search", "recommendation", "pricing", "signup",
    "feed", "notification", "profile", "cart", "banner", "paywall", "upsell",
    "nav", "footer", "theme", "video", "chat", "export", "import", "sync",
]


def deep_tag_list(rng: random.Random, max_tags: int = 25) -> str:
    """A realistically long, comma-separated tag list (stored inside description)."""
    n = rng.randint(3, max_tags)
    tags = [rng.choice(TAG_VOCAB) for _ in range(n)]
    # include a couple of free-form unicode tags sometimes
    if rng.random() < 0.3:
        tags.append(rng.choice(UNICODE_BITS))
    return ",".join(tags)


def messy_description(rng: random.Random, base: str) -> str:
    tags = deep_tag_list(rng)
    text = f"{base}. tags=[{tags}]"
    if rng.random() < 0.15:
        # occasional very long description
        text += " " + ("lorem ipsum dolor sit amet " * rng.randint(10, 60))
    if rng.random() < 0.2:
        text += " " + rng.choice(UNICODE_BITS)
    return text


def flag_name(rng: random.Random, i: int) -> str:
    """Unique flag name with occasional long / unicode / near-duplicate shapes."""
    base = f"{rng.choice(WORDS)}_{rng.choice(WORDS)}"
    r = rng.random()
    if r < 0.05:
        # very long name
        return f"{base}_" + "_".join(rng.choice(WORDS) for _ in range(rng.randint(8, 20))) + f"_{i}"
    if r < 0.10:
        # unicode
        return f"{base}_{rng.choice(UNICODE_BITS)}_{i}"
    if r < 0.25:
        # near-duplicate families: same base, tiny distinguishing suffix (still unique)
        variant = rng.choice([f"_v2", f"_V2", f"-v2", f"_v2_", f"__{i}", f"_{i:05d}"])
        return f"{base}{variant}_{i}"
    return f"{base}_{i}"


# --------------------------------------------------------------------------- #
# Bulk insert helper
# --------------------------------------------------------------------------- #

async def bulk_insert(engine, table, rows_iter, batch_size, label):
    """Insert rows from an iterator in batched transactions (bounded memory)."""
    batch = []
    total = 0
    t0 = time.time()
    for row in rows_iter:
        batch.append(row)
        if len(batch) >= batch_size:
            async with engine.begin() as conn:
                await conn.execute(insert(table), batch)
            total += len(batch)
            batch = []
            if total % (batch_size * 20) == 0:
                rate = total / max(time.time() - t0, 1e-6)
                print(f"    {label}: {total:,} rows ({rate:,.0f}/s)", flush=True)
    if batch:
        async with engine.begin() as conn:
            await conn.execute(insert(table), batch)
        total += len(batch)
    dt = time.time() - t0
    print(f"  ✓ {label}: {total:,} rows in {dt:,.1f}s", flush=True)
    return total


def user_id_for(i: int) -> str:
    """Deterministic distinct user id; a slice of the space is messy (unicode/long)."""
    if i % 997 == 0:
        return f"user🧑‍🚀_{i}_{'x' * (i % 40)}"      # long + unicode tail
    if i % 101 == 0:
        return f"ユーザー_{i}"                          # unicode
    return f"user_{i:08d}"


# --------------------------------------------------------------------------- #
# Seed routine
# --------------------------------------------------------------------------- #

async def seed(cfg: ScaleConfig, fresh: bool, batch_size: int, seed_val: int):
    rng = random.Random(seed_val)
    db_url = get_database_url()
    is_sqlite = "sqlite" in db_url
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine = create_async_engine(db_url, echo=False, connect_args=connect_args)

    print(f"Seeding database: {db_url.split('@')[-1]}")
    print(f"Scale: flags={cfg.flags:,} segments={cfg.segments:,} "
          f"experiments={cfg.experiments:,} (active {cfg.active_experiments:,}) "
          f"configs={cfg.configs:,} exposure_users={cfg.exposure_users:,}")

    if fresh:
        print("Dropping + recreating all tables (--fresh)...", flush=True)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    t_start = time.time()
    now = datetime.utcnow()

    def rand_ts():
        return now - timedelta(seconds=rng.randint(0, 90 * 86_400))

    # --- Feature flags -------------------------------------------------------
    def gen_flags():
        for i in range(cfg.flags):
            yield {
                "name": flag_name(rng, i),
                "description": messy_description(rng, "feature flag"),
                "rollout": round(rng.random(), 4),
            }
    await bulk_insert(engine, FeatureFlag.__table__, gen_flags(), batch_size, "feature_flags")

    async with engine.connect() as conn:
        flag_rows = (await conn.execute(select(FeatureFlag.id, FeatureFlag.name))).all()
    flag_ids = [r[0] for r in flag_rows]
    print(f"  (loaded {len(flag_ids):,} flag ids for FKs)", flush=True)

    # --- Targeting rules (subset of flags, up to max_conditions each) --------
    OPS = ["eq", "ne", "gt", "lt"]
    FIELDS = ["country", "plan", "age", "os", "app_version", "tenant", "beta", "region"]

    def gen_rules():
        for fid in flag_ids:
            if rng.random() < 0.12:                     # ~12% of flags carry rules
                n = rng.randint(1, cfg.max_conditions)  # up to 50 conditions
                for _ in range(n):
                    yield {
                        "flag_id": fid,
                        "field": rng.choice(FIELDS),
                        "op": rng.choice(OPS),
                        "value": str(rng.choice(["US", "premium", "42", "ios", "1.2.3", "eu"])),
                    }
    await bulk_insert(engine, Rule.__table__, gen_rules(), batch_size, "rules")

    # --- User segments (subset up to max_conditions JSON conditions) ---------
    SEG_OPS = ["equals", "not_equals", "in", "greater_than", "less_than", "contains"]

    def gen_segments():
        for i in range(cfg.segments):
            n = rng.randint(1, cfg.max_conditions) if rng.random() < 0.3 else rng.randint(1, 5)
            conditions = [
                {
                    "field": rng.choice(FIELDS),
                    "operator": rng.choice(SEG_OPS),
                    "value": rng.choice(["US", "premium", 42, ["a", "b"], "2024-01-01"]),
                }
                for _ in range(n)
            ]
            yield {
                "name": f"segment_{rng.choice(WORDS)}_{i}",
                "description": messy_description(rng, "user segment"),
                "conditions": conditions,
                "created_at": rand_ts(),
                "updated_at": now,
            }
    await bulk_insert(engine, UserSegment.__table__, gen_segments(), batch_size, "user_segments")

    async with engine.connect() as conn:
        segment_ids = [r[0] for r in (await conn.execute(select(UserSegment.id))).all()]

    # --- Flag <-> segment associations (subset of flags) ---------------------
    def gen_flag_segments():
        for fid in flag_ids:
            if segment_ids and rng.random() < 0.2:
                for sid in rng.sample(segment_ids, k=min(len(segment_ids), rng.randint(1, 3))):
                    yield {
                        "flag_id": fid,
                        "segment_id": sid,
                        "enabled": rng.random() < 0.9,
                        "rollout_percentage": round(rng.uniform(0, 100), 2),
                        "priority": rng.randint(0, 100),
                    }
    await bulk_insert(engine, FlagSegment.__table__, gen_flag_segments(), batch_size, "flag_segments")

    # --- Remote configs ------------------------------------------------------
    VALUE_TYPES = ["string", "number", "boolean", "json"]

    def gen_configs():
        for i in range(cfg.configs):
            vt = rng.choice(VALUE_TYPES)
            default = {
                "string": rng.choice(["blue", "green", "variant-a"]),
                "number": str(rng.randint(1, 1000)),
                "boolean": rng.choice(["true", "false"]),
                "json": '{"limit": %d, "mode": "%s"}' % (rng.randint(1, 100), rng.choice(WORDS)),
            }[vt]
            yield {
                "key": f"config.{rng.choice(WORDS)}.{i}",
                "description": messy_description(rng, "remote config"),
                "value_type": vt,
                "default_value": default,
                "created_at": rand_ts(),
                "updated_at": now,
            }
    await bulk_insert(engine, RemoteConfig.__table__, gen_configs(), batch_size, "remote_configs")

    async with engine.connect() as conn:
        config_rows = (await conn.execute(select(RemoteConfig.id, RemoteConfig.key))).all()
    config_ids = [r[0] for r in config_rows]

    # --- Config <-> segment overrides ---------------------------------------
    def gen_config_segments():
        for cid in config_ids:
            if segment_ids and rng.random() < 0.3:
                for sid in rng.sample(segment_ids, k=min(len(segment_ids), rng.randint(1, 2))):
                    yield {
                        "config_id": cid,
                        "segment_id": sid,
                        "value": rng.choice(["override-a", "override-b", "99"]),
                        "enabled": True,
                        "priority": rng.randint(0, 50),
                    }
    await bulk_insert(engine, ConfigSegment.__table__, gen_config_segments(), batch_size, "config_segments")

    # --- Experiments (500 active) + variants ---------------------------------
    active_cut = cfg.active_experiments

    def gen_experiments():
        for i in range(cfg.experiments):
            status = "active" if i < active_cut else rng.choice(["paused", "completed"])
            yield {
                "name": f"exp_{rng.choice(WORDS)}_{i}",
                "description": messy_description(rng, "experiment"),
                "status": status,
                "flag_id": rng.choice(flag_ids) if (flag_ids and rng.random() < 0.5) else None,
            }
    await bulk_insert(engine, Experiment.__table__, gen_experiments(), batch_size, "experiments")

    async with engine.connect() as conn:
        exp_rows = (await conn.execute(select(Experiment.id, Experiment.status))).all()
    active_exp_ids = [r[0] for r in exp_rows if r[1] == "active"]

    def gen_variants():
        for eid, _status in exp_rows:
            k = rng.randint(2, 4)
            splits = [round(1.0 / k, 4)] * k
            for v in range(k):
                yield {
                    "experiment_id": eid,
                    "name": rng.choice(["control", "treatment", "variant_a", "variant_b", "variant_c"]) + f"_{v}",
                    "traffic_split": splits[v],
                }
    await bulk_insert(engine, Variant.__table__, gen_variants(), batch_size, "variants")

    # variant ids grouped by (active) experiment, for assignment/exposure data
    async with engine.connect() as conn:
        variant_rows = (await conn.execute(select(Variant.id, Variant.experiment_id))).all()
    variants_by_exp = {}
    for vid, eid in variant_rows:
        variants_by_exp.setdefault(eid, []).append(vid)

    # --- 1M+ distinct-user flag exposures ------------------------------------
    flag_name_by_id = {r[0]: r[1] for r in flag_rows}

    def gen_flag_exposures():
        for i in range(cfg.exposure_users):
            fid = rng.choice(flag_ids)
            yield {
                "flag_id": fid,
                "flag_name": flag_name_by_id[fid],
                "user_id": user_id_for(i),
                "enabled": "true" if rng.random() < 0.5 else "false",
                "segment_id": None,
                "timestamp": rand_ts(),
            }
    await bulk_insert(engine, FlagExposure.__table__, gen_flag_exposures(), batch_size, "flag_exposures")

    # --- Config exposures (reuse user space) ---------------------------------
    config_key_by_id = {r[0]: r[1] for r in config_rows}

    def gen_config_exposures():
        for _ in range(cfg.config_exposures):
            cid = rng.choice(config_ids) if config_ids else None
            if cid is None:
                return
            yield {
                "config_id": cid,
                "config_key": config_key_by_id[cid],
                "user_id": user_id_for(rng.randrange(cfg.exposure_users)),
                "value": rng.choice(["blue", "99", "true", "variant-a"]),
                "segment_id": None,
                "timestamp": rand_ts(),
            }
    await bulk_insert(engine, ConfigExposure.__table__, gen_config_exposures(), batch_size, "config_exposures")

    # --- Experiment assignments + exposures (active experiments) -------------
    def gen_assignments():
        if not active_exp_ids:
            return
        for _ in range(cfg.experiment_rows):
            eid = rng.choice(active_exp_ids)
            vids = variants_by_exp.get(eid)
            if not vids:
                continue
            yield {
                "experiment_id": eid,
                "variant_id": rng.choice(vids),
                "user_id": user_id_for(rng.randrange(cfg.exposure_users)),
            }
    await bulk_insert(engine, UserAssignment.__table__, gen_assignments(), batch_size, "user_assignments")

    def gen_exp_exposures():
        if not active_exp_ids:
            return
        for _ in range(cfg.experiment_rows):
            eid = rng.choice(active_exp_ids)
            vids = variants_by_exp.get(eid)
            if not vids:
                continue
            yield {
                "experiment_id": eid,
                "variant_id": rng.choice(vids),
                "user_id": user_id_for(rng.randrange(cfg.exposure_users)),
                "timestamp": rand_ts(),
            }
    await bulk_insert(engine, ExposureLog.__table__, gen_exp_exposures(), batch_size, "exposures")

    await engine.dispose()
    dt = time.time() - t_start
    print(f"\n✅ Seed complete in {dt/60:.1f} min "
          f"({dt:.0f}s). Distinct exposure users ≈ {cfg.exposure_users:,}.")
    print("   Audit/change-history records: N/A (no audit feature — frozen scope).")


def parse_args(argv):
    p = argparse.ArgumentParser(description="OptiFork production-scale seed script")
    p.add_argument("--scale", choices=list(PRESETS), default="full",
                   help="dataset size preset (default: full)")
    p.add_argument("--fresh", action="store_true",
                   help="drop and recreate all tables before seeding")
    p.add_argument("--batch-size", type=int, default=5_000,
                   help="rows per insert batch (default: 5000)")
    p.add_argument("--seed", type=int, default=42, help="PRNG seed for reproducibility")
    # per-target overrides (optional)
    for field in ("flags", "segments", "experiments", "configs", "exposure_users"):
        p.add_argument(f"--{field.replace('_', '-')}", type=int, default=None)
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])
    cfg = PRESETS[args.scale]
    # apply overrides
    for field in ("flags", "segments", "experiments", "configs", "exposure_users"):
        val = getattr(args, field)
        if val is not None:
            setattr(cfg, field, val)
    asyncio.run(seed(cfg, fresh=args.fresh, batch_size=args.batch_size, seed_val=args.seed))


if __name__ == "__main__":
    main()
