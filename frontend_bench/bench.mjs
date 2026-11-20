/**
 * Frontend benchmark harness for the OptiFork console (Phase 1 scale harness).
 *
 * Drives each console page with Playwright under 4x CPU throttling and captures
 * web-vitals (LCP / CLS / FCP / TTFB / INP), a scroll-jank estimate for the big
 * flag list (the 60fps / virtualization bar), and the gzipped JS bundle size.
 * Writes a JSON report and prints a summary table. Intended to run against the
 * built frontend on the seeded dataset (see README); wired into `make scale-test`.
 *
 * The console is a tab-based SPA with no per-page routing and localStorage auth,
 * so the harness seeds an admin user into localStorage and navigates by clicking
 * the sidebar. Because there is a single JS bundle (no route splitting today),
 * "JS bundle per route" is reported as the one shared bundle — see README/report.
 *
 * Config (env):
 *   FRONTEND_URL   default http://localhost:5173
 *   DIST_DIR       default ../frontend/dist   (for gzipped bundle sizing)
 *   OUT            default ./results
 *   CPU_THROTTLE   default 4
 *   HEADLESS       default 1
 *   VIEWPORT       default 1280x800
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DIST_DIR = path.resolve(__dirname, process.env.DIST_DIR || "../frontend/dist");
const OUT = path.resolve(__dirname, process.env.OUT || "./results");
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE || 4);
const HEADLESS = process.env.HEADLESS !== "0";
const [VW, VH] = (process.env.VIEWPORT || "1280x800").split("x").map(Number);

// Console tabs to benchmark, by their exact sidebar label.
const TABS = [
  "User Segments",
  "Remote Configs",
  "Experiments",
  "AI Experiments",
  "Integration",
  "Data Export",
  "Users",
  "Debug",
];

// Admin user with all permissions, matching the shape App.tsx reads from localStorage.
const ADMIN_USER = {
  id: "1",
  username: "admin",
  email: "admin@optifork.com",
  role: "Administrator",
  permissions: {
    feature_flags: { view: true, manage: true, test: true },
    experiments: { view: true, manage: true, assign: true, results: true },
    exposures: { view: true },
    integration: { view: true },
    ai_experiments: { view: true, manage: true, evaluate: true },
  },
};

// Injected at document start on every navigation: seed auth + register vitals observers.
function initScript(adminJson) {
  try {
    localStorage.setItem("optifork_user", adminJson);
    localStorage.setItem("optifork_users", JSON.stringify({ admin: JSON.parse(adminJson) }));
  } catch (e) {}
  const v = { lcp: 0, cls: 0, fcp: 0, ttfb: 0, inp: 0, longTasks: 0, longTaskMs: 0 };
  window.__vitals = v;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) v.lcp = e.renderTime || e.loadTime || e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) v.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.name === "first-contentful-paint") v.fcp = e.startTime;
    }).observe({ type: "paint", buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) v.inp = Math.max(v.inp, e.duration);
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) { v.longTasks++; v.longTaskMs += e.duration; }
    }).observe({ type: "longtask", buffered: true });
  } catch (e) {}
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) v.ttfb = nav.responseStart;
  } catch (e) {}
}

function gzipSizeOf(buf) {
  return zlib.gzipSync(buf, { level: 9 }).length;
}

function walkJs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJs(p));
    else if (entry.name.endsWith(".js")) out.push(p);
  }
  return out;
}

function measureBundle() {
  const files = walkJs(DIST_DIR).map((p) => {
    const buf = fs.readFileSync(p);
    return { file: path.relative(DIST_DIR, p), rawBytes: buf.length, gzipBytes: gzipSizeOf(buf) };
  });
  const totalRaw = files.reduce((a, f) => a + f.rawBytes, 0);
  const totalGzip = files.reduce((a, f) => a + f.gzipBytes, 0);
  return { distDir: DIST_DIR, files, totalRawBytes: totalRaw, totalGzipBytes: totalGzip, exists: files.length > 0 };
}

const kb = (b) => (b / 1024).toFixed(1) + " KB";

async function readVitals(page) {
  // let LCP/CLS settle a moment under throttling
  await page.waitForTimeout(600);
  return await page.evaluate(() => ({ ...window.__vitals }));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    timestamp: new Date().toISOString(),
    config: { frontendUrl: FRONTEND_URL, cpuThrottle: CPU_THROTTLE, viewport: `${VW}x${VH}`, headless: HEADLESS },
    bundle: measureBundle(),
    pages: [],
    scroll: null,
    notes: [],
  };

  console.log(`Frontend benchmark → ${FRONTEND_URL}  (CPU throttle ${CPU_THROTTLE}x, ${VW}x${VH})`);
  console.log(`Bundle (${report.bundle.exists ? "from " + path.relative(process.cwd(), DIST_DIR) : "DIST NOT FOUND"}):` +
    (report.bundle.exists ? ` ${kb(report.bundle.totalGzipBytes)} gzipped (${kb(report.bundle.totalRawBytes)} raw)` : ""));

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: VW, height: VH } });
  await context.addInitScript(initScript, JSON.stringify(ADMIN_USER));

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

  // ---- Initial load (default tab = Feature Flags, renders the big flag list) ----
  const t0 = Date.now();
  await page.goto(FRONTEND_URL, { waitUntil: "load" });
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch (e) {}
  // ensure the console shell (sidebar) rendered
  try { await page.getByText("Feature Flags", { exact: true }).first().waitFor({ timeout: 15000 }); }
  catch (e) { report.notes.push("Console shell did not render — is an admin seeded / backend up?"); }
  const loadMs = Date.now() - t0;
  const loadVitals = await readVitals(page);
  report.pages.push({ page: "Feature Flags (initial load)", timeToReadyMs: loadMs, ...loadVitals });
  console.log(`  ✓ Feature Flags (load): LCP=${loadVitals.lcp.toFixed(0)}ms CLS=${loadVitals.cls.toFixed(3)} FCP=${loadVitals.fcp.toFixed(0)}ms`);

  // ---- Scroll-jank test on the flag list (60fps / virtualization bar) ----
  try {
    const scroll = await page.evaluate(() => new Promise((resolve) => {
      const frames = [];
      let last = performance.now();
      let n = 0;
      const ltBefore = (window.__vitals.longTasks || 0);
      function step() {
        const now = performance.now();
        frames.push(now - last);
        last = now;
        window.scrollBy(0, 60);
        if (++n < 100) requestAnimationFrame(step);
        else {
          const intervals = frames.slice(1); // drop first (warmup)
          const avg = intervals.reduce((a, b) => a + b, 0) / Math.max(intervals.length, 1);
          const jank = intervals.filter((d) => d > 1000 / 55).length; // frames slower than ~55fps
          resolve({
            frames: intervals.length,
            avgFrameMs: avg,
            approxFps: 1000 / avg,
            jankFrames: jank,
            longTasksDuringScroll: (window.__vitals.longTasks || 0) - ltBefore,
          });
        }
      }
      requestAnimationFrame(step);
    }));
    report.scroll = { page: "Feature Flags list", ...scroll };
    console.log(`  ✓ Scroll (flags list): ~${scroll.approxFps.toFixed(0)} fps, ${scroll.jankFrames}/${scroll.frames} jank frames`);
  } catch (e) {
    report.notes.push("Scroll test failed: " + e.message);
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  // ---- Each other tab: click, measure time-to-content + vitals delta ----
  for (const label of TABS) {
    try {
      const target = page.getByText(label, { exact: true }).first();
      if ((await target.count()) === 0) { report.notes.push(`Tab not found: ${label}`); continue; }
      // reset CLS/INP baselines in-page for a per-tab delta
      const before = await page.evaluate(() => ({ cls: window.__vitals.cls, inp: window.__vitals.inp, lt: window.__vitals.longTasks }));
      const t = Date.now();
      await target.click();
      // wait for main content to update (network settle or a short beat)
      try { await page.waitForLoadState("networkidle", { timeout: 10000 }); } catch (e) {}
      await page.waitForTimeout(400);
      const timeToContentMs = Date.now() - t;
      const after = await page.evaluate(() => ({ cls: window.__vitals.cls, inp: window.__vitals.inp, lt: window.__vitals.longTasks }));
      report.pages.push({
        page: label,
        timeToContentMs,
        clsDelta: +(after.cls - before.cls).toFixed(4),
        inpMs: +after.inp.toFixed(0),
        longTasksDelta: after.lt - before.lt,
      });
      console.log(`  ✓ ${label}: ${timeToContentMs}ms to content, INP≈${after.inp.toFixed(0)}ms, ΔCLS=${(after.cls - before.cls).toFixed(3)}`);
    } catch (e) {
      report.pages.push({ page: label, error: e.message });
      console.log(`  ✗ ${label}: ${e.message}`);
    }
  }

  await browser.close();

  const outFile = path.join(OUT, "frontend_report.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nReport written: ${path.relative(process.cwd(), outFile)}`);
  return report;
}

main().catch((e) => { console.error(e); process.exit(1); });
