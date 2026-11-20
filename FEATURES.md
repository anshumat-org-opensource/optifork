# OptiFork — Feature Inventory (Phase 0)

Derived from the code, not the README. This is the **frozen scope** for the hardening
effort: nothing outside this document gets built. New capabilities go under
"Gaps — not built" / "UI ideas — not built" and we move on.

Code anchors: backend FastAPI app in `backend/` (entry `backend/main.py`), routers in
`backend/routers/`, sub-apps in `backend/experiments/` and `backend/ai_experiments/`,
ORM models in `backend/models.py` and `backend/experiments/models.py`, data access in
`backend/crud.py` + `backend/experiments/crud.py` + `backend/ai_experiments/crud.py`.
Frontend React/Vite app in `frontend/src/`, single-page tabbed console (`App.tsx`).

> **Auth note that colours everything below:** there is **no backend authentication or
> authorization**. Every endpoint listed is unauthenticated and world-callable. All
> roles/permissions/login live purely in the browser's `localStorage` (see Feature 8).

---

## 1. Feature Flags

Boolean flags with a percentage rollout, optional legacy targeting rules, and optional
segment associations. Evaluation is a **server API call per decision** that also writes
an exposure row.

**API endpoints** (`backend/main.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/flags` | Create a flag (`name`, `description`, `rollout` 0–1, `rules[]`). Rejects duplicate name. |
| GET | `/flags` | List **all** flags with their rules. No pagination, no filter. |
| PUT | `/flags/{flag_name}` | Update description, rollout, and rules (deletes + recreates rules). Name immutable in UI. |
| GET | `/flags/{flag_name}?user_id=&<traits>` | **Evaluate** flag for a user. Segment match first, else legacy rules gate, else rollout bucket. Writes a `flag_exposures` row every call. Returns `{flag, user_id, enabled}`. |
| GET | `/flags/{flag_name}/exposures?limit=100` | Exposure log for one flag. |
| GET | `/exposures?limit=100` | Exposure log across all flags. |

**Bucketing**: `int(sha256(user_id).hexdigest(),16) % 10000 / 10000 < rollout` (deterministic per user_id; not salted per flag).

**UI screens** (`frontend/src/`) — "Feature Flags" sidebar section
- `components/CreateFlag.tsx` — Manage subtab: create form (name, description, rollout slider, rules).
- `components/ListFlags.tsx` — Manage subtab: list all flags as cards, inline edit (rollout, description, legacy rules, segment associations via `FlagSegments`).
- `components/TestFlag.tsx` — Test subtab: evaluate a flag for a user_id + ad-hoc traits.
- `components/FlagExposures.tsx` — Exposures subtab: exposure log viewer with optional flag filter.
- `components/FlagSegments.tsx` — segment attach/detach UI embedded in flag edit.

**DB tables**: `feature_flags`, `rules`, `flag_exposures` (and `flag_segments` + `user_segments` when segments are used).

---

## 2. User Segments

Named rule sets evaluated against user traits (AND of all conditions). Reusable across
flags and configs. Conditions stored as JSON.

**API endpoints** (`backend/main.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/segments` | Create segment (`name`, `description`, `conditions[]`). |
| GET | `/segments` | List all segments (ordered by name, no pagination). |
| GET | `/segments/{segment_id}` | Get one segment. |
| PUT | `/segments/{segment_id}` | Update segment. |
| DELETE | `/segments/{segment_id}` | Delete segment. |
| POST | `/flags/{flag_id}/segments` | Associate a segment with a flag (`enabled`, `rollout_percentage`, `priority`). |
| DELETE | `/flags/{flag_id}/segments/{segment_id}` | Remove association. |
| GET | `/flags/{flag_id}/segments` | List a flag's segment associations (ordered by priority desc). |

**Condition operators** (`crud.evaluate_segment_condition`): `equals`, `not_equals`,
`contains`, `not_contains`, `in`, `not_in`, `greater_than`, `less_than`,
`greater_than_or_equal`, `less_than_or_equal`, `starts_with`, `ends_with`.

**UI screens** — "User Segments" sidebar section
- `components/UserSegments.tsx` — create/list/edit/delete segments with a condition builder.
- `components/FlagSegments.tsx` — per-flag association management (shared with Feature 1).

**DB tables**: `user_segments`, `flag_segments`.

---

## 3. Remote Configs

Typed key/value configuration (`string` | `number` | `boolean` | `json`) with a default
value and per-segment value overrides. Evaluation is a server API call that writes an
exposure row.

**API endpoints** (`backend/main.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/configs` | Create config (`key`, `value_type`, `default_value`, `description`). Validates type + value. |
| GET | `/configs` | List all configs (ordered by key, no pagination). |
| GET | `/configs/{config_id}` | Get one config. |
| PUT | `/configs/{config_id}` | Update config. |
| DELETE | `/configs/{config_id}` | Delete config. |
| POST | `/configs/{config_id}/segments` | Associate a segment with a config value override. |
| DELETE | `/configs/{config_id}/segments/{segment_id}` | Remove association. |
| GET | `/configs/{config_id}/segments` | List a config's segment overrides. |
| GET | `/configs/evaluate/{config_key}?user_id=&<traits>` | **Evaluate** a config for a user (segment override else default). Writes `config_exposures`. |
| POST | `/configs/evaluate/batch` (body `config_keys[]`, query `user_id`) | Evaluate multiple configs for a user. |
| GET | `/configs/exposures?config_key=&limit=100` | Config exposure log. |

**UI screens** — "Remote Configs" sidebar section
- `components/RemoteConfigs.tsx` — create/list/edit/delete configs.
- `components/ConfigSegments.tsx` — per-config segment value overrides.

**DB tables**: `remote_configs`, `config_segments`, `config_exposures`.

---

## 4. Experiments (A/B / multivariate)

Experiments with weighted variants, optional targeting via a linked feature flag's rules,
sticky per-user assignment, exposure logging, and simple result counts.

**API endpoints** (`backend/routers/experiment_router.py`, prefix `/experiments`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/experiments/` | Create experiment with `variants[]` (each `name`, `traffic_split`) and optional `flag_id` gate. |
| GET | `/experiments/` | List experiments with variants (no pagination). |
| GET | `/experiments/{name}/assign?user_id=&country=` | Assign (or return sticky) variant. Eligibility gated by linked flag rules; assignment is `random()` across `traffic_split`. |
| POST | `/experiments/{name}/exposure?user_id=` | Assign if needed + write an `exposures` row. |
| GET | `/experiments/results` | Per-variant assignment and exposure counts for all experiments. |

**Assignment logic** (`experiments/crud.assign_user_to_variant`): uses `random.random()`
(not a deterministic hash), so assignment is sticky only once persisted; eligibility uses
`evaluate_flag_rules` which currently handles only `equals` / `not_equals`.

**UI screens** — "Experiments" sidebar section
- `components/CreateExperiment.tsx` — Manage subtab: create experiment + variants, pick targeting flag.
- `components/ListExperiments.tsx` — Manage subtab: list experiments.
- `components/AssignUserToVariant.tsx` — Assign subtab: assign a user to a variant.
- `components/ExperimentResults.tsx` — Results subtab: assignment/exposure counts.

**DB tables**: `experiments`, `variants`, `user_assignments`, `exposures`.

---

## 5. AI Experiments (prompt/model evaluation)

Offline evaluation harness for prompts × models over datasets, with metrics columns.
Note: the **evaluation executor is a stub** — `POST /ai-experiments/evaluate` creates a
run record but there is a `TODO` where the actual model calls would run; runs stay
`pending` and no results are produced.

**API endpoints** (`backend/routers/ai_experiments.py`, prefix `/ai-experiments`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/ai-experiments/` | Create AI experiment. |
| GET | `/ai-experiments/?skip=&limit=100` | List (the **only** server-paginated list endpoint). |
| GET | `/ai-experiments/{id}` | Get experiment detail. |
| PUT | `/ai-experiments/{id}/status` | Set status (`draft`/`running`/`completed`/`archived`). |
| POST/GET | `/ai-experiments/{id}/prompts` | Create / list prompt configs. |
| POST/GET | `/ai-experiments/{id}/models` | Create / list model configs. |
| POST/GET | `/ai-experiments/{id}/datasets` | Create / list eval datasets. |
| POST | `/ai-experiments/{id}/datasets/upload` | Upload dataset file (`.json`/`.jsonl`/`.csv`) to `uploads/datasets/`. |
| POST | `/ai-experiments/evaluate` | Start an offline run (**stub** — no execution). |
| GET | `/ai-experiments/{id}/runs` | List runs. |
| GET | `/ai-experiments/runs/{run_id}` | Run detail + results. |
| GET | `/ai-experiments/{id}/summary` | Evaluation summary. |
| POST/GET | `/ai-experiments/test`, `/test-simple` | Dev smoke endpoints. |

**UI screens** — "AI Experiments" sidebar section
- `components/CreateAIExperiment.tsx` — Manage subtab.
- `components/ListAIExperiments.tsx` — Manage subtab.
- `components/AIExperimentDetails.tsx` — Evaluate subtab.
- Results subtab is a static placeholder panel (no data wired).

**DB tables**: `ai_experiments`, `prompt_configs`, `model_configs`, `evaluation_datasets`,
`evaluation_runs`, `evaluation_results`, `evaluation_metrics`.

---

## 6. Snowflake Data Export (integration)

Configure a Snowflake connection and export flags / exposures / experiments to it,
immediately or as a (claimed) background job.

**API endpoints** (`backend/routers/integrations.py`, prefix `/integrations`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/integrations/snowflake/configure` | Save + test a Snowflake connection. |
| GET | `/integrations/snowflake/config` | Get saved config (password withheld). |
| GET | `/integrations/snowflake/test-connection` | Connect + verify/create tables. |
| POST | `/integrations/snowflake/export` | Export selected data types (`feature_flags`/`experiments`/`exposures`/`all`), optional `since_hours`; `all`/`full_export` runs via `BackgroundTasks`. |
| GET | `/integrations/snowflake/export-status` | Recent export logs + table row counts from Snowflake. |
| POST | `/integrations/snowflake/setup-scheduled-export` | Returns a schedule config (no scheduler actually wired; see disabled `scheduler.py`). |
| GET | `/integrations/snowflake/scheduler-status` | Reports scheduler status (imports disabled module). |

**UI screens**
- `components/SnowflakeIntegration.tsx` — "Data Export" sidebar section (Administrator only).

**DB tables**: `snowflake_configs`. (Connector in `backend/integrations/snowflake_connector.py` uses the **sync** engine.)

---

## 7. Integration Guide (SDK usage docs)

Static, in-console documentation showing how to call the evaluation API from client code,
plus a live fetch of current configs.

**UI screens**
- `components/IntegrationGuide.tsx` — "Integration" sidebar section. Contains example client
  code (`OptiForkClient`) and sample `curl`/Python snippets pointing at `http://localhost:8000`.

**API used**: `GET /configs` (read-only). No dedicated backend endpoint; not an SDK package.

---

## 8. User Management, Roles & Auth (client-side only)

Role-based console gating implemented **entirely in the browser**. No server component.

- `components/Login.tsx` — login form. Users + passwords read from `localStorage`
  (`optifork_users`); default `admin` / `admin123` seeded on first load.
- `components/UserManagement.tsx` — Administrator-only CRUD of users/roles/permissions (in `localStorage`).
- `components/ProtectedRoute.tsx` — gates a subtree by `section`+`permission`.
- `components/Header.tsx` + `App.tsx` — render the permission-aware sidebar/tabs.
- Roles: **Administrator, Developer, Data Analyst, Viewer**. Permission matrix over
  `feature_flags{view,manage,test}`, `experiments{view,manage,assign,results}`,
  `exposures{view}`, `integration{view}`, `ai_experiments{view,manage,evaluate}`.

**DB tables**: none. **Backend enforcement**: none.

---

## 9. Health check & API docs

- `GET /health` → `{"status":"healthy","service":"OptiFork"}` (used by Docker healthchecks).
- `GET /docs` + `/redoc` — Swagger/ReDoc, enabled only when `ENVIRONMENT=development`.

---

## Data model summary (all tables)

From `backend/models.py` and `backend/experiments/models.py`. Tables are created at startup
via `Base.metadata.create_all` (no migration tool).

`feature_flags`, `rules`, `user_segments`, `flag_segments`, `remote_configs`,
`config_segments`, `flag_exposures`, `config_exposures`, `snowflake_configs`,
`experiments`, `variants`, `user_assignments`, `exposures`,
`ai_experiments`, `prompt_configs`, `model_configs`, `evaluation_datasets`,
`evaluation_runs`, `evaluation_results`, `evaluation_metrics`.

**Indexes present** (`index=True` / `unique=True` only — no composite indexes):
- `feature_flags.name` (unique), `.id`
- `user_segments.name` (unique), `.id`; `flag_segments.id`
- `remote_configs.key` (unique), `.id`; `config_segments.id`
- `flag_exposures.flag_name`, `.user_id`, `.id` — **`timestamp` not indexed** (exposure queries sort by it)
- `config_exposures.config_key`, `.user_id`, `.id` — **`timestamp` not indexed**
- `experiments.name` (unique), `.id`; `variants.id`
- `user_assignments.user_id`, `.id`; `exposures.user_id`, `.id`

---

## Present in repo but DISABLED (not active features)

These modules exist but are commented out of `backend/main.py`, so they are **not** part of
the running system today. Listed so they are not mistaken for live features — and not
silently "revived" (reviving one is effectively shipping a feature).

- `backend/middleware.py` — security middleware + `slowapi` rate limiting.
- `backend/monitoring.py` — health/metrics router, Prometheus client.
- `backend/backup.py` — backup/restore router.
- `backend/cache.py` — Redis cache init + warm-up.
- `backend/scheduler.py` — APScheduler background Snowflake export.

`requirements.txt` also lists redis, celery, slowapi, prometheus, pandas, etc. that are not
exercised by the active app.

---

## Gaps — not built

Capabilities the scale/UI goals reference or imply that **do not exist today**. Building any
of these is a new feature (frozen-scope rule) and must be parked, not built, unless the
review explicitly approves it.

- **Audit log / change history** — no table, endpoint, or UI. *(Phase 0 review, 2026-11-21:
  kept out of scope. Phase 1's "100,000 audit/change-history records" seed target therefore
  has no feature to seed against and is recorded N/A in `SCALE_REPORT.md` — not built.)*
- **Server-side pagination** on list endpoints — only `GET /ai-experiments/` has `skip/limit`.
  `/flags`, `/segments`, `/configs`, `/experiments/`, all `/exposures` return unbounded sets.
- **Search / filter** endpoints — none (the UI fetches everything and renders client-side).
- **Optimistic concurrency / versioning** — flag/config/segment updates are read-modify-write
  with no version column or conflict detection → concurrent edits silently overwrite.
- **Client SDK / local evaluation** — evaluation is server-API-only; no SDK package, no
  config-propagation/streaming/ETag mechanism.
- **Real authentication / authorization** — see Feature 8; browser-only, backend open.
- **Dedicated "kill switch"** — killing a flag today means editing rollout to 0 / updating it.
- **AI experiment execution** — the offline evaluator is a stub (no model calls).
- **Real scheduled exports** — scheduler module is disabled; the "scheduled export" endpoints
  return config echoes only.

## UI ideas — not built

(Reserved for Phase 3. Populated during the UI benchmark; empty at Phase 0.)
