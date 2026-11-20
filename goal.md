GOAL: Harden OptiFork to Statsig/Optimizely scale, then redesign the UI against that scale

OptiFork (this repo) is a working open-source feature flag platform: FastAPI backend (uvicorn), Node frontend, Docker deploy via deploy.sh.

The goal has two parts, done in order:

Prove that the features OptiFork already has hold up at the scale Statsig and Optimizely operate at, and fix whatever breaks.
Redesign the console so every existing feature is as easy to use as Statsig's equivalent, or easier, while staying smooth on the production-scale dataset.

Do not add features. "Done" means measured, not claimed.

Ground rules (apply to every phase)
Frozen scope. Phase 0 produces FEATURES.md. Nothing outside it gets built. Ideas go under "Gaps — not built" or "UI ideas — not built" and you move on.
A new capability is a new feature, even when it's small: a new filter, chart, page, bulk action, keyboard shortcut, export, or dark mode (if it doesn't exist today). Redesigning how an existing capability looks or flows is allowed.
Never loosen a target to make it pass. If a target fails, report it as failing.
Stop and ask before any architectural change, such as moving flag evaluation from the server into an SDK, replacing the database, or adding a message queue. Write up the change and its trade-offs in SCALE_REPORT.md and wait for approval.
Phase gates are hard. Don't start a phase until the previous one's exit criteria are met and committed.
Commit after each completed step with its tests passing. All existing tests must keep passing.
Phase 0 — Inventory (no code changes)
Read the backend, frontend, DB schema/migrations, and deploy setup.
Write FEATURES.md: every existing feature, with its API endpoints, UI screens, and the DB tables it touches. Derive this from the code, not the README.
Write ARCHITECTURE.md:
How a flag decision is made (a server API call per evaluation, or local evaluation in an SDK)
How flag config reaches clients, and how fast
Whether and how exposures/events are recorded
Caching, connection pooling, worker model, and DB indexes as they are today

Exit criteria: both files committed. Pause so the human can review FEATURES.md before Phase 1 starts.

Phase 1 — Scale harness (build this before changing any feature)
Seed script loads production-scale data into a fresh DB:
10,000 flags; 5,000 experiments/rollouts (500 active); 1,000 segments
Targeting rules with up to 50 conditions
100,000 audit/change-history records
1M+ distinct user IDs of exposure data (only for features that record exposures today)
Realistic messiness: long names, unicode, near-duplicate names, deep tag lists
Load tests (k6 or Locust) run against the Docker prod build, not dev.
Frontend benchmark harness: Playwright plus Lighthouse/web-vitals scripts that run each console page on the seeded dataset with 4x CPU throttling.
One command, make scale-test, seeds the data, runs every backend and frontend benchmark, and writes SCALE_REPORT.md (target, measured, pass/fail, hardware).

Exit criteria: make scale-test runs from a fresh clone and produces a baseline SCALE_REPORT.md, with failures recorded honestly.

Phase 2 — Backend scale targets, and fixes
Targets

Flag evaluation

If evaluation is local in an SDK: p99 < 1 ms per decision.
If evaluation is a server API call: p99 < 20 ms at 5,000 req/s sustained for 30 minutes, with zero errors. Show throughput at 1x, 2x and 4x workers to demonstrate linear scaling.
Config propagation: a flag change reaches all clients in < 10 s.
Bucketing: deterministic, and uniform within chi-square tolerance across 10M simulated users.

Console API (on the seeded dataset)

Every list endpoint is paginated server-side. No endpoint returns an unbounded collection.
Search/filter across 10K flags: < 200 ms server time.
200 concurrent console users editing: no lost updates. Concurrent edits to the same flag must never silently overwrite each other.

Resilience

With the backend or DB down, clients keep serving last-known flag values.
Restarting under load causes no data loss and no corrupted flag state.
Fixing
Fix only what fails. For each failure, profile to find the root cause (don't guess), fix it, add a regression test, and re-run the benchmark.
Allowed: indexes, query rewrites, caching, pagination, connection pooling, async I/O, worker configuration, SDK-side caching.
Not allowed: changing what a feature does, or adding one.

Exit criteria: every Phase 2 target passes, or has an approved architectural plan recorded in SCALE_REPORT.md.

Phase 3 — UI redesign, done against the seeded 10K-flag dataset

The dev environment uses the seeded production-scale dataset for all UI work. Don't design against a near-empty database.

Step 1 — Build the reference
For each feature in FEATURES.md, find Statsig's equivalent screen and workflow (Statsig's free tier and docs), and Optimizely Feature Experimentation's where relevant.
Write UI_BENCHMARK.md: each workflow's steps in Statsig and in OptiFork today, side by side, with screenshots.
Choose the 8–10 core workflows. Adjust these to what OptiFork actually has: create a flag · add a targeting rule · roll out to 10% · find one flag among 10,000 · see who a flag is on for · kill a flag during an incident · review change history · set up an experiment · read results
Step 2 — Design system first
Define tokens (color, type, spacing, radius, elevation) and core components (table, form field, rule builder, status badge, modal, toast, empty state) before redesigning any screen.
Build every screen only from these components, with no one-off styling.
Step 3 — Redesign workflow by workflow

For each screen, design and test every state: empty, loading (skeletons for loads over 300 ms), error, partial data, permission denied, one item, 10,000 items, very long names/values, and a 50-condition targeting rule that stays readable.

Step 4 — Review loop

After each workflow, take OptiFork and Statsig screenshots side by side, check them against the quality bars below, and fix problems before moving on. A workflow isn't done until the screenshots are captured.

UI quality bars (measured on the seeded dataset)

Usability, compared with Statsig

Clicks and screens for each core workflow: ≤ Statsig's for the same task.
Time to complete, from a scripted Playwright run: recorded before and after.
Killing a flag during an incident: ≤ 3 interactions from any page.
Every error says what went wrong and how to fix it.
Destructive or high-impact actions (delete, 100% rollout, prod changes) ask for confirmation and show their impact first.

Performance (mid-range laptop, 4x CPU throttling)

LCP < 1.5 s, INP < 100 ms, CLS < 0.05 on every page.
60 fps scrolling through 10K-row tables (virtualized).
JS bundle per route: < 250 KB gzipped.

Accessibility

WCAG 2.2 AA: zero axe-core violations, every existing action operable by keyboard, visible focus, 4.5:1 contrast.

Responsiveness

Fully usable at 1280px and 1920px. Read-only views usable at 768px.

Consistency

Playwright screenshot visual-regression tests on every screen and state.

Exit criteria: every core workflow in UI_BENCHMARK.md has before/after numbers that equal or beat Statsig, and every UI quality bar passes.

Definition of done
[ ] FEATURES.md scope unchanged since the Phase 0 review
[ ] make scale-test runs clean from a fresh clone
[ ] SCALE_REPORT.md: every backend and frontend target, with before/after numbers, pass/fail, and hardware used
[ ] UI_BENCHMARK.md: before/after clicks and timings for every core workflow, against Statsig
[ ] Lighthouse, axe and visual-regression suites run in CI and pass
[ ] All existing tests pass, and every fix has a regression test
[ ] "Gaps — not built" and "UI ideas — not built" list everything left out