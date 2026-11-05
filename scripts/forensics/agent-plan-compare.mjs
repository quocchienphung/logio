// Compares measurable geometry of the local plan card with the public Agent Plan preview at the same width (360 CSS px):
// header, marker, grip, remove button, footer, buttons, add row, in review and while running. The step texts differ on
// purpose (invoice process), so rows are compared by structure, not by pixels.
// Usage: node scripts/forensics/agent-plan-compare.mjs [base-url]
import { chromium } from "playwright";
import fs from "node:fs/promises";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/agent-plan/comparison";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

const ref = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await ref.goto("https://www.affectui.com/components/agent-plan", { waitUntil: "networkidle" });
await ref.locator("[aria-label='Reset preview']").first().click();
await ref.addStyleTag({ content: ".ui-plc{width:360px!important;max-width:360px!important}" });
await ref.waitForTimeout(800);

const loc = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
await loc.goto(`${base}/personalize?browse=1&group=sales`, { waitUntil: "networkidle" });
// 1.40625px per unit makes the 256u frame exactly 360 CSS px wide: one design pixel.
await loc.addStyleTag({ content: ".guide-page{--u:1.40625px!important}.guide-floor{display:none!important}nextjs-portal{display:none!important}" });
await loc.waitForTimeout(900);

const probe = (page, sel) => page.evaluate(s => {
  const root = document.querySelector(s.root);
  const base = root.getBoundingClientRect();
  const q = (name, selector, nth = 0) => {
    const el = root.querySelectorAll(selector)[nth];
    if (!el) return [name, null];
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return [name, { x: +(r.x - base.x).toFixed(1), y: +(r.y - base.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), font: cs.fontSize, weight: cs.fontWeight, color: cs.color, radius: cs.borderRadius }];
  };
  return Object.fromEntries([
    ["card", { w: +base.width.toFixed(1), h: +base.height.toFixed(1), radius: getComputedStyle(root).borderRadius }],
    q("head", s.head), q("meta", s.meta), q("title", s.title), q("marker1", s.marker), q("name1", s.name), q("detail1", s.detail), q("tool1", s.tool),
    q("grip1", s.grip), q("remove1", s.remove), q("add", s.add), q("foot", s.foot), q("cancel", s.cancel), q("run", s.run),
  ]);
}, sel);
const refSel = { root: ".ui-plc", head: ".ui-plc__head", meta: ".ui-plc__meta", title: ".ui-plc__title", marker: ".ui-plc__marker", name: ".ui-plc__name", detail: ".ui-plc__detail", tool: ".ui-plc__tool", grip: ".ui-plc__grip", remove: ".ui-plc__remove", add: ".ui-plc__add", foot: ".ui-plc__foot", cancel: ".ui-plc__btn--secondary", run: ".ui-plc__btn--primary" };
const locSel = { root: ".ap", head: ".ap__head", meta: ".ap__meta", title: ".ap__title", marker: ".ap__marker", name: ".ap__name", detail: ".ap__detail", tool: ".ap__tool", grip: ".ap__grip", remove: ".ap__remove", add: ".ap__add", foot: ".ap__foot", cancel: ".ap__btn--secondary", run: ".ap__btn--primary" };

const a = await probe(ref, refSel), b = await probe(loc, locSel);
const rows = [];
let compared = 0, same = 0;
for (const key of Object.keys(a)) {
  const x = a[key], y = b[key];
  if (!x || !y) { rows.push({ key, ref: x ? "yes" : "no", local: y ? "yes" : "no" }); continue; }
  const geometry = ["x", "w", "h"].filter(k => x[k] !== undefined).map(k => Math.abs(x[k] - y[k]) <= 1.2);
  const style = ["font", "weight", "radius"].filter(k => x[k] !== undefined && key !== "card").map(k => x[k] === y[k] || Math.abs(parseFloat(x[k]) - parseFloat(y[k])) < 0.3);
  const ok = geometry.concat(style).every(Boolean);
  compared += 1; if (ok) same += 1;
  rows.push({ key, ref: `${x.x ?? ""},${x.y ?? ""} ${x.w}x${x.h} ${x.font ?? ""}/${x.weight ?? ""}`, local: `${y.x ?? ""},${y.y ?? ""} ${y.w}x${y.h} ${y.font ?? ""}/${y.weight ?? ""}`, match: ok });
}
console.table(rows);
console.log(`structure compared: ${compared}, matching within 1.2px / 0.3px font: ${same}`);
await fs.writeFile(`${out}/geometry.json`, JSON.stringify({ reference: a, local: b, rows }, null, 2));
await ref.locator(".ui-plc").screenshot({ path: `${out}/draft-reference.png` });
await loc.locator(".ap").screenshot({ path: `${out}/draft-local.png` });
await browser.close();
