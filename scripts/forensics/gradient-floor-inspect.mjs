// Read-only look at the public affectUI Gradient Floor motion page: text, DOM, the preview's own CSS and screenshots over time.
// Evidence for a clean-room rebuild only; nothing is copied or called.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/gradient-floor";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/motion/gradient-floor", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/source-page.png`, fullPage: true });
const text = await page.locator("body").innerText();
await fs.writeFile(`${out}/source-text.txt`, text);
await fs.writeFile(`${out}/source-dom.html`, await page.content());
const start = text.indexOf("Gradient Floor", text.indexOf("Motion") + 400);
console.log(text.slice(text.indexOf("Gradient Floor\n"), text.indexOf("Gradient Floor\n") + 5000));
await browser.close();
