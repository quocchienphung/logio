// Frame timing of the page-to-page transition, measured in the incoming document from `pagereveal` to
// 300 ms after the end of the view transition: frame count, fps, longest frame, frames over 20 ms, long animation
// frames (LoAF) and how long the incoming document took to be revealed after the click.
// node scripts/forensics/page-transition/perf.mjs [base] [runs] [w] [h]
import { chromium } from "playwright";
const [base = "http://localhost:3000", runs = "3", w = "1440", h = "900"] = process.argv.slice(2);

const ALL_ROUTES = [
  ["/payments", "Tax"],
  ["/tax", "Billing"],
  ["/billing", "Payments"],
];
const ROUTES = process.env.PT_ROUTE ? ALL_ROUTES.filter(([f]) => f === process.env.PT_ROUTE) : ALL_ROUTES;

const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
// (no request interception: it turns speculation-rules prerendering off)
// PT_OFF=filter|mask|named switches part of the effect off, to see what each costs
if (process.env.PT_OFF) {
  const css = {
    filter: "html::view-transition-old(*),html::view-transition-new(*){filter:none!important}",
    mask: "html::view-transition-new(*){mask:none!important}",
    named: "main *{view-transition-name:none!important}",
    "filter-old": "html::view-transition-old(root){filter:none!important}",
    "filter-new": "html::view-transition-new(root){filter:none!important}",
    "filter-named": "html::view-transition-new(*.pt-text),html::view-transition-new(*.pt-media){filter:none!important}",
  }[process.env.PT_OFF];
  await ctx.addInitScript((css) => {
    const add = () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    };
    if (document.head) add();
    else document.addEventListener("readystatechange", add, { once: true });
  }, css);
}
await ctx.addInitScript(() => {
  const m = { frames: [], loaf: [], revealAt: 0, endAt: 0, ran: false };
  window.__pt = m;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) m.loaf.push({ start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0, scripts: (e.scripts || []).map((s) => `${Math.round(s.duration)}ms ${s.invokerType} ${s.invoker} ${(s.sourceURL || "").split("/").pop()}:${s.sourceFunctionName}`) });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
  window.addEventListener("pagereveal", (e) => {
    m.revealAt = performance.now();
    const nav = performance.getEntriesByType("navigation")[0];
    m.prerendered = !!(nav && nav.activationStart > 0);
    const vt = e.viewTransition;
    if (!vt) return;
    m.ran = true;
    // the runtime's own pagereveal listener runs after this one: read what it set up a task later
    setTimeout(() => {
      m.filters = Array.from(document.querySelectorAll("svg filter")).map((f) => `${f.id}:${f.getAttribute("width")}x${f.getAttribute("height")}`);
    }, 0);
    let done = false;
    const loop = (t) => {
      m.frames.push(t);
      if (!done) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // keep counting for 300 ms after the transition: its clean-up lands in the first frames after it
    vt.finished.finally(() => {
      m.vtEnd = performance.now();
      setTimeout(() => {
        done = true;
        m.endAt = performance.now();
      }, 300);
    });
  });
});

const p = await ctx.newPage();
const gl = await p.evaluate(() => {
  const c = document.createElement("canvas").getContext("webgl");
  const ext = c && c.getExtension("WEBGL_debug_renderer_info");
  return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log("renderer:", gl);

const all = [];
for (let run = 0; run < +runs; run++) {
  for (const [from, label] of ROUTES) {
    await p.goto(base + from, { waitUntil: "load" });
    await p.waitForTimeout(1500);
    const t = p.getByRole("button", { name: "Products" }).first();
    const bb = await t.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.waitForSelector(".navigation__content--products a", { state: "visible" });
    const link = p.locator(".navigation__content--products a", { hasText: label }).first();
    await link.hover();
    await p.waitForTimeout(1500); // moderate prerender starts after a 200 ms hover
    const clickAt = await p.evaluate(() => performance.timeOrigin + performance.now());
    await link.click({ noWaitAfter: true });
    await p.waitForFunction(() => window.__pt && window.__pt.endAt > 0, null, { timeout: 15000 }).catch(() => {});
    const m = await p.evaluate(() => ({ ...window.__pt, origin: performance.timeOrigin }));
    const gaps = m.frames.slice(1).map((f, i) => f - m.frames[i]);
    const dur = m.vtEnd - m.revealAt;
    const loaf = m.loaf.filter((e) => e.start + e.dur >= m.revealAt - 50 && e.start <= m.endAt);
    const r = {
      route: `${from} -> ${label}`,
      ran: m.ran,
      prerendered: m.prerendered,
      revealMs: Math.round(m.origin + m.revealAt - clickAt),
      durMs: Math.round(dur),
      frames: m.frames.length,
      fps: +((1000 * gaps.length) / (m.frames[m.frames.length - 1] - m.frames[0] || 1)).toFixed(1),
      maxFrame: +Math.max(0, ...gaps).toFixed(1),
      over20: gaps.filter((g) => g > 20).length,
      loafMs: Math.round(loaf.reduce((s, e) => s + e.dur, 0)),
      loafMax: Math.round(Math.max(0, ...loaf.map((e) => e.dur))),
    };
    all.push(r);
    console.log(JSON.stringify(r));
    if (process.env.PT_FILTERS) console.log("   filters", (m.filters || []).join(" "));
    if (process.env.PT_GAPS) console.log("   gaps>20", gaps.map((g, i) => [Math.round(m.frames[i + 1] - m.revealAt), Math.round(g)]).filter(([, g]) => g > 20).map(([t, g]) => `${g}@${t}`).join(" "));
    if (process.env.PT_LOAF) for (const e of loaf.filter((e) => e.dur > 40)) console.log("   loaf", Math.round(e.start - m.revealAt), Math.round(e.dur), "render", Math.round(e.render), "style+layout", Math.round(e.style), e.scripts.join(" | "));
  }
}
const avg = (k) => (all.reduce((s, r) => s + r[k], 0) / all.length).toFixed(1);
console.log(`avg fps=${avg("fps")} maxFrame=${avg("maxFrame")} over20=${avg("over20")} loafMs=${avg("loafMs")} revealMs=${avg("revealMs")}`);
await b.close();
