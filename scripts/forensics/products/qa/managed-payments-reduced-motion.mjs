// prefers-reduced-motion check for /managed-payments: the globe must render a single static frame (no
// rotation between samples, no arcs/flags), the logo marquee must hold, and the merchant-of-record graphic
// must show its filtered end state without the sequence.
// node scripts/forensics/products/qa/managed-payments-reduced-motion.mjs [outPng]
import { chromium } from "playwright";

const [out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.goto("http://localhost:3101/managed-payments?__forceWebGL", { waitUntil: "load", timeout: 180000 });
await p.waitForFunction(() => document.querySelector(".lazy-hero-globe.lazy-animation--loaded"), null, { timeout: 120000 });
await p.waitForTimeout(1000);
const hero = await p.$(".managed-payments-hero");
const a = await hero.screenshot({ path: out ? out.replace(".png", "-a.png") : undefined });
await p.waitForTimeout(2500);
const b2 = await hero.screenshot({ path: out });
console.log("globe static:", Buffer.compare(a, b2) === 0);
console.log("flags shown:", await p.evaluate(() => [...document.querySelectorAll(".globe__flag-overlay")].filter((f) => f.style.display !== "none").length));
console.log("marquee:", await p.evaluate(() => getComputedStyle(document.querySelector(".logo-carousel__marquee")).transform));
await p.evaluate(() => document.querySelector(".merchant-of-record-graphic-switch--desktop").scrollIntoView({ block: "center" }));
await p.waitForTimeout(300);
console.log("mor:", await p.evaluate(() => [document.querySelector(".merchant-of-record-graphic__filter-chip--active").className.includes("engaged"), document.querySelector(".merchant-of-record-graphic-frame__replay-button").className.includes("visible")]));
console.log("card anim:", await p.evaluate(() => [...document.querySelectorAll(".managed-payments-hero__ui-anim-overlay")].map((c) => getComputedStyle(c).animationName + "/" + getComputedStyle(c).opacity + "/" + matchMedia("(prefers-reduced-motion: reduce)").matches)));
console.log("errors:", errs.join(" | ") || "none");
await b.close();
