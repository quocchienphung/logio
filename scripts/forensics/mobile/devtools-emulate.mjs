// What the DevTools device toolbar does: Emulation.setDeviceMetricsOverride / clearDeviceMetricsOverride on a page
// that is already loaded. After each switch: layout state, hero animation state (restarts?), scrollWidth, canvases.
// node devtools-emulate.mjs [base]
import { chromium } from "playwright";
const [base = "http://localhost:3100"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(5000);
const st = (label) => p.evaluate((label) => {
  const anims = document.getAnimations().filter((a) => a.animationName === "sr-word-in");
  const words = [...document.querySelectorAll(".hero-section__title--background .sr-word")];
  const hidden = words.filter((w) => w.getBoundingClientRect().width > 0 && +getComputedStyle(w).opacity < 0.99).length;
  return `${label.padEnd(34)} inner=${innerWidth}x${innerHeight} scrollW=${document.documentElement.scrollWidth} docH=${document.documentElement.scrollHeight} heroWordsMidAnimation=${hidden} srAnims=${anims.length}(${[...new Set(anims.map((a) => a.playState))]}) menuBtn=${getComputedStyle(document.querySelector(".navigation-hamburger-button")).display}`;
}, label);
console.log(await st("desktop 1440x900 (loaded)"));
const set = (width, height, mobile) => cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
await set(390, 844, true);
await p.waitForTimeout(400);
console.log(await st("-> emulate iPhone 390x844 mobile"));
await p.waitForTimeout(3500);
console.log(await st("   3.5s later"));
await set(768, 1024, true);
await p.waitForTimeout(400);
console.log(await st("-> emulate iPad 768x1024 mobile"));
await p.waitForTimeout(3500);
console.log(await st("   3.5s later"));
await set(844, 390, true);
await p.waitForTimeout(400);
console.log(await st("-> rotate 844x390 mobile"));
await p.waitForTimeout(3500);
console.log(await st("   3.5s later"));
await cdp.send("Emulation.clearDeviceMetricsOverride");
await p.waitForTimeout(400);
console.log(await st("-> back to desktop"));
await p.waitForTimeout(3500);
console.log(await st("   3.5s later"));
await b.close();
