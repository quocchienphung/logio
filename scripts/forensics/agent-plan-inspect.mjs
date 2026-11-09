// Read-only look at the public affectUI Agent Plan page: text, DOM, the preview's own CSS and screenshots.
// Evidence for a clean-room rebuild only; nothing is copied or called.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/agent-plan";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/components/agent-plan", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/source-page.png`, fullPage: true });
const text = await page.locator("body").innerText();
await fs.writeFile(`${out}/source-text.txt`, text);
const html = await page.content();
await fs.writeFile(`${out}/source-dom.html`, html);
const css = [...html.matchAll(/<style data-href="ui-agent-plan[^"]*"[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
await fs.writeFile(`${out}/observed-rules.css`, css);
const i = text.indexOf("Agent Plan\n", text.indexOf("Get Pro"));
console.log(text.slice(text.indexOf("Components\nAgent Plan"), text.indexOf("Components\nAgent Plan") + 6000));
console.log("css bytes", css.length);
await browser.close();
