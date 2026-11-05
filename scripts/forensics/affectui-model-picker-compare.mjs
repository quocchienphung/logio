// Compares the rebuilt model picker with the public affectUI Model Picker preview: computed styles of matching
// parts (size, spacing, type, colors, radius, shadow) with the menu open on both, plus a screenshot of each.
// Usage: node scripts/forensics/affectui-model-picker-compare.mjs [local-base-url]
import { chromium } from "playwright";
import fs from "node:fs/promises";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/model-picker/comparison";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const props = ["width", "height", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "color", "backgroundColor", "borderRadius", "boxShadow", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "gap", "opacity", "borderTopWidth", "borderTopColor"];
// [part, reference selector, local selector]. Rows are compared on the same kind of row (a rated model, the router).
const parts = [
  ["trigger", ".ui-mdpc__trigger", ".mp__trigger"], ["trigger glyph", ".ui-mdpc__trigger .ui-mdpc__glyph", ".mp__trigger .mp__glyph"], ["trigger name", ".ui-mdpc__name", ".mp__name"],
  ["menu", ".ui-mdpc__pop", ".mp__pop"], ["menu padding", ".ui-mdpc__card", ".mp__card"], ["header", ".ui-mdpc__head", ".mp__head"], ["header column", ".ui-mdpc__cols > span", ".mp__cols > span"],
  ["row", ".ui-mdpc__option", ".mp__option"], ["row glyph", ".ui-mdpc__option .ui-mdpc__glyph", ".mp__option .mp__glyph"], ["row title", ".ui-mdpc__title", ".mp__title"], ["row description", ".ui-mdpc__desc", ".mp__desc"],
  ["bars", ".ui-mdpc__bars", ".mp__bars"], ["meter", ".ui-mdpc__meter", ".mp__meter"], ["lit segment", ".ui-mdpc__option[data-lit] .ui-mdpc__seg[data-on]", ".mp__option[data-lit] .mp__seg[data-on]"], ["unlit row segment", ".ui-mdpc__option:not([data-lit]) .ui-mdpc__seg[data-on]", ".mp__option:not([data-lit]) .mp__seg[data-on]"], ["off segment", ".ui-mdpc__option:not([data-lit]) .ui-mdpc__seg:not([data-on])", ".mp__option:not([data-lit]) .mp__seg:not([data-on])"],
  ["settings block", ".ui-mdpc__settings", ".mp__settings"], ["switch row", ".ui-mdpc__toggle", ".mp__toggle"], ["switch icon", ".ui-mdpc__toggle-icon", ".mp__toggle-icon"], ["switch label", ".ui-mdpc__toggle-label", ".mp__toggle-label"], ["switch track", ".ui-mdpc__switch", ".mp__switch"],
  ["footer", ".ui-mdpc__foot", ".mp__foot"], ["caption", ".ui-mdpc__caption", ".mp__caption"], ["caption figure", ".ui-mdpc__caption b", ".mp__caption b"], ["key hint", ".ui-mdpc__keys kbd", ".mp__keys kbd"],
];
const measure = (page, list, side) => page.evaluate(([entries, names, which]) => Object.fromEntries(entries.map(([part, referenceSelector, localSelector]) => {
  const element = document.querySelector(which === "ref" ? referenceSelector : localSelector);
  if (!element) return [part, null];
  const style = getComputedStyle(element), box = element.getBoundingClientRect();
  return [part, Object.fromEntries(names.map(name => [name, name === "width" ? `${Math.round(box.width * 10) / 10}px` : name === "height" ? `${Math.round(box.height * 10) / 10}px` : style[name]]))];
})), [list, props, side]);

const reference = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await reference.goto("https://www.affectui.com/components/model-picker", { waitUntil: "networkidle" });
await reference.waitForTimeout(1500);
const demo = reference.locator(".mdp-demo").first();
await demo.scrollIntoViewIfNeeded(); await reference.waitForTimeout(500);
await reference.mouse.move(5, 5); await reference.waitForTimeout(400);
await reference.locator('.ui-mdpc__option[id$="-opt-haiku"]').hover(); await reference.waitForTimeout(900);
await demo.screenshot({ path: `${out}/reference-open.png` });
const expected = await measure(reference, parts, "ref");

const mine = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await mine.goto(`${base}/personalize?section=new-chat`, { waitUntil: "networkidle" });
await mine.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await mine.locator(".mp__trigger").click(); await mine.waitForTimeout(800);
await mine.mouse.move(5, 5); await mine.waitForTimeout(400);
await mine.locator('.mp__option[data-id="claude-haiku-5-5"]').hover(); await mine.waitForTimeout(900);
await mine.screenshot({ path: `${out}/local-open.png`, clip: { x: 700, y: 400, width: 420, height: 620 } });
const actual = await measure(mine, parts, "mine");

// The preview is a card of 360 px with a different send button; mine sits in the Logio composer. Parts that
// depend on that context (the menu's own width and height follow its content) are compared on what they share.
let same = 0; const different = [];
for (const [part] of parts) {
  const a = expected[part], b = actual[part];
  if (!a || !b) { different.push(`${part}: ${a ? "missing locally" : "missing in the reference"}`); continue; }
  const diffs = props.filter(name => a[name] !== b[name]);
  if (!diffs.length) same++; else different.push(`${part}: ${diffs.map(name => `${name} ${a[name]} -> ${b[name]}`).join("; ")}`);
}
await fs.writeFile(`${out}/computed-styles.json`, JSON.stringify({ reference: expected, local: actual }, null, 2));
console.log(`${same} of ${parts.length} parts match on all ${props.length} measured properties.`);
console.log(different.join("\n") || "No differences.");
await browser.close();
