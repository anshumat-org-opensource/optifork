"""Locust load tests for OptiFork (Phase 1 scale harness).

Run against the **Docker prod build** (Postgres-backed), not the dev server, on a
database seeded by ``backend/seed_scale.py``. These scenarios map directly to the
Phase 2 backend targets so the baseline SCALE_REPORT numbers mean something:

  * ``FlagEvalUser``   — pure flag evaluation hot path
                         (target: p99 < 20 ms @ 5,000 req/s, zero errors)
  * ``ConfigEvalUser`` — remote-config evaluation hot path
  * ``ConsoleUser``    — console list/read endpoints
                         (target proxy: "search across 10K flags" < 200 ms — see note)
  * ``MixedUser``      — realistic blend of the above

Each flag/config evaluation also writes an exposure row server-side (INSERT+COMMIT on
the request path); that write amplification is deliberately included — it is what
Phase 2 is expected to surface.

Note on "search/filter across 10K flags": OptiFork has **no search endpoint today**
(see FEATURES.md -> "Gaps - not built"). The closest existing behaviour is the console
fetching the full collection via ``GET /flags``, so ConsoleUser measures that as the
proxy. The report records real search as N/A / not-built.

Examples:
  # pure flag-eval throughput/latency, headless, 60s, CSV output
  locust -f locustfile.py FlagEvalUser --headless -u 200 -r 50 -t 60s \
         --host http://localhost:8000 --csv results/flageval

  # interactive web UI with all user classes available
  locust -f locustfile.py --host http://localhost:8000
"""

import os
import random

import requests
from locust import HttpUser, task, tag, between, events


# --------------------------------------------------------------------------- #
# Shared entity pools — fetched once at test start so requests hit real data
# --------------------------------------------------------------------------- #

POOLS = {"flags": [], "configs": [], "experiments": []}

# cap how many names we pull into memory for random selection
_POOL_CAP = 5_000
_TRAITS = [
    {"country": "US", "plan": "premium"},
    {"country": "EU", "plan": "free", "beta": "true"},
    {"os": "ios", "app_version": "1.2.3"},
    {},  # no extra traits
]


def _rand_user():
    return f"loaduser_{random.randint(0, 2_000_000)}"


def _rand_traits_qs():
    t = random.choice(_TRAITS)
    return "".join(f"&{k}={v}" for k, v in t.items())


@events.test_start.add_listener
def _load_pools(environment, **_kwargs):
    """Populate flag/config/experiment name pools from the target before the run."""
    host = (environment.host or os.getenv("OPTIFORK_HOST", "http://localhost:8000")).rstrip("/")
    print(f"[locust] loading entity pools from {host} ...")
    try:
        flags = requests.get(f"{host}/flags", timeout=120).json()
        POOLS["flags"] = [f["name"] for f in flags][:_POOL_CAP]
    except Exception as e:  # noqa: BLE001
        print(f"[locust] WARNING: could not load flags: {e}")
    try:
        configs = requests.get(f"{host}/configs", timeout=120).json()
        POOLS["configs"] = [c["key"] for c in configs][:_POOL_CAP]
    except Exception as e:  # noqa: BLE001
        print(f"[locust] WARNING: could not load configs: {e}")
    try:
        exps = requests.get(f"{host}/experiments/", timeout=120).json()
        POOLS["experiments"] = [e["name"] for e in exps][:_POOL_CAP]
    except Exception as e:  # noqa: BLE001
        print(f"[locust] WARNING: could not load experiments: {e}")
    print(f"[locust] pools: flags={len(POOLS['flags'])} "
          f"configs={len(POOLS['configs'])} experiments={len(POOLS['experiments'])}")
    if not POOLS["flags"]:
        print("[locust] WARNING: no flags found — is the DB seeded? Eval tasks will no-op.")


# --------------------------------------------------------------------------- #
# Scenario tasks (shared, grouped by stable request names)
# --------------------------------------------------------------------------- #

def eval_flag(client):
    if not POOLS["flags"]:
        return
    name = random.choice(POOLS["flags"])
    client.get(
        f"/flags/{name}?user_id={_rand_user()}{_rand_traits_qs()}",
        name="GET /flags/[name] (evaluate)",
    )


def eval_config(client):
    if not POOLS["configs"]:
        return
    key = random.choice(POOLS["configs"])
    client.get(
        f"/configs/evaluate/{key}?user_id={_rand_user()}{_rand_traits_qs()}",
        name="GET /configs/evaluate/[key]",
    )


def assign_experiment(client):
    if not POOLS["experiments"]:
        return
    name = random.choice(POOLS["experiments"])
    client.get(
        f"/experiments/{name}/assign?user_id={_rand_user()}&country=US",
        name="GET /experiments/[name]/assign",
    )


# --------------------------------------------------------------------------- #
# User classes
# --------------------------------------------------------------------------- #

class FlagEvalUser(HttpUser):
    """Pure flag-evaluation hot path — the p99/throughput target."""
    wait_time = between(0, 0)  # drive as hard as the client allows

    @task
    @tag("eval", "flag")
    def _flag(self):
        eval_flag(self.client)


class ConfigEvalUser(HttpUser):
    """Pure remote-config evaluation hot path."""
    wait_time = between(0, 0)

    @task
    @tag("eval", "config")
    def _config(self):
        eval_config(self.client)


class ExperimentAssignUser(HttpUser):
    """Pure experiment variant-assignment hot path."""
    wait_time = between(0, 0)

    @task
    @tag("eval", "experiment")
    def _assign(self):
        assign_experiment(self.client)


class ConsoleUser(HttpUser):
    """Console list/read endpoints (unbounded today — the pagination target)."""
    wait_time = between(0.5, 2.0)

    @task(5)
    @tag("console", "list", "search")
    def list_flags(self):
        # proxy for "search/filter across 10K flags" (no search endpoint exists)
        self.client.get("/flags", name="GET /flags (list all)")

    @task(2)
    @tag("console", "list")
    def list_segments(self):
        self.client.get("/segments", name="GET /segments (list all)")

    @task(2)
    @tag("console", "list")
    def list_configs(self):
        self.client.get("/configs", name="GET /configs (list all)")

    @task(1)
    @tag("console", "results")
    def experiment_results(self):
        self.client.get("/experiments/results", name="GET /experiments/results")

    @task(2)
    @tag("console", "exposures")
    def recent_exposures(self):
        self.client.get("/exposures?limit=100", name="GET /exposures?limit=100")


class MixedUser(HttpUser):
    """Realistic blend: mostly evaluation traffic with some console reads."""
    wait_time = between(0, 0.1)

    @task(60)
    @tag("eval", "flag")
    def _flag(self):
        eval_flag(self.client)

    @task(20)
    @tag("eval", "config")
    def _config(self):
        eval_config(self.client)

    @task(10)
    @tag("eval", "experiment")
    def _assign(self):
        assign_experiment(self.client)

    @task(5)
    @tag("console", "list", "search")
    def _list_flags(self):
        self.client.get("/flags", name="GET /flags (list all)")

    @task(5)
    @tag("console", "exposures")
    def _exposures(self):
        self.client.get("/exposures?limit=100", name="GET /exposures?limit=100")
