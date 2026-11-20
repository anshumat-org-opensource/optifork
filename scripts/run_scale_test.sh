#!/usr/bin/env bash
# Scale-harness orchestrator (Phase 1). Driven by `make scale-test`.
#
# End-to-end: bring up the prod backend image + Postgres (docker-compose.scale.yml),
# seed production-scale data, build + serve the frontend, run the Locust load tests and
# the frontend benchmark, then generate SCALE_REPORT.md. Designed to run from a fresh
# clone (installs Python/Node deps if missing).
#
# Usage:  scripts/run_scale_test.sh [SCALE]   (SCALE = smoke | full ; default smoke)
# Env:    KEEP_UP=1  leave containers + preview running after the run.
set -euo pipefail

SCALE="${1:-smoke}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RESULTS="$ROOT/scale_results"
COMPOSE="docker compose -f docker-compose.scale.yml"
VENV="$ROOT/venv"
FRONTEND_URL="http://localhost:4173"
BACKEND_URL="http://localhost:8000"

# Load profile per scale. The 5,000 req/s sustained-30-min target is a Phase 2 assertion,
# not this baseline — keep durations sane here.
if [ "$SCALE" = "full" ]; then
  USERS=400; SPAWN=40; DUR=120s
else
  USERS=60; SPAWN=30; DUR=30s
fi

