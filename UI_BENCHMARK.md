# OptiFork UI Benchmark (Phase 3, Step 1)

The reference for the UI redesign: each **core workflow** measured in **OptiFork today**
(on the seeded 10,000-flag dataset) side-by-side with **Statsig's** equivalent, plus the
quality-bar baseline. Redesign work (Steps 2–4) is measured against this.

## Method & honesty notes

- **OptiFork-today** numbers are from the real app on the seeded dataset (10K flags / 200
  segments / 200 configs / 200 experiments). The "before" perf baseline is
  `docs/ui_baseline/frontend_report.json` (Playwright + web-vitals, 4× CPU throttle). Full-page
  "before" screenshots were measured but not committed (24 MB — the size *is* the finding; the
  pre-redesign UI is at the prior git revision). **After** screenshots are committed in
  `docs/ui_redesign/` and captured via `frontend_bench/screenshots.mjs` / `shots_redesign.mjs`.
- **Statsig** steps are from Statsig's public docs / free-tier console (cited per workflow).
  I don't have a Statsig account, so **Statsig screenshots are not captured here** — the
  comparison uses documented workflows + step counts. (If you want literal side-by-side
  images, that needs a Statsig login; flag it and I'll fold them in.)
- "Interactions" = clicks/keystrokes a user performs; "screens" = distinct views traversed.
  Counts are approximate but measured against the actual UIs.

## Core workflows (the 8–10, adjusted to what OptiFork has)

| # | Workflow | OptiFork today | Statsig | OptiFork gap |
|---|---|---|---|---|
| 1 | Create a flag | ~3 interactions, 1 screen | ~3, 2 screens | ≈ parity |
| 2 | **Find one flag among 10,000** | **impossible — no search/pagination UI** | 1 (search box) | ❌ critical |
| 3 | Add a targeting rule | find† + Edit + Add Rule + 3 fields + Save | open + Add Rule + criteria + Save | ❌ (find†) + clunky |
| 4 | Roll out to 10% | find† + Edit + slider + Save | open + set % + Save | ❌ (find†) |
| 5 | See who a flag is on for | Exposures subtab + flag filter → raw rows | gate → exposures/Pulse (aggregated) | ⚠️ raw only |
| 6 | **Kill a flag during an incident** | find† + Edit + rollout→0 + Save (no toggle/confirm) | toggle / "…" → Disable (~2) | ❌ fails ≤3-interaction bar |
| 7 | **Review change history** | **not built** (no audit feature) | gate → History/Diagnostics | ❌ missing |
| 8 | Set up an experiment | Experiments → Manage → form → Create | Experiments → Create → hypothesis → variants | ≈ parity (fewer guards) |
| 9 | Read experiment results | Results subtab → raw assignment/exposure counts | Results/Pulse → lifts + significance | ⚠️ no stats |

† **find†** = locating a specific flag. OptiFork's list has **no search box and no pagination
controls**; it renders fetched flags as full-height cards in one endless scroll (the
`02-flags-manage.png` capture is **35,490 px tall**). Every "find the flag first" workflow
(3, 4, 6) is blocked by this. The backend *does* have `GET /flags?search=` (Phase 2) — the UI
simply doesn't use it yet.

---

## Workflow detail

### 1. Create a flag
- **OptiFork** (`docs/ui_baseline/03-flag-edit.png`, top "Create Feature Flag" card): the create
  form is always present on the Feature Flags → Manage screen. Type a name, optionally drag the
  rollout slider / edit description, click **Create Feature Flag**. ~3 interactions, 1 screen.
  Weaknesses: no name-format validation feedback, create form competes for space with the list
  and the edit form (all stacked on one screen).
- **Statsig**: Feature Gates → **Create** → enter name + description → **Create**; the new gate
  starts with no rules (returns false). ([create](https://docs.statsig.com/feature-flags/create))
- **Target:** ≤ Statsig; add inline validation; give create its own focused surface.

### 2. Find one flag among 10,000  ❌ critical
- **OptiFork**: there is **no search field and no pagination UI**. The list fetches a page and
  renders it as a giant vertical scroll; you cannot jump to a named flag. This is the single
  worst workflow.
- **Statsig**: Feature Gates catalog has a **search bar + filters** (type, modified date, pass
  rate, rollout). Type the name → one result.
  ([lifecycle/search](https://docs.statsig.com/feature-flags/feature-flags-lifecycle))
- **Target:** a search box (wire up `GET /flags?search=`) + a dense, virtualized, paginated
  table. Find-a-flag in ≤ 1 interaction + typing.

### 3. Add a targeting rule
- **OptiFork** (`03-flag-edit.png`): after finding the flag (blocked, see #2) → **Edit** → scroll
  to **Legacy Targeting Rules** → **+ Add Rule** → fill field / op / value → **Update Flag**. The
  rule builder is three bare inputs; the edit view also renders the whole create form above it.
- **Statsig**: open gate → **Add New Rule** → choose criteria (app property / segment / another
  gate) → **Save Changes**. ([add-rule](https://docs.statsig.com/feature-flags/add-rule/))
- **Target:** proper rule-builder component; a 50-condition rule must stay readable.

### 4. Roll out to 10%
- **OptiFork**: find† → **Edit** → drag rollout slider (or type 10 in the % box) → **Update Flag**.
- **Statsig**: open gate → set the rule **Split %** → **Save**.
- **Target:** ≤ Statsig once find/search exists; a clear % control with confirmation on big jumps.

### 5. See who a flag is on for
- **OptiFork** (`05-flag-exposures.png`): Feature Flags → **Exposures** subtab → pick a flag in a
  dropdown → a raw table of `user_id / enabled / timestamp`. No pass/fail summary, no counts.
- **Statsig**: the gate's exposures / Pulse view shows pass vs fail volumes over time.
- **Target:** a summary (how many pass/fail, recent exposures) on the flag itself, not a separate raw log.

### 6. Kill a flag during an incident  ❌ fails the ≤3-interaction bar
- **OptiFork**: find† → **Edit** → set rollout to 0 → **Update Flag**. There is **no on/off toggle,
  no one-click kill, no confirmation, and no impact preview** — and finding the flag is the blocker.
- **Statsig**: toggle the gate off, or "**…**" → **Disable** (~2 interactions) from the catalog.
  ([lifecycle](https://docs.statsig.com/feature-flags/feature-flags-lifecycle))
- **Bar:** "killing a flag ≤ 3 interactions from any page." OptiFork **fails** today.
- **Target:** a persistent kill control reachable in ≤ 3 interactions, with a confirm + impact line.

### 7. Review change history  ❌ not built
- **OptiFork**: no audit / change-history feature exists (explicitly out of scope, see FEATURES.md).
- **Statsig**: each gate has a History / Diagnostics log of who changed what, when.
- **Target:** N/A for build (out of scope). The redesign will not fabricate a history view; it can
  surface the `version` number (Phase 2) so users at least see "this flag has changed."

### 8. Set up an experiment
- **OptiFork** (`08-experiments-manage.png`): Experiments → **Manage** → fill the Create Experiment
  form (name, description, optional targeting flag, variants + traffic splits) → **Create**.
- **Statsig**: Experiments → **Create** → name + hypothesis → **Create** → define variants, metrics,
  duration, targeting. ([abn-tests](https://docs.statsig.com/guides/abn-tests))
- **Target:** ≤ Statsig; variant/split editor as a reusable component; validate splits sum to 100%.

### 9. Read experiment results
- **OptiFork** (`09-experiments-results.png`): Experiments → **Results** → per-variant **assignment
  and exposure counts** only. No lift, no confidence, no significance.
- **Statsig**: Results/Pulse → metric lifts with confidence intervals + significance.
- **Target:** present the counts OptiFork *does* have clearly (we won't invent stats that aren't
  computed); make the comparison readable.

---

## UI quality bars — OptiFork-today baseline

Measured on the seeded dataset, 4× CPU throttle (`docs/ui_baseline/frontend_report.json`).
These are the "before" numbers the redesign must beat.

| Bar | Target | OptiFork today | Status |
|---|---|---|---|
| LCP | < 1.5 s | 156 ms (Flags load) | ✅ |
| INP | < 100 ms | ~72 ms | ✅ |
| **CLS** | **< 0.05** | **0.067** | ❌ (layout shift on load) |
| JS bundle / route | < 250 KB gz | 88.9 KB (single bundle, no route split) | ✅ (but one bundle) |
| 60 fps / 10K-row table (virtualized) | 60 fps virtualized | list **not virtualized**; renders ~35,000 px of cards | ❌ (works only because UI caps at 100) |
| Kill a flag ≤ 3 interactions | ≤ 3 | not achievable (no quick kill + find blocked) | ❌ |
| Accessibility (axe, WCAG 2.2 AA) | 0 violations | **not yet audited** | ⏳ baseline TBD |
| Responsive 1280/1920, read-only 768 | usable | sidebar + stacked cards; not tested at 768 | ⏳ |
| Visual-regression coverage | every screen/state | none | ⏳ |

### Headline problems the redesign must fix
1. **No search / no virtualized, dense table** → finding, editing, and killing flags at 10K is
   broken. (Backend search exists; wire it up + build a real table.)
2. **No fast kill switch / status at a glance** → incident response fails the ≤3 bar.
3. **Create + list + edit all stacked on one screen** → cluttered, no focus.
4. **CLS 0.067** and non-virtualized DOM → perf/stability at scale.
5. **Raw logs instead of summaries** (exposures, experiment results).
6. **No design system** → one-off Tailwind styling everywhere; inconsistent.

---

## Redesign delivered — Step 3 (scope: flags table · find-a-flag · kill switch)

Rebuilt the **Feature Flags** screen on a new design system. Screenshots:
`docs/ui_redesign/{flags-table,flags-search,flags-kill-confirm}.png`.

### Before → After (the 3 prioritized workflows)

| Workflow | Before (OptiFork) | After (OptiFork) | vs Statsig |
|---|---|---|---|
| **Find one flag among 10,000** | impossible — no search, 35,000 px card scroll | **search box** → instant filter (wired to `GET /flags?search=`); dense table | ≤ Statsig (1 field + typing) ✅ |
| **Flags table** | full-height cards, one endless scroll, not virtualized | **dense, virtualized table** (name · status badge · rollout bar · rules · actions), server-paginated | ✅ scannable |
| **Kill a flag during an incident** | find† + Edit + rollout→0 + Save; no toggle/confirm/impact | per-row **Kill** → confirm dialog showing **impact (X% → 0%)**; **2 interactions** from the flags screen, ≤3 from any page | ≤ Statsig ✅; meets the ≤3-interaction bar |

Also: the always-open create form was moved behind a **"＋ New flag"** disclosure so the table
is primary (fixes the "create + list stacked" clutter); status is visible at a glance via badges.

### Quality bars — after (flags screen, 4× CPU throttle, seeded 10K)

| Bar | Target | Before | After | Status |
|---|---|---|---|---|
| CLS | < 0.05 | 0.067 | **0.001** | ✅ (was ❌) |
| LCP | < 1.5 s | 156 ms | 224 ms | ✅ |
| INP | < 100 ms | ~72 ms | ~72 ms | ✅ |
| JS bundle | < 250 KB gz | 88.9 KB | 92.6 KB | ✅ |
| 60 fps / virtualized table | 60 fps | ❌ not virtualized | **~60 fps, virtualized** | ✅ (was ❌) |
| Kill ≤ 3 interactions | ≤ 3 | ❌ | **2** | ✅ (was ❌) |
| Destructive action: confirm + impact | required | ❌ | **confirm + "X% → 0%" impact** | ✅ |
| Accessibility (axe, WCAG 2.2 AA) | 0 violations | not audited | **0 violations** | ✅ |
| Error states say what/how to fix | required | generic | explicit retry + guidance | ✅ |

Measured via `frontend_bench/bench.mjs` (web-vitals) and `frontend_bench/axe_scan.mjs` (axe-core).

### Design system (Step 2) — built for this screen, reused everywhere next

- **Tokens** (`src/index.css` + `tailwind.config.js`): color, type, radius, elevation, focus ring.
  Light theme only (dark mode would be a new feature — out of scope).
- **Components** (`src/ui/`): `Button`, `SearchInput`, `StatusBadge`, `Table` (via `VirtualList`),
  `ConfirmDialog` (modal), `Toast`, `EmptyState`, `Skeleton`. The flags screen is built only from
  these (no one-off styling). States covered: loading (skeleton), error (+retry), empty, no-search-
  results, long names/values (truncate + tooltip), many rows (virtualized + paginated).

### Not redesigned yet (remaining workflows)
Segments, Configs, Experiments (setup/results), Exposures, Test, Create-flag internals — still on
the old styling. They can be migrated onto the same design system next, workflow by workflow.

## UI ideas — not built (parked; populated during redesign)

- (Reserved for Steps 2–4. Any *new capability* idea that surfaces goes here, not into the build,
  unless approved — e.g. a real change-history view, aggregated exposure analytics, stat
  significance on results are all **new features**, out of scope.)
