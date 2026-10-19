// Visual cadence of the whole transition as the user sees it: the browser's screencast emits a frame each time
// the page visibly changes, so the gaps between frames are the stalls (unlike rAF gaps in the new document, this
// keeps counting while its main thread is busy, which is what the compositor-run transition is built for).
// node scripts/forensics/page-transition/frames.mjs [base] [from] [menuLabel] [runs]
import { chromium } from "playwright";
const [base = "http://localhost:3000", from = "/billing", label = "Payments", runs = "3"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const sum = [];
for (let run = 0; run < +runs; run++) {
  await p.goto(base + from, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const t = p.getByRole("button", { name: "Products" }).first();
  const bb = await t.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.waitForSelector(".navigation__content--products a", { state: "visible" });
  const link = p.locator(".navigation__content--products a", { hasText: label }).first();
  await link.hover();
  await p.waitForTimeout(1500);
  const frames = [];
  cdp.removeAllListeners("Page.screencastFrame");
  cdp.on("Page.screencastFrame", (e) => {
    frames.push(e.metadata.timestamp * 1000);
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 20, maxWidth: 480, maxHeight: 300, everyNthFrame: 1 });
  await p.waitForTimeout(300);
  const t0 = Date.now();
  await link.click({ noWaitAfter: true });
  await p.waitForTimeout(2600);
  await cdp.send("Page.stopScreencast");
  // only the transition: from the first frame after the click until the visuals go quiet
  const moving = frames.filter((f) => f >= frames[0] + 300);
  let first = moving[0];
  let end = moving[moving.length - 1];
  const gaps = moving.slice(1).map((f, i) => f - moving[i]).filter((g) => g < 1500);
  const r = { run, frames: moving.length, spanMs: Math.round(end - first), maxGap: Math.round(Math.max(0, ...gaps)), over50: gaps.filter((g) => g > 50).length, over100: gaps.filter((g) => g > 100).length, over200: gaps.filter((g) => g > 200).length };
  sum.push(r);
  console.log(JSON.stringify(r));
}
await b.close();
