// Find JS-driven animations on the live page: sample inline styles/classes of every element at
// intervals while each section is in view and report which elements change.
// node animation-inventory.mjs <url|live> <vp> <scrollY> [samples] [intervalMs]
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const [u, vp, y, samples = "6", interval = "700"] = process.argv.slice(2);
const browser = await launch();
const { page } = await newPage(browser, VIEWPORTS[vp]);
await page.goto(u === "live" ? "https://stripe.com/" : u, { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie]{display:none!important}" });
await page.evaluate((y) => window.scrollTo(0, y), +y);
await page.waitForTimeout(1200);
const snap = () =>
  page.evaluate(() => {
    const out = {};
    const vh = window.innerHeight;
    document.querySelectorAll("*").forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const st = el.getAttribute("style") || "";
      const cls = el.className && typeof el.className === "string" ? el.className : "";
      const txt = el.children.length === 0 ? (el.textContent || "").slice(0, 40) : "";
      out[i + ":" + el.tagName] = { cls, st, txt };
    });
    return out;
  });
const snaps = [];
for (let i = 0; i < +samples; i++) {
  snaps.push(await snap());
  await page.waitForTimeout(+interval);
}
await browser.close();
const changed = new Map();
for (let i = 1; i < snaps.length; i++) {
  for (const k of Object.keys(snaps[i])) {
    const a = snaps[i - 1][k], b = snaps[i][k];
    if (!a) continue;
    if (a.st !== b.st || a.cls !== b.cls || a.txt !== b.txt) {
      const key = (b.cls || a.cls).split(" ").slice(0, 3).join(" ") || k;
      const e = changed.get(key) || { n: 0, styles: new Set(), classes: new Set(), texts: new Set() };
      e.n++;
      if (a.st !== b.st) e.styles.add(b.st.slice(0, 90));
      if (a.cls !== b.cls) e.classes.add(b.cls.split(" ").filter((c) => !a.cls.includes(c)).join(" "));
      if (a.txt !== b.txt) e.texts.add(b.txt);
      changed.set(key, e);
    }
  }
}
for (const [k, e] of [...changed.entries()].sort((x, y) => y[1].n - x[1].n)) {
  console.log(`${String(e.n).padStart(3)}  ${k}`);
  for (const s of [...e.styles].slice(0, 3)) console.log(`       style: ${s}`);
  for (const c of [...e.classes].slice(0, 3)) if (c) console.log(`       +class: ${c}`);
  for (const t of [...e.texts].slice(0, 2)) console.log(`       text: ${t}`);
}
