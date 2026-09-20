// Download every asset referenced by the frozen DOM into public/stripe and write a URL → local map.
// node download-assets.mjs [dom.html ...]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const files = process.argv.slice(2).length ? process.argv.slice(2) : ["docs/research/stripe-live/dom-1440.html"];
const OUT = "public/stripe";
const MAP = "docs/research/stripe-live/asset-map.json";
fs.mkdirSync(OUT, { recursive: true });
const map = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, "utf8")) : {};

const urls = new Set();
for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  for (const m of html.matchAll(/\b(?:src|href|poster|data-src)="(https:\/\/[^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]+)"/g)) for (const part of m[1].split(",")) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith("https://")) urls.add(u); }
  for (const m of html.matchAll(/url\((?:&quot;|"|')?(https:\/\/[^"')&]+)/g)) urls.add(m[1]);
}
const ASSET = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|woff2?|json|riv)(\?|$)/i;
const HOSTS = /^(https:\/\/(images\.stripeassets\.com|b\.stripecdn\.com|assets\.stripeassets\.com|stripe\.com\/img|d1wqzb5bdbcre6\.cloudfront\.net|videos\.ctfassets\.net|images\.ctfassets\.net))/;
const wanted = [...urls].filter((u) => ASSET.test(u) && HOSTS.test(u) && !u.includes("/mkt-ssr-statics/assets/_next/static/chunks/"));
console.log(`${wanted.length} asset urls`);

const decode = (s) => s.replace(/&amp;/g, "&");
const localName = (u) => {
  const url = new URL(decode(u));
  const base = path.basename(url.pathname).replace(/[^\w.-]/g, "_");
  const ext = (base.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
  const stem = base.slice(0, base.length - ext.length).slice(0, 48);
  const h = crypto.createHash("sha1").update(decode(u)).digest("hex").slice(0, 8);
  const q = url.searchParams;
  const realExt = q.get("fm") === "webp" ? ".webp" : q.get("fm") === "avif" ? ".avif" : ext;
  const size = q.get("w") ? `-w${q.get("w")}` : "";
  return `${stem}${size}-${h}${realExt}`;
};

let n = 0;
for (const u of wanted) {
  const key = decode(u);
  if (map[key] && fs.existsSync(path.join("public", map[key]))) continue;
  const name = localName(u);
  const dest = path.join(OUT, name);
  try {
    const res = await fetch(key, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) { console.error("FAIL", res.status, key); continue; }
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    map[key] = `/stripe/${name}`;
    n++;
  } catch (e) {
    console.error("ERR", key, e.message);
  }
}
fs.writeFileSync(MAP, JSON.stringify(map, null, 2));
console.log(`downloaded ${n}, map has ${Object.keys(map).length} entries`);
