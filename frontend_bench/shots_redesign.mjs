import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.FRONTEND_URL || "http://127.0.0.1:4173";
const OUT = path.resolve(__dirname, process.env.OUT || "../docs/ui_redesign");
const ADMIN = { id: "1", username: "admin", email: "a@o.com", role: "Administrator", permissions: {
  feature_flags: { view: true, manage: true, test: true }, experiments: { view: true, manage: true, assign: true, results: true },
  exposures: { view: true }, integration: { view: true }, ai_experiments: { view: true, manage: true, evaluate: true } } };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript((j) => { localStorage.setItem("optifork_user", j); }, JSON.stringify(ADMIN));
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(1200);

async function shot(n) { await page.screenshot({ path: path.join(OUT, n + ".png") }); console.log("  ✓", n); }

await shot("flags-table");

// search
await page.getByLabel("Search flags").fill("checkout");
await page.waitForTimeout(900);
await shot("flags-search");
await page.getByLabel("Search flags").fill("");
await page.waitForTimeout(600);

// kill confirm (first enabled Kill button)
const kill = page.getByRole("button", { name: "Kill" }).first();
if (await kill.count()) { await kill.click(); await page.waitForTimeout(500); await shot("flags-kill-confirm"); }

await browser.close();
console.log("done ->", path.relative(process.cwd(), OUT));
