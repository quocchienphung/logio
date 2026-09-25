// Build the route stylesheets for the 18 product pages from the captured stripe.com CSS.
//
//   v1 (legacy "mkt-statics-srv" pages): every inline <style> block and linked/lazy v1-*.css file,
//      scoped under .v1-root so it cannot touch the shared navigation/footer (html/:root -> .v1-html,
//      body -> .v1-body), keyframes renamed where they collide with the homepage, colours mapped to
//      the monochrome system.
//   hds (Next.js pages sharing the homepage design system): the page's own stylesheets minus every
//      rule already shipped by the homepage partition and minus navigation/footer rules, so the shared
//      chrome is identical on every route; colours mapped to monochrome.
//
// Inputs : docs/research/products/_build/manifest.json (build_pages.py), $MIRROR (downloaded CSS),
//          docs/research/stripe-live/css/all.css (homepage stylesheet, for de-duplication)
// Output : src/styles/stripe/products/{v1-<slug>.css, hds-<slug>.css, v1-base.css}
// Run    : node scripts/forensics/products/build_css.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { transform as lcss } from "lightningcss";
import postcss from "postcss";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const MIRROR = process.env.MIRROR || "/home/user/mirror";
const OUT = path.join(ROOT, "src/styles/stripe/products");
const PUB_DIR = path.join(ROOT, "public/sites/stripe-com-9ababc9a/products");
const PUB_URL = "/sites/stripe-com-9ababc9a/products";
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/research/products/_build/manifest.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------------------------
// assets (same naming as build_pages.py)
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
function mirrorPath(u) {
  const p = new URL(u);
  let pth = decodeURIComponent(p.pathname);
  if (pth.endsWith("/")) pth += "index";
  let lp = path.join(MIRROR, p.host, pth.replace(/^\//, ""));
  if (p.search.length > 1) lp += "__" + sha1(p.search.slice(1)).slice(0, 8);
  return lp;
}
function extFor(u) {
  const p = new URL(u);
  const fm = p.searchParams.get("fm");
  if (fm) return fm;
  const base = p.pathname.split("/").pop();
  return base.includes(".") ? base.split(".").pop().toLowerCase().slice(0, 5) : "bin";
}
const missing = new Set();
function localize(u) {
  const lp = mirrorPath(u);
  if (!fs.existsSync(lp)) {
    missing.add(u);
    return u;
  }
  const stem = (new URL(u).pathname.split("/").pop().replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 48).replace(/^-+|-+$/g, "")) || "asset";
  const name = `${stem}-${sha1(u).slice(0, 10)}.${extFor(u)}`;
  const dst = path.join(PUB_DIR, name);
  fs.mkdirSync(PUB_DIR, { recursive: true });
  if (!fs.existsSync(dst)) fs.copyFileSync(lp, dst);
  return `${PUB_URL}/${name}`;
}
function mapUrls(css, base) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (u.startsWith("data:") || u.startsWith("#")) return m;
    let abs;
    try {
      abs = new URL(u, base).href;
    } catch {
      return m;
    }
    if (!/^https:\/\/(b\.stripecdn\.com|images\.stripeassets\.com|videos\.stripeassets\.com|assets\.stripeassets\.com)\//.test(abs)) return m;
    return `url("${localize(abs)}")`;
  });
}
const readLink = (u) => {
  const lp = mirrorPath(u);
  if (!fs.existsSync(lp)) {
    missing.add(u);
    return "";
  }
  return mapUrls(fs.readFileSync(lp, "utf8"), u);
};

