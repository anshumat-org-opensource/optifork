# OptiFork Hardening — Progress Tracker

Tracks execution of `goal.md`. Updated as each step completes.

## Current phase

**Phase 1 — Scale harness: COMPLETE** (smoke baseline committed). `make scale-test` runs
end-to-end from a fresh clone and writes `SCALE_REPORT.md` with honest pass/fail. Ready for
Phase 2 pending go-ahead. The production-scale baseline (`make scale-test SCALE=full`) has
not been run yet (deferred by request); the committed report is the **smoke** run.

## Phase status

| Phase | State | Notes |
|---|---|---|
| 0 — Inventory | ✅ Done, reviewed & approved | `FEATURES.md` + `ARCHITECTURE.md` committed. Audit kept out of scope. |
| 1 — Scale harness | ✅ Done (smoke baseline) | Seed + Locust + FE bench + `make scale-test` + `SCALE_REPORT.md`. Full-scale run deferred. |
| 2 — Backend scale targets & fixes | 🔶 In progress | 2a: backend-crash root-caused + fixed (SIGSEGV from raw-ORM `/flags`). 2b: flag-eval p99 next. |
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
  - Wrote `docker-compose.scale.yml`, `Makefile`, `scripts/run_scale_test.sh`,
    `scripts/gen_scale_report.py`; ran smoke `make scale-test`; committed baseline `SCALE_REPORT.md`.

## Phase 2 — backend fixes (in progress; laptop = bug-fixing only, absolute targets deferred to 2-machine env)

- [x] **2a — backend unavailable under load: ROOT-CAUSED + FIXED.**
  - Profiled (not guessed): `docker inspect` showed `ExitCode=139` / `OOMKilled=false` → **SIGSEGV, not OOM** (memory flat ~111 MiB). `PYTHONFAULTHANDLER` confirmed a native segfault.
  - Ruled out by isolation: uvloop/httptools (`--loop asyncio --http h11` still crashed), asyncpg stmt-cache (`prepared_statement_cache_size=0` still crashed), asyncpg version (0.29→0.30 still crashed), OOM. Each eval endpoint alone (flag/config/experiment, u=120) survived; `/segments` and `/configs` survived; **`GET /flags` crashed**.
  - **Root cause:** `GET /flags` returned **raw SQLAlchemy ORM objects** to FastAPI's encoder (no `response_model`); under concurrency walking the session-linked C state segfaults the worker. `/configs`/`/segments` survive because they serialize via `response_model`.
  - **Fix:** `crud.serialize_flag()` → `/flags` returns plain dicts (same shape). Verified: the original crasher `MixedUser` now runs **0 failures**, backend stays up (was exit 139).
  - **Regression test:** `backend/test_flag_serialization.py` (3 tests, pass) — fails if `/flags` reverts to raw ORM. (The asyncpg 0.29→0.30 bump tried during isolation was reverted — it was not the cause; the diff is just the serialization helper.)
- [ ] **2b — flag-eval p99** (~160–270 ms vs < 20 ms target): profile the per-request exposure `INSERT`+`COMMIT` + segment N+1, then fix (indexes/async/batching/worker config).
- [ ] Remaining Phase 2 targets: pagination, search, concurrent-edit safety, config propagation, bucketing, resilience.

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
- [x] **`make scale-test`** → `docker-compose.scale.yml` (prod backend image + Postgres) +
  `scripts/run_scale_test.sh` (orchestrator) + `scripts/gen_scale_report.py` (report).
  Seeds, runs Locust + FE bench, writes `SCALE_REPORT.md` (target/measured/pass-fail/hardware).
  Smoke run executed end-to-end; baseline committed. `make scale-test SCALE=full` for the
  production-scale run.

### Phase 1 smoke-baseline headlines (honest failures)

- **Flag eval p99 = ~270 ms @ ~610 req/s, 0 errors** → ❌ FAIL vs p99 < 20 ms (write-amplified:
  INSERT+COMMIT per eval, single Uvicorn worker). Even at smoke scale.
- **Backend went DOWN under mixed load** (connection-refused; log ends with no traceback →
  SIGKILL/OOM-consistent). Caveat: no backend mem limit + co-tenant containers on the Docker
  host; FlagEval alone survived. Root-cause = Phase 2 (profile, don't guess).
- **No pagination / no search endpoint** → ❌ FAIL (static gaps).
- Frontend bundle 88.9 KB gz; LCP/CLS fine — but **smoke data (50 flags)**, not representative;
  real numbers need `SCALE=full`.
- Debug `print()`s on the experiment hot path spam stdout (Phase 2 cleanup).

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
