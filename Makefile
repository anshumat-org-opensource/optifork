# OptiFork scale harness (Phase 1).
#
# `make scale-test` seeds a fresh production-scale database into the Docker prod
# backend build, runs the backend (Locust) and frontend (Playwright/web-vitals)
# benchmarks, and writes SCALE_REPORT.md with target/measured/pass-fail/hardware.
#
#   make scale-test             # smoke scale (fast; proves the pipeline)
#   make scale-test SCALE=full  # production scale (10K flags, 1M+ exposure users)
#   make scale-up / scale-down  # bring the scale stack up / down by hand
#
# Requirements: docker (+ compose), node/npm, python3. Deps are installed on first run.

SCALE ?= smoke
COMPOSE := docker compose -f docker-compose.scale.yml

.PHONY: scale-test scale-up scale-down scale-seed scale-clean

scale-test:
	./scripts/run_scale_test.sh $(SCALE)

scale-up:
	$(COMPOSE) up -d --build

scale-down:
	$(COMPOSE) down -v

scale-seed:
	$(COMPOSE) exec -T backend python seed_scale.py --scale $(SCALE) --fresh

scale-clean:
	rm -rf scale_results load_tests/results frontend_bench/results
