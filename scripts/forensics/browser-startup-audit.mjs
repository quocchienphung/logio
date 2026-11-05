import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// A diagnostic control: denying WebGL isolates part of its startup cost, but also
// changes the rendered scene. This is not a proposed production implementation.
const base = process.argv[2] || 'http://localhost:3100';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const variant of ['full', 'no-webgl', 'full', 'no-webgl']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({ denyWebgl }) => {
      const audit = window.startupAudit = { tasks: [], loafs: [], contexts: [], frames: [] };
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (!['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return getContext.call(this, type, ...args);
        if (denyWebgl) return null;
        const start = performance.now();
        const context = getContext.call(this, type, ...args);
        audit.contexts.push({ className: this.className, start, ms: performance.now() - start });
        return context;
      };
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) audit.tasks.push({ at: e.startTime, ms: e.duration });
      }).observe({ type: 'longtask', buffered: true });
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) audit.loafs.push({
            at: e.startTime, ms: e.duration,
            styleLayoutMs: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
            scripts: e.scripts.map(s => ({
              ms: s.duration, invoker: s.invoker,
              function: s.sourceFunctionName, source: s.sourceURL.replace(location.origin, ''),
              forcedLayoutMs: s.forcedStyleAndLayoutDuration,
            })).filter(s => s.ms > 5),
          });
        }).observe({ type: 'long-animation-frame', buffered: true });
      } catch {}
      let previous;
      const tick = now => {
        if (previous !== undefined) audit.frames.push({ at: now, ms: now - previous });
        previous = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { denyWebgl: variant === 'no-webgl' });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    const metrics = await cdp.send('Performance.getMetrics');
    const result = await page.evaluate(({ variant, metrics }) => {
      const a = window.startupAudit;
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        variant,
        responseStartMs: nav.responseStart,
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        measuredUntilMs: performance.now(),
        tasksTotalMs: a.tasks.reduce((sum, t) => sum + t.ms, 0),
        blockingOver50Ms: a.tasks.reduce((sum, t) => sum + Math.max(0, t.ms - 50), 0),
        worstTaskMs: Math.max(0, ...a.tasks.map(t => t.ms)),
        framesOver33ms: a.frames.filter(f => f.ms > 33.4).length,
        contexts: a.contexts,
        longTasks: a.tasks,
        loafs: a.loafs,
        cpu: Object.fromEntries(metrics.filter(m => ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'TaskDuration'].includes(m.name)).map(m => [m.name, m.value])),
      };
    }, { variant, metrics: metrics.metrics });
    results.push(result);
    console.log(JSON.stringify({ ...result, loafs: undefined, longTasks: undefined }));
    await context.close();
  }
  await fs.mkdir('docs/research/performance', { recursive: true });
  await fs.writeFile('docs/research/performance/browser-startup.json', JSON.stringify({
    base,
    environment: 'Chrome headless on this machine, production build, 1440x1000, DPR 1, no CPU/network throttle; rAF intervals are not presented-frame FPS. Fresh contexts per sample; OS shader and asset caches may be warm. Two runs per variant are diagnostic, not a stable benchmark.',
    results,
  }, null, 2));
} finally {
  await browser.close();
}
