import { chromium } from "playwright";
const [base = "http://localhost:3000"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.locator("header.navigation button.navigation-hamburger-button").first().tap();
await p.waitForTimeout(1200);
const info = await p.evaluate(() => {
  const out = [];
  const link = [...document.querySelectorAll("header.navigation a, header.navigation button, body > * a, body > * button")].find((e) => /^Solutions$/.test((e.textContent || "").trim()));
  let el = link;
  const chain = [];
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    chain.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(" ").slice(0, 3).join(".")} bg=${cs.backgroundColor} op=${cs.opacity} pos=${cs.position} z=${cs.zIndex} vis=${cs.visibility} bf=${cs.backdropFilter} rect=${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} anim=${cs.animationName}`);
    el = el.parentElement;
  }
  return chain;
});
console.log(info.join("\n"));
await b.close();
