import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const URL = process.env.FRONTEND_URL || "http://127.0.0.1:4173";
const ADMIN = { id: "1", username: "admin", email: "a@o.com", role: "Administrator", permissions: {
  feature_flags: { view: true, manage: true, test: true }, experiments: { view: true, manage: true, assign: true, results: true },
  exposures: { view: true }, integration: { view: true }, ai_experiments: { view: true, manage: true, evaluate: true } } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript((j) => localStorage.setItem("optifork_user", j), JSON.stringify(ADMIN));
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(1200);

async function scan(label) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const v = results.violations;
  console.log(`\n[${label}] axe violations: ${v.length}`);
  for (const x of v) {
    console.log(`  - ${x.id} (${x.impact}): ${x.help} [${x.nodes.length} node(s)]`);
    console.log(`    ${x.helpUrl}`);
  }
  return v.length;
}

let total = 0;
total += await scan("Flags table (default)");
// open kill dialog and scan the modal state
const kill = page.getByRole("button", { name: "Kill" }).first();
if (await kill.count()) { await kill.click(); await page.waitForTimeout(400); total += await scan("Kill confirm dialog"); }

await browser.close();
console.log(`\nTOTAL violations: ${total}`);
process.exit(total === 0 ? 0 : 1);
