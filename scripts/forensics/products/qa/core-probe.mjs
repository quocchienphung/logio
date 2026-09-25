// QA probe for the "core" controller group: load a local page with WebGL (SwiftShader) enabled,
// optionally scroll, then evaluate an expression. Offline: every non-localhost request is aborted.
// node scripts/forensics/products/qa/core-probe.mjs <url> '<js expr>' [width=1440] [height=900] [scrollY=0] [waitMs=1500]
import { chromium } from "playwright";

const [url, expr, w = "1440", h = "900", scrollY = "0", wait = "1500"] = process.argv.slice(2);
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const mobile = +w < 600;
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
if (process.env.QA_SPOOF) {
  // Report a hardware renderer so the GPU paths (disabled on SwiftShader, as in the reference) run.
  await ctx.addInitScript(() => {
    for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const orig = C.prototype.getParameter;
      C.prototype.getParameter = function (p) {
        return p === 0x9246 ? "ANGLE (QA hardware spoof)" : orig.call(this, p);
      };
    }
  });
}
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 300)));
p.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errs.push(m.type().toUpperCase() + " " + m.text().slice(0, 300));
});
await p.goto(url, { waitUntil: "load", timeout: 180000 });
if (+scrollY) {
  await p.evaluate((y) => window.scrollTo(0, y), +scrollY);
}
await p.waitForTimeout(+wait);
console.log(JSON.stringify(await p.evaluate(expr), null, 1));
if (errs.length) console.log([...new Set(errs)].join("\n"));
await b.close();