PREVIEW_PID=""
cleanup() {
  [ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null || true
  if [ "${KEEP_UP:-0}" = "1" ]; then
    echo "KEEP_UP=1 → leaving containers up ($COMPOSE down to stop)."
  else
    echo "Tearing down containers..."
    $COMPOSE down -v >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "==> OptiFork scale-test (SCALE=$SCALE)"
mkdir -p "$RESULTS"

# ---- preflight ----
command -v docker >/dev/null || { echo "docker required"; exit 1; }
command -v node >/dev/null   || { echo "node required"; exit 1; }
if lsof -iTCP:8000 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  if ! docker ps --format '{{.Names}}' | grep -q optifork-backend-scale; then
    echo "ERROR: port 8000 is in use by a non-scale process. Free it (e.g. stop the dev backend) and retry."
    exit 1
  fi
fi

# ---- python deps (locust + report gen) ----
if [ ! -x "$VENV/bin/locust" ]; then
  echo "==> Setting up Python venv for load tests..."
  [ -d "$VENV" ] || python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r load_tests/requirements.txt
fi

# ---- frontend build ----
echo "==> Building frontend..."
[ -d frontend/node_modules ] || npm --prefix frontend ci
npm --prefix frontend run build

# ---- frontend bench deps ----
if [ ! -d frontend_bench/node_modules ]; then
  echo "==> Installing frontend_bench deps + chromium..."
  npm --prefix frontend_bench ci
  (cd frontend_bench && npx playwright install chromium)
fi

# ---- bring up backend (prod image) + postgres ----
echo "==> Starting Docker scale stack (building backend image if needed)..."
$COMPOSE up -d --build

echo "==> Waiting for backend health at $BACKEND_URL/health ..."
for i in $(seq 1 120); do
  if curl -sf "$BACKEND_URL/health" >/dev/null 2>&1; then echo "   backend healthy (${i}s)"; break; fi
  sleep 1
  [ "$i" = 120 ] && { echo "backend did not become healthy"; $COMPOSE logs backend | tail -40; exit 1; }
done

# ---- seed ----
echo "==> Seeding ($SCALE, fresh)..."
$COMPOSE exec -T backend python seed_scale.py --scale "$SCALE" --fresh

# ---- gather seeded counts ----
echo "==> Collecting seeded row counts..."
COUNTS_FILE="$RESULTS/_counts.txt"
$COMPOSE exec -T postgres psql -U optifork -d optifork -tAF'|' -c "
  SELECT 'feature_flags', count(*) FROM feature_flags
  UNION ALL SELECT 'rules', count(*) FROM rules
  UNION ALL SELECT 'user_segments', count(*) FROM user_segments
  UNION ALL SELECT 'remote_configs', count(*) FROM remote_configs
  UNION ALL SELECT 'experiments', count(*) FROM experiments
  UNION ALL SELECT 'experiments_active', count(*) FROM experiments WHERE status='active'
  UNION ALL SELECT 'variants', count(*) FROM variants
  UNION ALL SELECT 'flag_exposures', count(*) FROM flag_exposures
  UNION ALL SELECT 'flag_exposure_distinct_users', count(distinct user_id) FROM flag_exposures
  UNION ALL SELECT 'config_exposures', count(*) FROM config_exposures
  UNION ALL SELECT 'user_assignments', count(*) FROM user_assignments
  UNION ALL SELECT 'exposures', count(*) FROM exposures
" > "$COUNTS_FILE" || true

# ---- serve built frontend ----
echo "==> Serving built frontend on $FRONTEND_URL ..."
npm --prefix frontend run preview -- --port 4173 --strictPort >/tmp/optifork-preview.log 2>&1 &
PREVIEW_PID=$!
for i in $(seq 1 30); do
  curl -sf "$FRONTEND_URL" >/dev/null 2>&1 && { echo "   preview up (${i}s)"; break; }
  sleep 1
done

# ---- load tests ----
echo "==> Running Locust scenarios (u=$USERS r=$SPAWN t=$DUR)..."
for scenario in "FlagEvalUser:flageval" "MixedUser:mixed" "ConsoleUser:console"; do
  CLASS="${scenario%%:*}"; PREFIX="${scenario##*:}"
  echo "   - $CLASS"
  "$VENV/bin/locust" -f load_tests/locustfile.py "$CLASS" --headless \
    -u "$USERS" -r "$SPAWN" -t "$DUR" --host "$BACKEND_URL" \
    --csv "$RESULTS/$PREFIX" --only-summary >"$RESULTS/$PREFIX.log" 2>&1 || true
done

# ---- capture backend state after load (before anything can tear it down) ----
echo "==> Capturing backend container logs + post-load health..."
$COMPOSE logs --no-color backend > "$RESULTS/backend_container.log" 2>&1 || true
if curl -sf "$BACKEND_URL/health" >/dev/null 2>&1; then
  echo up > "$RESULTS/_backend_after.txt"
  echo "   backend still healthy after load"
else
  echo down > "$RESULTS/_backend_after.txt"
  echo "   ⚠️ backend NOT healthy after load (captured logs for the report)"
fi

# ---- frontend benchmark ----
echo "==> Running frontend benchmark..."
FRONTEND_URL="$FRONTEND_URL" OUT="$RESULTS" node frontend_bench/bench.mjs || true

# ---- run metadata ----
"$VENV/bin/python" - "$RESULTS" "$SCALE" "$USERS" "$SPAWN" "$DUR" <<'PY'
import json, sys, os
results, scale, users, spawn, dur = sys.argv[1:6]
counts = {}
cf = os.path.join(results, "_counts.txt")
if os.path.exists(cf):
    for line in open(cf):
        line = line.strip()
        if "|" in line:
            k, v = line.split("|", 1)
            try: counts[k] = int(v)
            except ValueError: pass

backend_after = "unknown"
baf = os.path.join(results, "_backend_after.txt")
if os.path.exists(baf):
    backend_after = open(baf).read().strip()

# If the backend went down under load, pull the tail of its container log for the report.
crash_tail = ""
blog = os.path.join(results, "backend_container.log")
if backend_after == "down" and os.path.exists(blog):
    lines = open(blog, errors="replace").read().splitlines()
    crash_tail = "\n".join(lines[-25:])

meta = {
    "scale": scale,
    "backend": "prod backend Dockerfile image + PostgreSQL 15 (docker-compose.scale.yml), single Uvicorn worker",
    "locust": {"users": int(users), "spawn": int(spawn), "duration": dur},
    "seed_counts": counts,
    "backend_after_load": backend_after,
    "backend_crash_tail": crash_tail,
}
json.dump(meta, open(os.path.join(results, "run_meta.json"), "w"), indent=2)
print("wrote run_meta.json")
PY

# ---- report ----
echo "==> Generating SCALE_REPORT.md ..."
"$VENV/bin/python" scripts/gen_scale_report.py "$RESULTS" "$ROOT/SCALE_REPORT.md"

echo "==> Done. See SCALE_REPORT.md"
