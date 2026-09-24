// Sweep every product route at the four comparison viewports on a local server: page height, horizontal
// overflow (and the widest offending element), console errors/warnings, hydration errors, failed requests.
// node scripts/forensics/products/qa/sweep.mjs [base=http://localhost:3000] [out.json] [shotsDir]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "docs/research/products/_build/sweep.json";
const shots = process.argv[4] || "";
const ROUTES = ["/payments", "/managed-payments", "/payments/payment-links", "/payments/checkout", "/payments/elements", "/payments/payment-methods", "/terminal", "/authorization-boost", "/payments/link", "/financial-connections", "/billing", "/billing/usage-based-billing", "/billing/subscriptions", "/invoicing", "/tax", "/revenue-recognition", "/sigma", "/data-pipeline"];
const VPS = [[1440, 900], [1280, 800], [768, 1024], [390, 844]];
const only = process.env.ROUTES ? process.env.ROUTES.split(",") : null;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const result = {};
for (const route of ROUTES.filter((r) => !only || only.includes(r))) {
  for (const [w, h] of VPS) {
    const mobile = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: "en-US" });
    await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 200)));
    p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
    p.on("response", (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().slice(0, 140)}`); });
    try {
      await p.goto(base + route, { waitUntil: "load", timeout: 180000 });
      await p.evaluate(() => document.fonts.ready);
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 700) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(60); }
      await p.evaluate(() => scrollTo(0, 0));
      await p.waitForTimeout(600);
      const info = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        let worst = null;
        if (document.documentElement.scrollWidth > vw) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.right > vw + 1 && r.width > 0) {
              const cs = getComputedStyle(el);
              if (cs.position === "fixed") continue;
              if (!worst || r.right > worst.right) worst = { right: Math.round(r.right), cls: (el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().slice(0, 80) };
            }
          }
        }
        return { height: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, worst };
      });
      if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.screenshot({ path: path.join(shots, `${route.slice(1).replace(/\//g, "--")}-${w}.png`), fullPage: true }); }
      result[`${route}@${w}`] = { ...info, overflow: info.scrollWidth > info.clientWidth, errors: [...new Set(errs)] };
    } catch (e) {
      result[`${route}@${w}`] = { error: String(e).slice(0, 200), errors: errs };
    }
    const r = result[`${route}@${w}`];
    console.log(`${route}@${w}: h=${r.height} overflow=${r.overflow ? r.scrollWidth + " " + JSON.stringify(r.worst) : "no"} errors=${r.errors.length}`);
    await ctx.close();
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 1));
await b.close();
