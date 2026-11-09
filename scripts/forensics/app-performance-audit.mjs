import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3100';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const route of ['/', '/personalize', '/personalize?section=reports']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.perfAudit = { frames: [], longTasks: [] };
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.perfAudit.longTasks.push({ at: entry.startTime, ms: entry.duration });
      }).observe({ type: 'longtask', buffered: true });
      let last;
      const tick = now => {
        if (last !== undefined) window.perfAudit.frames.push({ at: now, ms: now - last });
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 120000 });
    if (!response?.ok()) throw new Error(`Invalid audit response: ${response?.status()} ${route}`);
    await page.locator('main').waitFor();
    const samples = [];
    for (const y of route === '/' ? [0, 1600, 3400, 4800, 10000] : [0]) {
      const start = await page.evaluate(y => { scrollTo(0, y); return performance.now(); }, y);
      await page.waitForTimeout(4000);
      samples.push(await page.evaluate(({ start, y }) => {
        const frames = window.perfAudit.frames.filter(f => f.at >= start).map(f => f.ms).sort((a, b) => a - b);
        return { y, actualY: scrollY, p95FrameMs: frames[Math.floor(frames.length * .95)], framesOver33ms: frames.filter(f => f > 33.4).length, longTasks: window.perfAudit.longTasks.filter(t => t.at >= start) };
      }, { start, y }));
    }
    const metrics = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      const resources = performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script');
      return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, nodes: document.querySelectorAll('*').length, scriptsEncodedBytes: resources.reduce((sum, r) => sum + r.encodedBodySize, 0), scriptsDecodedBytes: resources.reduce((sum, r) => sum + r.decodedBodySize, 0), longTasks: window.perfAudit.longTasks, canvases: [...document.querySelectorAll('canvas')].map(c => ({ width: c.width, height: c.height, className: c.className })) };
    });
    const result = { route, samples, metrics, errors };
    results.push(result);
    console.log(JSON.stringify(result));
    await page.close();
  }
  await fs.mkdir('docs/research/performance', { recursive: true });
  await fs.writeFile('docs/research/performance/audit.json', JSON.stringify({ base, environment: 'Chrome headless, 1440x1000, native GPU, no CPU throttling; rAF intervals are not presented-frame FPS', results }, null, 2));
} finally {
  await browser.close();
}
