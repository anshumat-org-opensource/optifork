# OptiFork frontend benchmark harness (Playwright + web-vitals)

Drives each console page under **4× CPU throttling** and records the metrics behind the
Phase 3 UI performance bars, so we have an honest baseline before any redesign:

- **web-vitals**: LCP, CLS, FCP, TTFB (page load) and INP (interaction) via injected
  `PerformanceObserver`s.
- **Scroll jank**: approximate fps + jank-frame count while scrolling the flag list
  (the "60 fps through 10K rows / virtualization" bar).
- **JS bundle size**: gzipped size of the built `dist/` bundle (the "< 250 KB per route" bar).

Run it against the **built** frontend on the **seeded** dataset (not the dev server, not an
empty DB). `make scale-test` wires that up; manual usage below.

## The SPA caveat (why navigation is click-based)

The console is a single-page app with **no per-page routing** and **localStorage auth**.
There are no deep-linkable page URLs, so the harness:

1. seeds an admin user into `localStorage` (via an init script) so the console renders
   without the login screen, and
2. navigates by clicking the sidebar tabs, measuring interaction latency + vitals per tab.

LCP/CLS/FCP/TTFB are captured for the **initial load** (the default Feature Flags tab, which
renders the large flag list). Tab switches report time-to-content, INP, and a CLS delta.

There is a **single JS bundle** (no route code-splitting today), so "JS bundle per route" is
reported as that one shared bundle — recorded as a gap for Phase 3.

## Setup

```bash
cd frontend_bench
npm ci                        # or: npm install
npx playwright install chromium
```

## Run

```bash
# against a built + served frontend that talks to a seeded backend
FRONTEND_URL=http://localhost:4173 node bench.mjs
```

Config via env: `FRONTEND_URL` (default `http://localhost:5173`), `DIST_DIR`
(default `../frontend/dist`), `OUT` (default `./results`), `CPU_THROTTLE` (default `4`),
`HEADLESS` (default `1`), `VIEWPORT` (default `1280x800`).

Output: `results/frontend_report.json` (+ a summary table on stdout). `results/` and
`node_modules/` are git-ignored.

## Notes

- The frontend hardcodes the API at `http://localhost:8000`, so the browser always calls
  that host regardless of env; point the seeded backend there.
- `frontend/dist` is git-ignored — build it first (`npm --prefix frontend run build`).
- Representative numbers require the **seeded 10K-flag dataset**; against an empty/dev DB the
  list is trivially small and scroll/LCP are not meaningful.
