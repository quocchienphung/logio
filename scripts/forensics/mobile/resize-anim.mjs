// Does a viewport resize / rotation restart the hero headline animation? Counts running .sr-word animations and
// their currentTime before and after resizing. node resize-anim.mjs [base] [fromW,fromH] [toW,toH]
import { chromium } from "playwright";
const [base = "http://localhost:3100", from = "390,844", to = "390,5000"] = process.argv.slice(2);
const [fw, fh] = from.split(",").map(Number);
const [tw, th] = to.split(",").map(Number);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: fw, height: fh }, deviceScaleFactor: 1, isMobile: fw < 900, hasTouch: fw < 900 });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(5000);
const st = (label) => p.evaluate((label) => {
  const anims = document.getAnimations().filter((a) => a.animationName === "sr-word-in");
  const words = [...document.querySelectorAll(".sr-word")];
  return `${label}: sr animations=${anims.length} states=${[...new Set(anims.map((a) => a.playState))].join(",")} firstCurrentTime=${anims[0] ? Math.round(anims[0].currentTime) : "-"} wordsHidden=${words.filter((w) => +getComputedStyle(w).opacity < 0.99).length}/${words.length}`;
}, label);
console.log(await st(`before (${fw}x${fh})`));
await p.setViewportSize({ width: tw, height: th });
await p.waitForTimeout(300);
console.log(await st(`after resize to ${tw}x${th}`));
await p.waitForTimeout(3500);
console.log(await st("3.5s later"));
await p.setViewportSize({ width: fw, height: fh });
await p.waitForTimeout(300);
console.log(await st(`back to ${fw}x${fh}`));
await b.close();
