// Measure elements on the live reference or the local build.
// node measure.mjs <url|live> <viewport> "<selector>" ["<selector>" ...] [--all] [--scroll Y] [--children]
// Prints rect + key computed styles for each match. "live" = https://stripe.com/.
import { launch, newPage, sweep, VIEWPORTS } from "./browser.mjs";

const args = process.argv.slice(2);
const url = args[0] === "live" ? "https://stripe.com/" : args[0];
const vp = VIEWPORTS[args[1]];
const all = args.includes("--all");
const children = args.includes("--children");
const si = args.indexOf("--scroll");
const scrollY = si >= 0 ? +args[si + 1] : null;
const sels = args.slice(2).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--scroll");

const PROPS = [
  "display", "position", "top", "left", "right", "bottom", "width", "height", "maxWidth", "minHeight", "padding", "margin",
  "gap", "rowGap", "columnGap", "gridTemplateColumns", "gridTemplateRows", "gridColumn", "gridRow", "flexDirection", "flex",
  "alignItems", "justifyContent", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontFeatureSettings",
  "color", "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "borderRadius", "border", "borderTop",
  "borderBottom", "borderLeft", "borderRight", "boxShadow", "transform", "transformOrigin", "perspective", "opacity", "overflow",
  "zIndex", "mixBlendMode", "textAlign", "whiteSpace", "objectFit", "aspectRatio", "filter", "clipPath", "transition",
];
const SKIP = new Set(["none", "normal", "auto", "0px", "rgba(0, 0, 0, 0)", "static", "visible", "1", "0%", "0px 0px", "row", "start", "stretch", "flex-start", "0 1 auto", "all"]);

const browser = await launch();
const { page } = await newPage(browser, vp);
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie],[class*=CookieConsent]{display:none!important}" });
if (scrollY == null) await sweep(page);
else {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(600);
}
const res = await page.evaluate(
  ([sels, all, children, PROPS, SKIP]) => {
    const skip = new Set(SKIP);
    const out = [];
    const measure = (el, sel) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const css = {};
      for (const p of PROPS) {
        const v = cs[p];
        if (v && !skip.has(v)) css[p] = v;
      }
      out.push({
        sel,
        tag: el.tagName,
        cls: typeof el.className === "string" ? el.className : el.className?.baseVal ?? "",
        rect: { x: +r.x.toFixed(1), y: +(r.y + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        css,
        text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      });
    };
    for (const sel of sels) {
      const els = all ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)].filter(Boolean);
      if (!els.length) out.push({ sel, missing: true });
      for (const el of els) {
        measure(el, sel);
        if (children) for (const c of el.children) measure(c, sel + " > " + c.tagName.toLowerCase());
      }
    }
    return out;
  },
  [sels, all, children, PROPS, [...SKIP]],
);
await browser.close();
for (const r of res) {
  if (r.missing) {
    console.log("MISSING", r.sel);
    continue;
  }
  console.log(`\n${r.sel} → <${r.tag.toLowerCase()} class="${String(r.cls).slice(0, 90)}">  rect x=${r.rect.x} y=${r.rect.y} w=${r.rect.w} h=${r.rect.h}`);
  console.log("  " + Object.entries(r.css).map(([k, v]) => `${k}=${v.length > 140 ? v.slice(0, 140) + "…" : v}`).join(" | "));
  if (r.text) console.log("  text: " + r.text);
}
