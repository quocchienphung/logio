// Is the hero headline's second sentence visible? Screenshot + computed styles of the headline parts at one width,
// for a touch (phone/tablet) context and a mouse one. node hero-probe.mjs [base] [width] [out]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3100", width = "768", out = "docs/design-references/mobile/hero"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const touch of [true, false]) {
  const ctx = await b.newContext({ viewport: { width: +width, height: 1024 }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(4500);
  await p.screenshot({ path: `${out}/hero-${width}-${touch ? "touch" : "mouse"}.png`, clip: { x: 0, y: 0, width: +width, height: 760 } });
  const info = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll("h1.hero-section__title, h1.hero-section__title--foreground").forEach((h) => {
      const cs = getComputedStyle(h);
      out.push(`${h.className.split(" ").join(".")} color=${cs.color} blend=${cs.mixBlendMode} op=${cs.opacity} h=${Math.round(h.getBoundingClientRect().height)}`);
      h.querySelectorAll("[class*=title]").forEach((c) => { const s = getComputedStyle(c); out.push(`   ${c.className.split(" ")[0]} display=${s.display} color=${s.color} op=${s.opacity} vis=${s.visibility} w=${Math.round(c.getBoundingClientRect().width)} text="${(c.textContent || "").slice(0, 40)}"`); });
    });
    const words = [...document.querySelectorAll(".sr-word")];
    out.push(`sr-words ${words.length}, opacity of first/last: ${words.length ? getComputedStyle(words[0]).opacity + "/" + getComputedStyle(words[words.length - 1]).opacity : "-"}, last anim=${words.length ? getComputedStyle(words[words.length - 1]).animationName : "-"}`);
    out.push("pointer coarse: " + matchMedia("(pointer: coarse)").matches + ", hover none: " + matchMedia("(hover: none)").matches);
    return out.join("\n");
  });
  console.log(`--- ${touch ? "touch" : "mouse"} @${width}\n${info}`);
  await ctx.close();
}
await b.close();
