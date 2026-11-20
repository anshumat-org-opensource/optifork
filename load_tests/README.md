# OptiFork load tests (Locust)

Backend load tests for the Phase 1 scale harness. Run them against the **Docker prod
build** (Postgres-backed), on a database seeded by `backend/seed_scale.py` — not the dev
server, and not an empty database. `make scale-test` wires this up automatically; the
notes below are for running scenarios by hand.

## Scenarios (user classes)

| Class | What it drives | Maps to Phase 2 target |
|---|---|---|
| `FlagEvalUser` | `GET /flags/{name}` only (the per-decision hot path) | p99 < 20 ms @ 5,000 req/s, zero errors |
| `ConfigEvalUser` | `GET /configs/evaluate/{key}` only | config eval latency |
| `ConsoleUser` | `GET /flags`, `/segments`, `/configs`, `/experiments/results`, `/exposures` | list endpoints / search proxy |
| `MixedUser` | realistic blend (≈60% flag eval, configs, experiment assign, some console reads) | overall behaviour under mixed load |

Entity names (flags/configs/experiments) are fetched from the target **once at test
start**, so requests hit real seeded data. If the DB isn't seeded, evaluation tasks no-op
and you'll see a warning.

> **"Search/filter across 10K flags" has no endpoint today** (see `FEATURES.md` → "Gaps —
> not built"). `ConsoleUser` measures `GET /flags` (full-collection fetch) as the closest
> proxy; the report records real search as N/A / not-built.

## Setup

```bash
pip install -r load_tests/requirements.txt   # locust + requests
```

## Run (headless, CSV + HTML output)

```bash
cd load_tests
# pure flag-eval throughput/latency, 200 users, 60s
locust -f locustfile.py FlagEvalUser --headless \
  -u 200 -r 50 -t 60s \
  --host http://localhost:8000 \
  --csv results/flageval --html results/flageval.html

# realistic mix
locust -f locustfile.py MixedUser --headless \
  -u 200 -r 50 -t 60s --host http://localhost:8000 --csv results/mixed
```

Interactive web UI (pick the user class + rate in the browser):

```bash
locust -f locustfile.py --host http://localhost:8000
```

`results/` is git-ignored.

## Notes / findings

- **Run against Postgres, not SQLite.** Every evaluation writes an exposure row
  (`INSERT` + `COMMIT`) on the request path. SQLite serialises writers, so any real
  concurrency produces `database is locked` / connection-reset errors — an artifact of the
  store, not the app logic. This is exactly why the goal mandates the Postgres prod build.
- **Dev DB schema drift.** OptiFork creates tables with `create_all` and has no migrations,
  so a pre-existing `backend/data/optifork.db` can lag the models (observed: `flag_exposures`
  missing the `segment_id` column, causing 500s on flag evaluation). Seeding a **fresh** DB
  (`seed_scale.py --fresh`, as `make scale-test` does) avoids this.
