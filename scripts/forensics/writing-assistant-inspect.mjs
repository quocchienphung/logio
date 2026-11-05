// Read-only look at the public affectUI Writing Assistant documentation page: what the demo shows, its DOM and motion.
// Used only as evidence for a clean-room rebuild; nothing is copied or called.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/writing-assistant";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/source-page.png`, fullPage: true });
await fs.writeFile(`${out}/source-text.txt`, await page.locator("body").innerText());
await fs.writeFile(`${out}/source-dom.html`, await page.content());
console.log((await page.locator("body").innerText()).slice(0, 8000));
await browser.close();
