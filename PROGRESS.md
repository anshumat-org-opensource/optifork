# OptiFork Hardening — Progress Tracker

Tracks execution of `goal.md`. Updated as each step completes.

## Current phase

**Phase 0 — Inventory (no code changes)** → awaiting human review of `FEATURES.md`.

## Phase status

| Phase | State | Notes |
|---|---|---|
| 0 — Inventory | ✅ Done, **paused for review** | `FEATURES.md` + `ARCHITECTURE.md` written and committed. |
| 1 — Scale harness | ⏳ Not started | Blocked by Phase 0 review (hard gate). |
| 2 — Backend scale targets & fixes | ⏳ Not started | Blocked by Phase 1. |
| 3 — UI redesign | ⏳ Not started | Blocked by Phase 2. |

## Done

- **Phase 0**
  - Read backend (`main.py`, `models.py`, `crud.py`, `db.py`, `schemas.py`, all routers, experiments + ai_experiments + integrations modules), frontend (`App.tsx`, `Header.tsx`, components), DB schema (SQLAlchemy models), and deploy setup (Dockerfiles, docker-compose, prod compose).
  - Wrote `FEATURES.md` — every feature with API endpoints, UI screens, DB tables, derived from code (not the README).
  - Extended `ARCHITECTURE.md` with the Phase 0 runtime analysis (flag decision path, config propagation, exposure recording, caching/pooling/workers/indexes).

## Next (after review approval)

- **Phase 1** — build the scale harness *before* touching any feature:
  - Seed script → fresh DB at production scale (10K flags, 5K experiments/rollouts, 1K segments, 100K audit records*, 1M+ distinct user IDs of exposure data).
  - Load tests (k6 or Locust) against the Docker **prod** build.
  - Frontend benchmark harness (Playwright + Lighthouse/web-vitals, 4× CPU throttle).
  - `make scale-test` → seed + run all benchmarks + write baseline `SCALE_REPORT.md`.

## Open questions / flags raised in Phase 0

- `*` **Audit/change-history — RESOLVED (Phase 0 review, 2026-11-21): approved as in-scope.** OptiFork had no audit feature; a minimal change-history table + write-path is an approved scope exception so the Phase 1 seed target is real. See `FEATURES.md` → "Approved scope exceptions". This is the one sanctioned deviation from frozen scope.
- Several production subsystems exist in the repo but are **commented out** in `main.py` (rate limiting, monitoring/metrics, Redis cache, backup/restore, background scheduler). They are not active features today. See `FEATURES.md` → "Present in repo but disabled".

## Ground rules being followed

- Frozen scope — no new features; ideas parked under "Gaps — not built" / "UI ideas — not built".
- Never loosen a target to make it pass.
- Stop and ask before any architectural change (record trade-offs in `SCALE_REPORT.md`, wait for approval).
- Phase gates are hard; commit after each completed step with tests passing.
