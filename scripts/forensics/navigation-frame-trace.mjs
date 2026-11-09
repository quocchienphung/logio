import fs from 'node:fs/promises';
import { chromium } from 'playwright';

/**
 * Presented-frame view of one navigation, from a Chrome trace (compositor PipelineReporter events), so
 * drops in the compositor-run transition show up even when the page's main thread looks idle.
 * Usage: node scripts/forensics/navigation-frame-trace.mjs [base-url] [from] [to] [--reduced] [--lite] [--no-named] [--trace file]
 * --css <rules> adds a stylesheet to every document (experiments).
 * --no-named keeps only the root disc: no per-text / per-media snapshots (experiment).
 */
const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--trace' && args[i - 1] !== '--css');
const base = positional.find(a => a.startsWith('http')) || 'http://localhost:3100';
const [from = '/payments', to = '/'] = positional.filter(a => !a.startsWith('http'));
const reduced = args.includes('--reduced');
const lite = args.includes('--lite');
const noNamed = args.includes('--no-named');
const extraCss = args.includes('--css') ? args[args.indexOf('--css') + 1] : null;
const traceIndex = args.indexOf('--trace');
const traceOut = traceIndex >= 0 ? args[traceIndex + 1] : null;
const WINDOW_MS = 3000;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  if (lite) {
    await context.addInitScript(() => {
      const native = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const list = native(query);
        if (query.includes('max-width: 939px')) Object.defineProperty(list, 'matches', { value: true });
        return list;
      };
    });
  }
  if (noNamed) {
    await context.addInitScript(() => {
      const native = Document.prototype.querySelectorAll;
      Document.prototype.querySelectorAll = function (selector) {
        return typeof selector === 'string' && (selector.startsWith('main h1') || selector.startsWith('main img')) ? native.call(this, ':not(*)') : native.call(this, selector);
      };
    });
  }
  if (extraCss) {
    await context.addInitScript(css => {
      const add = () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };
      if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
    }, extraCss);
  }
  const page = await context.newPage();
  for (const route of [to, from]) await page.goto(base + route, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  await browser.startTracing(page, {
    categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'benchmark', 'gpu', 'viz', 'blink', 'blink.user_timing'],
  });
  const clickedAt = await page.evaluate(href => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = 'audit';
    a.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(a);
    performance.mark('audit-click');
    a.click();
    return Date.now();
  }, to);
  await page.waitForURL(url => new URL(url).pathname === to, { timeout: 60000 });
  await page.waitForTimeout(Math.max(0, WINDOW_MS + 500 - (Date.now() - clickedAt)));
  const buffer = await browser.stopTracing();
  if (traceOut) await fs.writeFile(traceOut, buffer);

  const events = JSON.parse(buffer.toString()).traceEvents;
  const click = events.find(e => e.name === 'audit-click');
  const t0 = click ? click.ts : events.reduce((m, e) => (e.ts && e.ts < m ? e.ts : m), Infinity);
  const end = t0 + WINDOW_MS * 1000;
  const frames = events
    .filter(e => e.name === 'PipelineReporter' && e.ph === 'b' && e.ts >= t0 && e.ts <= end && (e.args?.frame_reporter || e.args?.chrome_frame_reporter))
    .map(e => ({ ts: e.ts, state: (e.args.frame_reporter || e.args.chrome_frame_reporter).state }));
  const droppedInstants = events.filter(e => e.name === 'DroppedFrame' && e.ts >= t0 && e.ts <= end).length;
  const presented = frames.filter(f => f.state === 'STATE_PRESENTED_ALL' || f.state === 'STATE_PRESENTED_PARTIAL').map(f => f.ts).sort((a, b) => a - b);
  const gaps = presented.slice(1).map((ts, i) => (ts - presented[i]) / 1000);
  const byState = frames.reduce((m, f) => ((m[f.state] = (m[f.state] || 0) + 1), m), {});
  // main-thread busy time of the renderer, per 500 ms bucket after the click
  const tasks = events.filter(e => e.name === 'RunTask' && e.ph === 'X' && e.ts >= t0 && e.ts <= end && e.dur > 50000);
  const raster = events.filter(e => e.name === 'RasterDecoderImpl::DoEndRasterCHROMIUM' && e.ph === 'X' && e.ts >= t0 && e.ts <= end);
  const gpu = events.filter(e => (e.name === 'GPUTask' || e.name === 'CommandBufferStub::OnAsyncFlush') && e.ph === 'X' && e.ts >= t0 && e.ts <= end && e.dur > 16000);
  console.log(JSON.stringify({
    nav: `${from} -> ${to}`,
    mode: (reduced ? 'reduced' : lite ? 'lite' : 'full') + (noNamed ? '+no-named' : '') + (extraCss ? '+css' : ''),
    windowMs: WINDOW_MS,
    frameStates: byState,
    droppedFrameEvents: droppedInstants,
    presentedFrames: presented.length,
    gapsOver33ms: gaps.filter(g => g > 33.4).length,
    gapsOver100ms: gaps.filter(g => g > 100).length,
    longestGapMs: Math.round(Math.max(0, ...gaps)),
    longGaps: gaps.map((g, i) => ({ atMs: Math.round((presented[i] - t0) / 1000), ms: Math.round(g) })).filter(g => g.ms > 50),
    gpuRasterMs: Math.round(raster.reduce((sum, e) => sum + e.dur, 0) / 1000),
    mainTasksOver50ms: tasks.map(t => ({ atMs: Math.round((t.ts - t0) / 1000), ms: Math.round(t.dur / 1000) })),
    gpuTasksOver16ms: gpu.map(t => ({ atMs: Math.round((t.ts - t0) / 1000), ms: Math.round(t.dur / 1000) })),
  }));
} finally {
  await browser.close();
}
