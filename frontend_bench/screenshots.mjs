/**
 * Capture OptiFork-today console screenshots on the seeded dataset for UI_BENCHMARK.md.
 * Serves nothing itself — point FRONTEND_URL at a running (built or dev) frontend that
 * talks to a seeded backend on :8000.
 *
 *   FRONTEND_URL=http://localhost:4173 OUT=../docs/ui_baseline node screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4173";
const OUT = path.resolve(__dirname, process.env.OUT || "../docs/ui_baseline");
const [VW, VH] = (process.env.VIEWPORT || "1280x800").split("x").map(Number);

const ADMIN = {
  id: "1", username: "admin", email: "admin@optifork.com", role: "Administrator",
  permissions: {
    feature_flags: { view: true, manage: true, test: true },
    experiments: { view: true, manage: true, assign: true, results: true },
    exposures: { view: true }, integration: { view: true },
    ai_experiments: { view: true, manage: true, evaluate: true },
  },
};

function seedAdmin(adminJson) {
  try {
    localStorage.setItem("optifork_user", adminJson);
    localStorage.setItem("optifork_users", JSON.stringify({ admin: JSON.parse(adminJson) }));
  } catch (e) {}
}

// Viewport-only by default (keeps committed baseline small). Full-page lists on the
// seeded dataset are tens of thousands of px tall — their size is the point, and is
// quantified in UI_BENCHMARK.md rather than committed as multi-MB PNGs.
const FULL_PAGE = process.env.FULL_PAGE === "1";

async function shot(page, name) {
  await page.waitForTimeout(700);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: FULL_PAGE });
  console.log("  ✓", path.relative(process.cwd(), file));
}

async function clickTab(page, label) {
  const t = page.getByText(label, { exact: true }).first();
  if (await t.count()) { await t.click(); await page.waitForTimeout(600); return true; }
  return false;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // 1) Login screen (no admin seeded)
  const ctx0 = await browser.newContext({ viewport: { width: VW, height: VH } });
  const p0 = await ctx0.newPage();
  await p0.goto(FRONTEND_URL, { waitUntil: "load" });
  await shot(p0, "01-login");
  await ctx0.close();

  // 2) Authenticated console
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
  await ctx.addInitScript(seedAdmin, JSON.stringify(ADMIN));
  const page = await ctx.newPage();
  await page.goto(FRONTEND_URL, { waitUntil: "load" });
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch (e) {}

  // Feature Flags — Manage (create form + list of flags on the seeded 10K dataset)
  await shot(page, "02-flags-manage");

  // Flag edit (targeting rules + rollout slider)
  const edit = page.getByRole("button", { name: "Edit" }).first();
  if (await edit.count()) { await edit.click(); await page.waitForTimeout(700); await shot(page, "03-flag-edit");
    const cancel = page.getByRole("button", { name: /Cancel|✕/ }).first();
    if (await cancel.count()) await cancel.click();
  }

  // Test subtab
  if (await clickTab(page, "Test")) await shot(page, "04-flag-test");
  // Exposures subtab
  if (await clickTab(page, "Exposures")) await shot(page, "05-flag-exposures");

  // User Segments
  if (await clickTab(page, "User Segments")) await shot(page, "06-segments");
  // Remote Configs
  if (await clickTab(page, "Remote Configs")) await shot(page, "07-configs");

  // Experiments — Manage then Results
  if (await clickTab(page, "Experiments")) await shot(page, "08-experiments-manage");
  if (await clickTab(page, "Results")) await shot(page, "09-experiments-results");

  await browser.close();
  console.log("Screenshots written to", path.relative(process.cwd(), OUT));
}

main().catch((e) => { console.error(e); process.exit(1); });
