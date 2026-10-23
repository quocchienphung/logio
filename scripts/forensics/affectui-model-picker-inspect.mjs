// Read-only look at the public affectUI Model Picker documentation page: what the demos show and how they are
// built (DOM, computed styles, motion). Used only as evidence for a clean-room rebuild; nothing is copied or called.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/model-picker";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/model-picker", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/source-page.png`, fullPage: true });
await fs.writeFile(`${out}/source-text.txt`, await page.locator("body").innerText());
await fs.writeFile(`${out}/source-dom.html`, await page.content());
console.log((await page.locator("body").innerText()).slice(0, 6000));
await browser.close();
