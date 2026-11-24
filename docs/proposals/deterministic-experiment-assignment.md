# Proposal: deterministic experiment assignment

- **Status:** Proposed — awaiting approval. Not implemented.
- **Date:** 2026-11-24
- **Area:** `backend/experiments/crud.py` (`assign_user_to_variant`)
- **Type:** Behavior change to an existing feature (needs sign-off — this is *not* inside the
  "don't change what a feature does" scope we've been holding).

## Summary

Change experiment variant assignment from a **random draw + stored row** to a **deterministic
hash of the user id** (the same technique flag rollout already uses). This makes assignment
reproducible, removes a per-assignment database write from the hot path, and fixes two existing
bugs — without changing the variant anyone is *already* on.

## Problem — how assignment works today

`assign_user_to_variant` picks a variant with `random.random()` and then persists the choice:

```python
rnd = random.random()                 # fresh coin flip — NOT a function of user_id
acc = 0.0
for variant in variants:
    acc += variant.traffic_split
    if rnd <= acc:
        assigned_variant = variant
        break
...
db.add(UserAssignment(experiment_id, variant_id, user_id))  # write the result
```

Consequences:

1. **Not deterministic.** A user's variant is a coin flip at assignment time, recoverable only
   from the stored row. It can't be recomputed by another service, can't be reproduced in tests,
   and depends on process RNG state.
2. **Inconsistent with flags.** Flag rollout is a deterministic hash
   (`sha256(user_id) % 10000 / 10000 < rollout`, `backend/bucketing.py`); experiments are not.
   The two targeting systems behave differently for no good reason.
3. **Stickiness bug.** The "already assigned?" lookup is indented *inside* the
   `if experiment.flag_id:` block. So experiments **without** a targeting flag skip it entirely —
   every call re-rolls `random.random()` **and inserts another `user_assignments` row**. These
   experiments are not sticky and accumulate duplicate assignments (which also inflate the
   "assignments" count on the Results screen).
4. **A write on every new assignment**, purely to remember a coin flip.

## Goals / non-goals

**Goals**
- Deterministic, reproducible assignment: `(experiment, user_id)` → always the same variant.
- Respect each variant's `traffic_split` (unchanged semantics).
- Fix the non-stickiness + duplicate-row bug for flag-less experiments.
- Reuse the existing, tested bucketing helper for consistency with flags.

**Non-goals**
- No change to eligibility gating (a linked flag still gates who's eligible).
- No change to exposures (still logged separately; assignment ≠ exposure).
- No new statistics / significance on the Results screen (that would be a separate new feature).

## Proposed design

### 1. Deterministic variant selection

Reuse the sha256 bucketing we already extracted, salted per experiment so a user isn't
correlated across experiments:

```python
# backend/experiments/assignment.py  (new, tiny, pure — unit-testable without a DB)
import hashlib

def bucket(salt: str, user_id: str) -> float:
    h = int(hashlib.sha256(f"{salt}:{user_id}".encode()).hexdigest(), 16)
    return (h % 10_000) / 10_000.0          # deterministic value in [0, 1)

def variant_for(salt: str, user_id: str, variants):
    """Pick a variant by cumulative traffic_split using a deterministic bucket."""
    b = bucket(salt, user_id)
    acc = 0.0
    for v in variants:
        acc += v.traffic_split
        if b < acc:
            return v
    return variants[-1]                       # rounding guard
```

- **Salt = `str(experiment.id)`** — stable (ids never change), so no schema change. (A future
  option: add a dedicated random `salt` column if we ever want to re-randomize an experiment
  without changing its id — Statsig does this. Out of scope here.)
- Assignment is now a pure function of `(experiment.id, user_id, variants)`. No RNG, no DB read
  needed to be sticky.

### 2. The new `assign_user_to_variant` flow

```python
experiment = ...            # load
if experiment.flag_id:      # eligibility gate — unchanged
    flag = ...
    if flag and not evaluate_flag_rules(flag.rules, user_attributes):
        return None

variants = ...              # load variants (ordered by id for stable cumulative split)
if not variants:
    return None

# Honor any pre-existing assignment (keeps users already assigned under the old random
# logic on their current variant — see Migration), otherwise compute deterministically.
existing = <select UserAssignment where experiment_id and user_id>     # moved OUT of the flag block
if existing:
    return existing.variant

variant = variant_for(str(experiment.id), user_id, variants)

# Record once for the Results counts. Idempotent: only insert if absent (a unique index on
# (experiment_id, user_id) makes this race-safe), so no duplicate rows.
db.add(UserAssignment(experiment_id, variant.id, user_id))
await db.commit()
return variant
```

Key differences from today:
- `random.random()` → `variant_for(...)` (deterministic).
- The already-assigned lookup is moved **out** of the `if experiment.flag_id:` block (fixes the
  bug for flag-less experiments).
- The insert is **idempotent** (guarded by the lookup + a unique index), so no duplicates.

### 3. Optional: add a unique index

`UniqueConstraint(experiment_id, user_id)` on `user_assignments` makes "assign once" enforced at
the DB level and dedupes concurrent calls. (Needs a migration or a fresh DB — see Risks.)

## Trade-offs

| | Today (random + store) | Proposed (hash) |
|---|---|---|
| Determinism | no — coin flip | **yes** — reproducible |
| Sticky without DB | no (needs the row) | **yes** (recomputable) |
| DB write per new user | yes | yes, but **idempotent** (no dupes); could even be dropped |
| Consistent with flags | no | **yes** (same bucketing) |
| Testable distribution | hard | **easy** (chi-square, like the flag bucketing test) |
| Re-randomize an experiment | n/a | needs a salt column (future) |

## Migration & backward compatibility

- **Existing assignments are honored.** Because we return a pre-existing `user_assignments` row
  before computing, anyone already assigned under the old random logic **keeps their variant** —
  no one silently flips. New/unassigned users get deterministic assignment. Over time the
  population converges to deterministic.
- **No forced data migration.** Works on existing data as-is. The optional unique index does
  need a schema change (and OptiFork has no migrations today — see Risks).

## Testing plan

- **Unit (no DB):** `variant_for` is pure.
  - Determinism: same `(salt, user_id)` → same variant across many calls.
  - Distribution: simulate N users, assert each variant's share ≈ its `traffic_split` within a
    chi-square tolerance (mirrors `backend/test_bucketing.py`).
  - Edge: splits that don't sum to exactly 1.0 still land on a variant (rounding guard).
- **Integration:** a flag-less experiment returns the **same** variant on repeated `/assign`
  calls (the bug fix), and no duplicate rows are created.

## Risks

- **It changes behavior.** This is deliberately outside the frozen-scope rule — hence this
  proposal. Assignment *method* changes for new users; existing users are preserved.
- **The unique index needs a migration.** OptiFork has no migration tooling (`create_all` only),
  so adding the constraint cleanly requires either a fresh DB or introducing Alembic / a one-off
  `ALTER`. The core hashing change does **not** require the index — it's an optional hardening.
- **Salt = id** means re-randomizing an experiment later isn't possible without a salt column.
  Acceptable now; notable if re-randomization becomes a requirement.

## Rollout

1. Land `variant_for` + unit tests (pure, no risk).
2. Switch `assign_user_to_variant` to use it; move the already-assigned lookup out of the flag
   block; make the insert idempotent.
3. (Optional, later) add the unique index once a migration path exists.

## Decision needed

- Approve the **core change** (deterministic hashing + bug fixes, honoring existing assignments)?
- Include the **optional unique index** now (requires a migration/fresh DB) or defer?
- Salt by **experiment id** (no schema change) — ok, or add a dedicated salt column?
