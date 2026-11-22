import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const URL = process.env.FRONTEND_URL || "http://127.0.0.1:4173";
const ADMIN = { id: "1", username: "admin", email: "a@o.com", role: "Administrator", permissions: {
  feature_flags: { view: true, manage: true, test: true }, experiments: { view: true, manage: true, assign: true, results: true },
  exposures: { view: true }, integration: { view: true }, ai_experiments: { view: true, manage: true, evaluate: true } } };

const TABS = ["User Segments", "Remote Configs", "Experiments", "Exposures"];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript((j) => localStorage.setItem("optifork_user", j), JSON.stringify(ADMIN));
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(1000);

async function scan(label) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  console.log(`[${label}] violations: ${r.violations.length}`);
  for (const v of r.violations) console.log(`  - ${v.id} (${v.impact}): ${v.help} [${v.nodes.length}]`);
  return r.violations.length;
}

let total = await scan("Feature Flags");
for (const tab of TABS) {
  const t = page.getByText(tab, { exact: true }).first();
  if (await t.count()) { await t.click(); await page.waitForTimeout(900); total += await scan(tab); }
}
await browser.close();
console.log(`\nTOTAL: ${total}`);
process.exit(total === 0 ? 0 : 1);
