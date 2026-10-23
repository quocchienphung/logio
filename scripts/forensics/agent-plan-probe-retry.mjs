// Second pass over the public Agent Plan preview: the failed step, Retry from here, the done footer, Run again, Cancel,
// and dragging a step. Evidence only.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/agent-plan";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/components/agent-plan", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.locator("[aria-label='Reset preview']").first().click();
await page.waitForTimeout(700);
const root = page.locator(".ui-plc").first();
// drag step 1 below step 3 and sample the live reorder
const first = root.locator(".ui-plc__step").first();
const box = await first.locator(".ui-plc__grip").boundingBox();
await page.mouse.move(box.x + 8, box.y + 10);
await page.mouse.down();
await page.mouse.move(box.x + 8, box.y + 60, { steps: 6 });
await page.waitForTimeout(150);
await root.screenshot({ path: `${out}/source-drag.png` });
const dragState = await root.evaluate(el => ({ dragging: el.hasAttribute("data-dragging"), steps: [...el.querySelectorAll(".ui-plc__step")].map(s => [s.querySelector(".ui-plc__name").textContent, s.hasAttribute("data-dragging"), s.style.cssText]) }));
await page.mouse.move(box.x + 8, box.y + 140, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(700);
const afterDrag = await root.locator(".ui-plc__name").allInnerTexts();
await page.locator("[aria-label='Reset preview']").first().click();
await page.waitForTimeout(700);
await root.locator(".ui-plc__btn--primary").click();
await page.waitForFunction(() => document.querySelector(".ui-plc__foot")?.dataset.phase === "failed", null, { timeout: 15000 });
await page.waitForTimeout(600);
await root.screenshot({ path: `${out}/source-failed.png` });
const failed = await root.evaluate(el => ({ foot: el.querySelector(".ui-plc__foot").outerHTML, step: el.querySelector("[data-step=failed]").outerHTML, meta: el.querySelector(".ui-plc__meta").outerHTML }));
await page.evaluate(() => { window.__rec = []; const r = document.querySelector(".ui-plc"); const t0 = performance.now(); let prev = ""; (function loop() { const x = { t: Math.round(performance.now() - t0), status: r.dataset.status, steps: [...r.querySelectorAll(".ui-plc__step")].map(s => s.dataset.step + ":" + (s.querySelector(".ui-plc__time")?.textContent || "")), foot: r.querySelector(".ui-plc__foot").innerText.replace(/\n/g, " | "), phase: r.querySelector(".ui-plc__foot").dataset.phase, meta: r.querySelector(".ui-plc__meta").innerText.replace(/\n/g, " | ") }; const k = JSON.stringify({ ...x, t: 0, steps: x.steps.map(s => s.replace(/active:[\d.]+s/, "active")) }); if (k !== prev) { window.__rec.push(x); prev = k; } requestAnimationFrame(loop); })(); });
await root.getByText("Retry from here").click();
await page.waitForTimeout(12000);
const rec = await page.evaluate(() => window.__rec);
await root.screenshot({ path: `${out}/source-done.png` });
const done = await root.evaluate(el => ({ foot: el.querySelector(".ui-plc__foot").outerHTML, live: [...el.querySelectorAll("[aria-live]")].map(n => n.textContent), steps: [...el.querySelectorAll(".ui-plc__step")].map(s => s.outerHTML.length) }));
// Run again
let again = "no Run again";
try { await root.getByText("Run again").click({ timeout: 3000 }); await page.waitForTimeout(1200); } catch {}
again = await root.evaluate(el => [el.dataset.status, el.querySelector(".ui-plc__foot").innerText.replace(/\n/g, " | "), [...el.querySelectorAll(".ui-plc__step")].map(s => s.dataset.step).join(",")]);
await fs.writeFile(`${out}/probe-retry.json`, JSON.stringify({ dragState, afterDrag, failed, rec, done, again }, null, 1));
console.log(JSON.stringify({ dragState, afterDrag, again }, null, 1));
console.log(failed.foot); console.log(failed.step);
for (const r of rec) console.log(r.t, r.status, r.phase, JSON.stringify(r.steps.map(s => s.replace(/:[\d.]+s$/, ":*"))), "|", r.foot, "|", r.meta);
console.log(done.foot, JSON.stringify(done.live));
await browser.close();
