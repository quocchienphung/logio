// Second pass over the public Writing Assistant preview: exact timings of the write/stream sequence, which controls are
// disabled while a reply is on its way, focus handling, auto-scroll, multi-turn layout and Shift+Enter growth.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/writing-assistant";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const card = page.locator(".writing-assistant-demo .ui-wac");
const ta = card.locator("textarea");
const log = {};

// Record every mutation of the message list with a timestamp.
await page.evaluate(() => {
  window.__rec = [];
  const root = document.querySelector(".writing-assistant-demo .ui-wac");
  const t0 = performance.now();
  new MutationObserver(() => {
    const m = root.querySelector(".ui-wac__messages");
    const a = m && m.querySelectorAll(".ui-wac__msg--assistant");
    const last = a && a[a.length - 1];
    window.__rec.push({ t: Math.round(performance.now() - t0), html: last ? last.innerHTML : null, scrollTop: m ? Math.round(m.scrollTop) : null, sh: m ? m.scrollHeight : null });
  }).observe(root, { childList: true, subtree: true, characterData: true });
});
await ta.fill("Please shorten this paragraph");
const t0 = await page.evaluate(() => Math.round(performance.now()));
await ta.press("Enter");
await page.waitForTimeout(150);
log.writingHtml = await card.locator(".ui-wac__body").evaluate(el => el.querySelector(".ui-wac__messages").outerHTML);
log.during = {
  micDisabled: await card.locator(".ui-wac__mic").isDisabled(),
  sendExists: await card.locator(".ui-wac__send").count(),
  taDisabled: await ta.isDisabled(),
  taReadonly: await ta.evaluate(el => el.readOnly),
  active: await page.evaluate(() => document.activeElement && document.activeElement.tagName + "." + document.activeElement.className),
  busy: await card.evaluate(el => el.getAttribute("aria-busy")),
};
await page.waitForTimeout(4000);
const rec = await page.evaluate(() => window.__rec);
log.t0 = t0;
log.rec = rec.filter(r => r.html !== null).map(r => ({ t: r.t - 0, words: r.html.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length, text: r.html.replace(/<[^>]*>/g, "").slice(0, 40), st: r.scrollTop, sh: r.sh }));
log.activeAfter = await page.evaluate(() => document.activeElement && document.activeElement.tagName + "." + document.activeElement.className);
log.taValueAfter = await ta.inputValue();

// Multi-turn + auto scroll
for (let i = 0; i < 4; i++) {
  await ta.fill(`Make it shorter ${i}`);
  await ta.press("Enter");
  await page.waitForTimeout(3600);
}
log.multi = await card.locator(".ui-wac__messages").evaluate(el => ({ st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight, n: el.children.length }));
await card.screenshot({ path: `${out}/source-multiturn.png` });

// Shift+Enter growth
await ta.fill("");
await ta.press("Shift+Enter");
log.afterShiftEnter = await ta.evaluate(el => ({ v: el.value, h: el.getBoundingClientRect().height }));
for (let n = 0; n < 7; n++) { await ta.press("Shift+Enter"); await ta.type("x"); }
log.grown = await ta.evaluate(el => ({ h: el.getBoundingClientRect().height, sh: el.scrollHeight }));
await card.screenshot({ path: `${out}/source-grown.png` });

// Whitespace-only does not send
await ta.fill("   ");
log.sendWhenBlank = await card.locator(".ui-wac__send").count();

// Chip while mid-stream / mic while typed text
await card.locator(".ui-wac__new").click();
await page.waitForTimeout(500);
await ta.fill("Draft");
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(700);
log.micWithText = { value: await ta.inputValue(), ph: await ta.getAttribute("placeholder"), pressed: await card.locator(".ui-wac__mic").getAttribute("aria-pressed") };
await page.waitForTimeout(3500);
log.afterMicWithText = await card.locator(".ui-wac__messages").innerText().catch(() => "(none)");
// Escape / click mic again to stop
await card.locator(".ui-wac__new").click();
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(900);
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(600);
log.stopEarly = { value: await ta.inputValue(), messages: await card.locator(".ui-wac__messages").innerText().catch(() => "(none)"), chat: await card.evaluate(el => el.hasAttribute("data-chat")) };

// focus ring & hover shots on welcome
await card.locator(".ui-wac__new").click().catch(() => {});
await page.waitForTimeout(600);
await card.locator(".ui-wac__chip").first().hover();
await page.waitForTimeout(300);
await card.screenshot({ path: `${out}/source-chip-hover.png` });
log.glowBlobs = await card.locator(".ui-wac__blob").evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
log.layout = await card.evaluate(el => {
  const q = s => { const n = el.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(), p = el.getBoundingClientRect(); return { x: +(r.x - p.x).toFixed(1), y: +(r.y - p.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  return { card: q(":scope"), head: q(".ui-wac__head"), body: q(".ui-wac__body"), welcome: q(".ui-wac__welcome"), greeting: q(".ui-wac__greeting"), chips: q(".ui-wac__chips"), row: q(".ui-wac__row"), field: q(".ui-wac__field"), mic: q(".ui-wac__mic") };
});
await fs.writeFile(`${out}/behavior.json`, JSON.stringify(log, null, 2));
await browser.close();
console.log(JSON.stringify({ during: log.during, activeAfter: log.activeAfter, multi: log.multi, afterShift: log.afterShiftEnter, grown: log.grown, blank: log.sendWhenBlank, micWithText: log.micWithText, afterMicWithText: log.afterMicWithText, stopEarly: log.stopEarly, layout: log.layout, blobs: log.glowBlobs }, null, 1));
console.log(log.writingHtml);
const r = log.rec; console.log(r.length, JSON.stringify(r.slice(0, 6)), JSON.stringify(r.slice(-4)));