// ---------------------------------------------------------------------------------------------
// monochrome colour mapping (mirrors scripts/mono-assets.py: luminance for neutrals, the designed
// hue -> luminance curve for saturated graphic colours; accents are handled by role in V1_MONO)
const LIGHT_KEYS = [[0, 0.54], [25, 0.63], [45, 0.72], [70, 0.78], [150, 0.76], [200, 0.82], [235, 0.72], [255, 0.4], [270, 0.26], [290, 0.28], [310, 0.34], [330, 0.42], [350, 0.5], [360, 0.54]];
const interp = (x, keys) => {
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [x0, y0] = keys[i - 1];
      const [x1, y1] = keys[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return keys[keys.length - 1][1];
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function monoValue(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const c = mx - mn;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (c < 0.12) return lum;
  let h;
  if (mx === r) h = (((g - b) / c) % 6 + 6) % 6;
  else if (mx === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  h *= 60;
  const l = (mx + mn) / 2;
  const hv = interp(h, LIGHT_KEYS);
  const w = smooth(0.08, 0.55, c);
  const hue = Math.min(1, Math.max(0, l * (1 - w) + hv * (0.7 + 0.55 * l) * w));
  // blend towards plain luminance for mid chroma so near-neutrals keep their value
  const t = smooth(0.12, 0.35, c);
  return lum * (1 - t) + hue * t;
}
const hex2 = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
function grey(v, a) {
  const h = hex2(v);
  if (a === undefined || a >= 1) return `#${h}${h}${h}`;
  return `rgba(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)},${+a.toFixed(3)})`;
}
function hsl2rgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const NAMED = { white: [1, 1, 1], black: [0, 0, 0] };
const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\([^()]*\)|hsla?\([^()]*\)/g;
function monoColor(tok) {
  let r, g, b, a;
  if (tok[0] === "#") {
    let h = tok.slice(1);
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
    a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : undefined;
  } else {
    const nums = tok.slice(tok.indexOf("(") + 1, -1).split(/[\s,/]+/).filter(Boolean);
    if (nums.some((n) => n.includes("var") || n.includes("calc"))) return tok;
    const num = (s, scale) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s) / scale);
    if (tok.startsWith("rgb")) {
      [r, g, b] = nums.slice(0, 3).map((n) => num(n, 255));
    } else {
      const hh = parseFloat(nums[0]);
      [r, g, b] = hsl2rgb(hh, num(nums[1], 100), num(nums[2], 100));
    }
    if (nums[3] !== undefined) a = num(nums[3], 1);
  }
  if ([r, g, b].some((x) => Number.isNaN(x))) return tok;
  return grey(monoValue(r, g, b), a);
}
const monoText = (v) => v.replace(COLOR_RE, monoColor);

function monoDecls(root) {
  root.walkDecls((d) => {
    if (/url\(/.test(d.value) && !/gradient/.test(d.value)) return;
    const nv = monoText(d.value);
    if (nv !== d.value) d.value = nv;
  });
}

// ---------------------------------------------------------------------------------------------
// homepage signatures (for hds de-duplication) and keyframe names (for v1 collisions)
function ctxOf(node) {
  const chain = [];
  let p = node.parent;
  while (p && p.type !== "root") {
    if (p.type === "atrule") chain.push(`@${p.name} ${p.params}`);
    p = p.parent;
  }
  return chain.reverse().join("|");
}
const sig = (rule) => ctxOf(rule) + "::" + rule.selector.replace(/\s+/g, " ") + "::" + rule.nodes.map((n) => String(n).replace(/\s+/g, " ")).join(";");
const home = postcss.parse(fs.readFileSync(path.join(ROOT, "docs/research/stripe-live/css/all.css"), "utf8"));
const homeSigs = new Set();
const homeKeyframes = new Set();
home.walkRules((r) => {
  if (r.parent?.type === "atrule" && /keyframes/.test(r.parent.name)) return;
  homeSigs.add(sig(r));
});
home.walkAtRules(/keyframes/, (a) => homeKeyframes.add(a.params));
for (const f of fs.readdirSync(path.join(ROOT, "src/styles/stripe/generated"), { recursive: true })) {
  if (!String(f).endsWith(".css")) continue;
  const s = fs.readFileSync(path.join(ROOT, "src/styles/stripe/generated", String(f)), "utf8");
  for (const m of s.matchAll(/@keyframes\s+([\w-]+)/g)) homeKeyframes.add(m[1]);
}

// navigation / footer class prefixes owned by the shared chrome (see scripts/forensics/partition-css.mjs)
const CHROME = ["navigation-hover-arrow", "navigation-hamburger", "navigation-menu-header", "navigation-menu-footer", "navigation-menu-home-link", "navigation-menu-overflow", "locale-switcher", "link-brand-logo", "mobile-safari-solid-bars", "navigation", "navigation-item", "navigation-menu", "navigation-menu-list", "navigation-hamburger-button", "hds-navigation-menu", "personalize-banner", "navigation-mobile", "guide-me", "footer", "footer-links-block", "hds-globalization-picker", "footer-links", "footer-links-section", "footer-bottom", "sessions-banner"];
const chromeRe = new RegExp(`\\.(${CHROME.map((c) => c.replace(/[-]/g, "\\-")).join("|")})(?![\\w-])`);
const isChromeOnly = (sel) => sel.split(",").every((s) => chromeRe.test(s));

// Browsers drop a whole rule when any selector in its list is invalid; Next's CSS parser errors
// instead. Remove such rules up front so the build sees exactly what a browser applies.
const invalidDropped = [];
function dropInvalidRules(root) {
  root.walkRules((r) => {
    if (r.parent?.type === "atrule" && /keyframes/.test(r.parent.name)) return;
    try {
      const res = lcss({ filename: "x.css", code: Buffer.from(`${r.selector}{}`), errorRecovery: true });
      if (res.warnings.length) {
        invalidDropped.push(r.selector.slice(0, 160));
        r.remove();
      }
    } catch {
      invalidDropped.push(r.selector.slice(0, 160));
      r.remove();
    }
  });
}

// ---------------------------------------------------------------------------------------------
// v1 scoping
function scopeSelector(sel) {
  let s = sel.trim();
  if (!s) return s;
  // document roots
  s = s.replace(/^(html|:root)(?=[\s.:#[>+~]|$)/, ".v1-html");
  s = s.replace(/^\.v1-html\s+body(?=[\s.:#[>+~]|$)/, ".v1-html .v1-body");
  s = s.replace(/^body(?=[\s.:#[>+~]|$)/, ".v1-body");
  s = s.replace(/(^|[\s>+~])html\.MktRoot/g, "$1.v1-html.MktRoot");
  s = s.replace(/(^|[\s>+~])body\./g, "$1.v1-body.");
  if (s.startsWith(".v1-html") || s.startsWith(".MktRoot")) return `.v1-root ${s}`;
  return `.v1-root ${s}`;
}
function scopeRoot(root, renames) {
  root.walkRules((r) => {
    if (r.parent?.type === "atrule" && /keyframes/.test(r.parent.name)) return;
    r.selectors = r.selectors.map(scopeSelector);
  });
  root.walkAtRules(/keyframes/, (a) => {
    if (homeKeyframes.has(a.params)) {
      renames.set(a.params, `v1-${a.params}`);
      a.params = `v1-${a.params}`;
    }
  });
  if (renames.size) {
    root.walkDecls(/^(animation|animation-name)$/, (d) => {
      for (const [from, to] of renames) d.value = d.value.replace(new RegExp(`(^|[\\s,])${from}(?=$|[\\s,])`, "g"), `$1${to}`);
    });
  }
}

// The homepage ships an element-level reset (svg/img display:block, list-style:none, margin:0 …) in
// @layer reset/base. The legacy pages were authored against the UA stylesheet, so revert those
// declarations inside .v1-root at zero-class specificity: any legacy rule still wins over the guard.
function resetGuard() {
  const out = [];
  const files = ["generated/foundation.css", "generated/tokens.css", "overrides.css", "mono.css"].map((f) => path.join(ROOT, "src/styles/stripe", f));
  for (const f of files) {
    postcss.parse(fs.readFileSync(f, "utf8")).walkRules((r) => {
      if (r.parent?.type === "atrule" && /keyframes/.test(r.parent.name)) return;
      const sels = r.selectors.filter((x) => !/[.#[]/.test(x) && !/^(html|:root|body|template)\b/.test(x.trim()) && !/:lang/.test(x));
      if (!sels.length) return;
      const props = r.nodes.filter((n) => n.type === "decl" && !n.prop.startsWith("--")).map((n) => n.prop);
      if (!props.length) return;
      let media = "";
      for (let q = r.parent; q && q.type !== "root"; q = q.parent) if (q.type === "atrule" && q.name === "media") media = q.params;
      const rule = `${sels.map((x) => `:where(.v1-root) ${x.trim()}`).join(", ")} { ${[...new Set(props)].map((pp) => `${pp}: revert;`).join(" ")} }`;
      out.push(media ? `@media ${media} { ${rule} }` : rule);
    });
  }
  return "/* ---- homepage reset guard (generated) ---- */\n" + [...new Set(out)].join("\n") + "\n";
}

// Theme roles: accents -> near-black on light themes, near-white on dark (matches homepage mono.css).
const V1_MONO = `
/* ---- monochrome roles (hand-written; see docs/research/MONOCHROME_SYSTEM.md) --------------- */
.v1-root .v1-body, .v1-root [class*="accent--"], .v1-root .theme--Light, .v1-root .theme--White {
  --accentColor: #111111; --guideBackground: #2c2c2c; --guideDarkColor: #111111;
  --guideLightColor: #525252; --guideLighterColor: #707070; --guideLightestColor: #929292;
  --linkHoverColor: #525252; --buttonHoverColor: #383838;
}
.v1-root .theme--Dark, .v1-root .theme--Dark[class*="accent--"], .v1-root .theme--Dark [class*="accent--"] {
  --accentColor: #ededed; --guideBackground: #c6c6c6; --guideDarkColor: #ededed;
  --guideLightColor: #b5b5b5; --guideLighterColor: #a3a3a3; --guideLightestColor: #929292;
  --linkHoverColor: #ffffff; --buttonHoverColor: #ffffff; --knockoutColor: #111111;
}
.v1-root .theme--Dark .theme--Light, .v1-root .theme--Dark .theme--White {
  --accentColor: #111111; --linkHoverColor: #525252; --buttonHoverColor: #383838; --knockoutColor: #ffffff;
}
`;

// ---------------------------------------------------------------------------------------------
const pages = Object.values(manifest);
const report = {};

// v1: one base stylesheet shared by the legacy pages (inline + linked + lazily loaded CSS)
{
  const v1 = pages.filter((p) => p.stack === "v1");
  const parts = [];
  const seenText = new Set();
  const seenLinks = new Set();
  for (const p of v1) {
    for (const t of p.css.inline) {
      const k = t.trim();
      if (!k || seenText.has(k)) continue;
      seenText.add(k);
      parts.push(mapUrls(t, "https://stripe.com/"));
    }
  }
  for (const p of v1) {
    for (const u of p.css.links) {
      if (seenLinks.has(u)) continue;
      seenLinks.add(u);
      parts.push(readLink(u));
    }
  }
  // lazily loaded component CSS (injected by the reference's loader after hydration)
  const dir = path.join(MIRROR, "b.stripecdn.com/mkt-statics-srv/assets");
  const byComponent = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".css")).sort()) {
    const comp = f.replace(/-[a-f0-9]{20}\.css$/, "");
    const url = `https://b.stripecdn.com/mkt-statics-srv/assets/${f}`;
    if (seenLinks.has(url)) {
      byComponent.set(comp, "linked");
      continue;
    }
    if (byComponent.has(comp)) continue;
    byComponent.set(comp, url);
  }
  for (const [, u] of byComponent) if (u !== "linked") parts.push(readLink(u));
  const root = postcss.parse(parts.join("\n"));
  dropInvalidRules(root);
  const renames = new Map();
  scopeRoot(root, renames);
  monoDecls(root);
  root.raws.semicolon = true;
  const out = "/* Generated by scripts/forensics/products/build_css.mjs from the stripe.com legacy-stack CSS captured 2026-09-24.\n   Scoped under .v1-root; colours mapped to the monochrome system. Do not hand-edit — overrides live in v1-overrides.css. */\n" + resetGuard() + root.toString() + V1_MONO;
  fs.writeFileSync(path.join(OUT, "v1-base.css"), out);
  report.v1 = { bytes: out.length, keyframeRenames: [...renames.keys()] };
  for (const p of v1) {
    const f = path.join(OUT, `v1-${p.slug}-overrides.css`);
    if (!fs.existsSync(f)) fs.writeFileSync(f, `/* Hand-written fixes for ${p.path} only (loaded after v1-base.css and v1-overrides.css). */\n`);
  }
  const ov = path.join(OUT, "v1-overrides.css");
  if (!fs.existsSync(ov)) fs.writeFileSync(ov, "/* Hand-written fixes for the legacy-stack pages (integration with the shared chrome, mono tweaks). */\n");
}

// hds: per page, minus homepage + chrome rules
for (const p of pages.filter((p) => p.stack === "hds")) {
  const css = p.css.links.map(readLink).join("\n") + "\n" + p.css.inline.map((t) => mapUrls(t, "https://stripe.com/")).join("\n");
  const root = postcss.parse(css);
  dropInvalidRules(root);
  let dropped = 0;
  let chrome = 0;
  root.walkRules((r) => {
    if (r.parent?.type === "atrule" && /keyframes/.test(r.parent.name)) return;
    if (homeSigs.has(sig(r))) {
      r.remove();
      dropped++;
      return;
    }
    if (isChromeOnly(r.selector)) {
      r.remove();
      chrome++;
    }
  });
  // token declarations are owned by mono.css
  root.walkDecls(/^--hds-color-/, (d) => d.remove());
  root.walkAtRules((a) => {
    if (a.nodes && a.nodes.length === 0) a.remove();
  });
  root.walkRules((r) => {
    if (r.nodes.length === 0) r.remove();
  });
  root.walkAtRules(/keyframes/, (a) => {
    if (homeKeyframes.has(a.params)) a.remove();
  });
  monoDecls(root);
  // always terminate the last statement (a trailing `@layer a, b` would swallow the next file's first rule)
  root.raws.semicolon = true;
  const body = root.toString();
  const fixed = `/* Generated by scripts/forensics/products/build_css.mjs: ${p.path} stylesheets captured 2026-09-24, minus the rules the\n   homepage partition already ships and minus navigation/footer rules. Colours mapped to monochrome.\n   Do not hand-edit: fixes go in hds-${p.slug}-overrides.css (imported after this file by the route). */\n${body}\n`;
  fs.writeFileSync(path.join(OUT, `hds-${p.slug}.css`), fixed);
  const ov = path.join(OUT, `hds-${p.slug}-overrides.css`);
  if (!fs.existsSync(ov)) fs.writeFileSync(ov, `/* Hand-written fixes for ${p.path} (mono tweaks, integration). */\n`);
  report[p.slug] = { bytes: fixed.length, droppedHomepage: dropped, droppedChrome: chrome };
}
report.missing = [...missing];
report.invalidDropped = invalidDropped;
console.log(JSON.stringify(report, null, 1));
