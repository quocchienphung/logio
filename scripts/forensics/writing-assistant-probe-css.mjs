// Dumps the CSS rules, keyframes and computed geometry that the public Writing Assistant preview applies to its own
// `ui-wac` classes, as measurement evidence for a clean-room rebuild.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/writing-assistant";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const rules = await page.evaluate(() => {
  const found = [];
  const walk = (list, wrap = "") => {
    for (const rule of list) {
      if (rule.cssRules && rule.type !== CSSRule.KEYFRAMES_RULE) {
        const head = rule.conditionText ? `@media ${rule.conditionText}` : rule.constructor.name === "CSSContainerRule" ? `@container ${rule.conditionText}` : "";
        walk(rule.cssRules, head || wrap);
      } else if (rule.cssText.includes("ui-wac") || (rule.name || "").includes("wac")) {
        found.push((wrap ? `${wrap} { ` : "") + rule.cssText + (wrap ? " }" : ""));
      }
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch {} }
  return found;
});
await fs.writeFile(`${out}/observed-rules.css`, rules.join("\n\n"));
console.log(rules.length, "rules");
await browser.close();
