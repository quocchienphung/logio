// Where does the iPhone Duo's CSS3D screen end up? Rects / transforms of the overlay tree in Chromium vs WebKit.
// node duo-probe.mjs [base]
import { chromium, devices, webkit } from "playwright";
const [base = "http://localhost:3100"] = process.argv.slice(2);
const run = async (name, launcher, opts) => {
  const b = await launcher.launch(opts.launch || {});
  const ctx = await b.newContext(opts.ctx);
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelector(".iphone-duo")?.scrollIntoView({ block: "center" }));
  await p.waitForTimeout(3500);
  const info = await p.evaluate(() => {
    const duo = document.querySelector(".iphone-duo");
    if (!duo) return "no .iphone-duo";
    const rect = (e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`; };
    const out = [`duo ${rect(duo)} status=${duo.dataset.status}`];
    const canvas = duo.querySelector("canvas");
    out.push(`canvas ${canvas ? rect(canvas) + " attr " + canvas.width + "x" + canvas.height : "none"}`);
    const ov = duo.querySelector(".iphone-duo__overlay");
    if (ov) {
      out.push(`overlay ${rect(ov)} z=${getComputedStyle(ov).zIndex} pos=${getComputedStyle(ov).position} pe=${getComputedStyle(ov).pointerEvents}`);
      let e = ov.firstElementChild, d = 0;
      while (e && d < 4) { const cs = getComputedStyle(e); out.push(`${"  ".repeat(d + 1)}${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} ${rect(e)} tf=${(e.style.transform || cs.transform).slice(0, 110)} ts=${cs.transformStyle} persp=${cs.perspective}`); e = e.firstElementChild; d++; }
    }
    const scr = duo.querySelector(".phone-screen, [class*=screen]");
    out.push(`screen el ${scr ? scr.className + " " + rect(scr) : "none"}`);
    return out.join("\n");
  });
  console.log(`--- ${name}\n${info}`);
  await b.close();
};
await run("chromium", chromium, { launch: { channel: "chrome", headless: true }, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
await run("webkit", webkit, { ctx: { ...devices["iPhone 14"] } });
