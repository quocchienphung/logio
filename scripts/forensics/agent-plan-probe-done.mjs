// Third pass: markup of a finished step, the done footer and the Run again button (the preview resets itself soon after).
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/agent-plan";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/components/agent-plan", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.locator("[aria-label='Reset preview']").first().click();
await page.waitForTimeout(600);
const root = page.locator(".ui-plc").first();
await root.locator(".ui-plc__btn--primary").click();
await page.waitForFunction(() => document.querySelector(".ui-plc__foot")?.dataset.phase === "failed", null, { timeout: 15000 });
await root.getByText("Retry from here").click();
await page.waitForFunction(() => document.querySelector(".ui-plc__foot")?.dataset.phase === "done", null, { timeout: 15000 });
await page.waitForTimeout(500);
const r = await root.evaluate(el => ({ foot: el.querySelector(".ui-plc__foot").outerHTML, step: el.querySelector("[data-step=done]").outerHTML, meta: el.querySelector(".ui-plc__meta").outerHTML, live: el.querySelector("[aria-live]").textContent, rail: getComputedStyle(el.querySelector(".ui-plc__rail"), "::after").transform, status: el.dataset.status }));
await root.screenshot({ path: `${out}/source-done-final.png` });
await fs.writeFile(`${out}/probe-done.json`, JSON.stringify(r, null, 1));
console.log(r.foot); console.log(r.step); console.log(r.meta); console.log(r.live, r.status);
// the failed step's retry in the draft-edit: how long before it resets
const t0 = Date.now();
await page.waitForFunction(() => document.querySelector(".ui-plc")?.dataset.status === "draft", null, { timeout: 15000 }).catch(() => {});
console.log("auto reset after ms:", Date.now() - t0, await root.evaluate(el => el.dataset.status));
await browser.close();
