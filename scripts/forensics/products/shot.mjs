// Screenshot a page of the local build (offline: every non-localhost request is aborted) and report
// console errors, hydration warnings, failed requests and horizontal overflow.
// node scripts/forensics/products/shot.mjs <url> <out.png|-> [width] [height] [full=1]
import { chromium } from "playwright";
const [url, out, w = "1440", h = "900", full = "1"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const mobile = +w < 600;
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, locale: "en-US", isMobile: mobile, hasTouch: mobile });
const external = new Set();
await ctx.route("**/*", (r) => {
  const u = r.request().url();
  if (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(u)) return r.continue();
  external.add(u.slice(0, 140));
  return r.abort();
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 300)));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type().toUpperCase() + " " + m.text().slice(0, 300)); });
p.on("response", (r) => { if (r.status() >= 400) errs.push(r.status() + " " + r.url().slice(0, 160)); });
await p.goto(url, { waitUntil: "load", timeout: 180000 });
await p.evaluate(() => document.fonts.ready);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 600) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(100); }
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(1200);
const info = await p.evaluate(() => ({ height: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
console.log(JSON.stringify(info));
if (out !== "-") await p.screenshot({ path: out, fullPage: full === "1" });
console.log([...new Set(errs)].slice(0, 30).join("\n"));
if (external.size) console.log("EXTERNAL(blocked):\n" + [...external].slice(0, 20).join("\n"));
await b.close();
