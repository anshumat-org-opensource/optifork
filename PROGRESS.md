# OptiFork Hardening — Progress Tracker

Tracks execution of `goal.md`. Updated as each step completes.

## Current phase

**Phase 1 — Scale harness.** Phase 0 approved. Building the harness before touching any
feature. Seed script done; load tests / frontend benchmarks / `make scale-test` next.

## Phase status

| Phase | State | Notes |
|---|---|---|
| 0 — Inventory | ✅ Done, reviewed & approved | `FEATURES.md` + `ARCHITECTURE.md` committed. Audit kept out of scope. |
| 1 — Scale harness | 🔶 In progress | Seed script done. Load tests / FE benchmarks / `make scale-test` pending. |
| 2 — Backend scale targets & fixes | ⏳ Not started | Blocked by Phase 1. |
| 3 — UI redesign | ⏳ Not started | Blocked by Phase 2. |

## Done

- **Phase 0**
  - Read backend (`main.py`, `models.py`, `crud.py`, `db.py`, `schemas.py`, all routers, experiments + ai_experiments + integrations modules), frontend (`App.tsx`, `Header.tsx`, components), DB schema (SQLAlchemy models), and deploy setup (Dockerfiles, docker-compose, prod compose).
  - Wrote `FEATURES.md` — every feature with API endpoints, UI screens, DB tables, derived from code (not the README).
  - Extended `ARCHITECTURE.md` with the Phase 0 runtime analysis (flag decision path, config propagation, exposure recording, caching/pooling/workers/indexes).
- **Phase 1**
  - Wrote `backend/seed_scale.py` — production-scale seeder (see "Phase 1 — remaining work").
  - Wrote `load_tests/locustfile.py` + requirements + README — Locust load tests.
  - Wrote `frontend_bench/` (bench.mjs + package.json + README) — Playwright/web-vitals harness.

## Phase 1 — remaining work

- [x] **Seed script** (`backend/seed_scale.py`) → fresh DB at production scale: 10K flags
  (subset with up to 50 rules), 1K segments (subset with up to 50 conditions), 5K
  experiments (500 active) + variants, 1K configs, 1M+ distinct exposure users, realistic
  messiness (long/unicode/near-duplicate names, deep tag lists). Presets `full` (default)
  and `smoke`; `--fresh` drops+recreates. Batched bulk inserts (~130K rows/s on SQLite).
  Validated at smoke + multi-batch scale on SQLite. **Full 1M run happens against Postgres
  in `make scale-test`.** 100K audit-record target = **N/A** (no audit feature).
- [x] **Load tests (Locust)** — `load_tests/locustfile.py`: `FlagEvalUser` (p99/throughput
  hot path), `ConfigEvalUser`, `ConsoleUser` (list/search-proxy), `MixedUser`. Fetches real
  seeded entity names at startup; stable per-endpoint request grouping; headless CSV/HTML
  output. Validated end-to-end against a freshly-seeded backend (0% failures). Runs against
  the Postgres prod build in `make scale-test`.
- [x] **Frontend benchmark harness** (`frontend_bench/`) — Playwright + injected web-vitals
  (LCP/CLS/FCP/TTFB/INP) under 4× CPU throttle, scroll-jank estimate on the flag list
  (fps/jank-frames for the 60fps bar), and gzipped bundle size (< 250 KB bar). Navigates the
  tab-based SPA by seeding an admin into localStorage and clicking the sidebar. Validated
  end-to-end (bundle 83.8 KB gzip; all tabs measured). Representative run needs the seeded
  dataset + built frontend (done in `make scale-test`).
- [ ] **`make scale-test`** → seed + run all benchmarks + write baseline `SCALE_REPORT.md`
  (target, measured, pass/fail, hardware). Must run from a fresh clone.

## Open questions / flags raised in Phase 0

- `*` **Audit/change-history — RESOLVED (Phase 0 review, 2026-11-21): kept out of scope, NOT built.** OptiFork has no audit feature and none will be added. The Phase 1 "100,000 audit/change-history records" seed target has no feature to seed against → recorded **N/A** in `SCALE_REPORT.md`. Scope stays fully frozen (no exceptions). See `FEATURES.md` → "Gaps — not built".
- **Dev DB schema drift (finding, Phase 1c).** `backend/data/optifork.db` lags the models —
  `flag_exposures` lacks the `segment_id` column the model declares, so flag evaluation 500s
  against that file. Cause: `create_all` + no migrations (consistent with the ARCHITECTURE
  finding). Not a blocker for the harness (`make scale-test` seeds a **fresh** Postgres DB),
  but flagged for Phase 2 (no migration path) and so nobody mistakes it for a load-test bug.
- Several production subsystems exist in the repo but are **commented out** in `main.py` (rate limiting, monitoring/metrics, Redis cache, backup/restore, background scheduler). They are not active features today. See `FEATURES.md` → "Present in repo but disabled".

## Ground rules being followed

- Frozen scope — no new features; ideas parked under "Gaps — not built" / "UI ideas — not built".
- Never loosen a target to make it pass.
- Stop and ask before any architectural change (record trade-offs in `SCALE_REPORT.md`, wait for approval).
- Phase gates are hard; commit after each completed step with tests passing.
