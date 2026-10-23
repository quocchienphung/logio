// Drives the public Agent Plan preview: reset to review, DOM of each phase, the run timeline (step statuses, timers,
// footer text) sampled every frame, rename/remove/add/reorder and keyboard behaviour. Evidence only.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/agent-plan";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/components/agent-plan", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const root = page.locator(".ui-plc").first();
const log = {};
log.initialRunning = await root.evaluate(el => el.outerHTML);
await root.screenshot({ path: `${out}/source-running.png` });
await page.locator(".stage__reset, [aria-label='Reset preview']").first().click();
await page.waitForTimeout(900);
await root.screenshot({ path: `${out}/source-draft.png` });
log.draft = await root.evaluate(el => ({ status: el.dataset.status, html: el.outerHTML, box: el.getBoundingClientRect().toJSON() }));
log.geometry = await root.evaluate(el => { const q = s => { const n = el.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(), p = el.getBoundingClientRect(); return [+(r.x - p.x).toFixed(1), +(r.y - p.y).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)]; }; return { card: q(".ui-plc__card"), head: q(".ui-plc__head"), list: q(".ui-plc__list"), step: q(".ui-plc__step"), marker: q(".ui-plc__marker"), add: q(".ui-plc__add"), foot: q(".ui-plc__foot"), btn: q(".ui-plc__btn--primary") }; });
// hover first step
await root.locator(".ui-plc__step").first().hover();
await page.waitForTimeout(300);
await root.screenshot({ path: `${out}/source-hover.png` });
// rename
await root.locator(".ui-plc__step").nth(1).focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(250);
await root.screenshot({ path: `${out}/source-rename.png` });
log.renameHtml = await root.locator(".ui-plc__step").nth(1).evaluate(el => el.outerHTML);
await page.keyboard.type(" (edited)");
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
log.afterRename = await root.locator(".ui-plc__name").allInnerTexts();
// move with Alt+ArrowDown
await root.locator(".ui-plc__step").nth(1).focus();
await page.keyboard.press("Alt+ArrowDown");
await page.waitForTimeout(700);
log.afterMove = await root.locator(".ui-plc__name").allInnerTexts();
log.live = await root.locator("[aria-live]").allInnerTexts();
// delete
await root.locator(".ui-plc__step").nth(4).focus();
await page.keyboard.press("Delete");
await page.waitForTimeout(700);
log.afterDelete = await root.locator(".ui-plc__name").allInnerTexts();
log.liveAfterDelete = await root.locator("[aria-live]").allInnerTexts();
// add
await root.locator(".ui-plc__add input").fill("Archive the deck");
await root.locator(".ui-plc__add input").press("Enter");
await page.waitForTimeout(600);
log.afterAdd = await root.locator(".ui-plc__name").allInnerTexts();
log.addFocused = await page.evaluate(() => document.activeElement.tagName + ":" + (document.activeElement.placeholder || ""));
await root.screenshot({ path: `${out}/source-draft-edited.png` });
log.footDraft = await root.locator(".ui-plc__foot").evaluate(el => el.outerHTML);
// run
await page.evaluate(() => { window.__rec = []; const r = document.querySelector(".ui-plc"); const t0 = performance.now(); const read = () => ({ t: Math.round(performance.now() - t0), status: r.dataset.status, steps: [...r.querySelectorAll(".ui-plc__step")].map(s => s.dataset.step + ":" + (s.querySelector(".ui-plc__time")?.textContent || "")), foot: r.querySelector(".ui-plc__foot").innerText.replace(/\n/g, " | "), phase: r.querySelector(".ui-plc__foot").dataset.phase, meta: r.querySelector(".ui-plc__meta").innerText.replace(/\n/g, " | ") }); let prev = ""; (function loop() { const x = read(); const k = JSON.stringify({ ...x, t: 0 }); if (k !== prev) { window.__rec.push(x); prev = k; } requestAnimationFrame(loop); })(); });
await root.locator(".ui-plc__btn--primary").click();
await page.waitForTimeout(700);
await root.screenshot({ path: `${out}/source-run-start.png` });
log.runHtml = await root.evaluate(el => el.outerHTML);
await page.waitForTimeout(16000);
log.timeline = await page.evaluate(() => window.__rec);
await root.screenshot({ path: `${out}/source-done.png` });
log.doneHtml = await root.locator(".ui-plc__foot").evaluate(el => el.outerHTML);
await fs.writeFile(`${out}/probe.json`, JSON.stringify(log, null, 1));
console.log(JSON.stringify({ geometry: log.geometry, afterRename: log.afterRename, afterMove: log.afterMove, live: log.live, afterDelete: log.afterDelete, liveAfterDelete: log.liveAfterDelete, afterAdd: log.afterAdd, addFocused: log.addFocused }, null, 1));
for (const r of log.timeline) console.log(r.t, r.status, r.phase, JSON.stringify(r.steps), "|", r.foot, "|", r.meta);
await browser.close();
