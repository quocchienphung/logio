import fs from 'node:fs/promises';
import { chromium } from 'playwright';

/**
 * Measures page-to-page navigations (cross-document view transition + the incoming page's start-up).
 * Usage: node scripts/forensics/navigation-performance-audit.mjs [base-url] [--reduced | --lite] [--out file]
 * --reduced skips the transition (prefers-reduced-motion); --lite forces its phone variant (no SVG lens filters).
 * Per navigation it records, in the incoming document: long tasks, long animation frames (with script
 * attribution), rAF intervals, when the transition finished and whether back/forward used the bfcache.
 */
const args = process.argv.slice(2);
const base = args.find(a => a.startsWith('http')) || 'http://localhost:3100';
const reduced = args.includes('--reduced');
const lite = args.includes('--lite');
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? args[outIndex + 1] : null;
const WINDOW_MS = 5000;

const init = () => {
  const audit = { frames: [], longTasks: [], loafs: [], reveal: null, settled: null, persisted: null };
  window.navAudit = audit;
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) audit.longTasks.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) });
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        audit.loafs.push({
          at: Math.round(e.startTime),
          ms: Math.round(e.duration),
          blockingMs: Math.round(e.blockingDuration),
          renderMs: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
          styleLayoutMs: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
          scripts: e.scripts.map(s => ({ ms: Math.round(s.duration), invoker: s.invoker, src: (s.sourceURL || '').replace(location.origin, '') + (s.sourceFunctionName ? ` ${s.sourceFunctionName}` : ''), forcedLayoutMs: Math.round(s.forcedStyleAndLayoutDuration) })).filter(s => s.ms >= 5),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
  let last;
  const tick = now => {
    if (last !== undefined) audit.frames.push({ at: now, ms: now - last });
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  addEventListener('pagereveal', e => { audit.reveal = { at: Math.round(performance.now()), transition: !!e.viewTransition }; });
  addEventListener('pageshow', e => {
    audit.persisted = e.persisted;
    if (!e.persisted) return;
    // restored from the back/forward cache: measure from the restore, not from the original load
    const at = performance.now();
    audit.restoredAt = Math.round(at);
    audit.frames = audit.frames.filter(f => f.at >= at);
    audit.longTasks = audit.longTasks.filter(t => t.at >= at);
    audit.loafs = audit.loafs.filter(l => l.at >= at);
    audit.settled = null;
    const p = window.__ptSettled;
    if (p) p.then(() => { audit.settled = Math.round(performance.now()); });
  });
  const watch = () => {
    const p = window.__ptSettled;
    if (p) p.then(() => { audit.settled = Math.round(performance.now()); });
    else setTimeout(watch, 0);
  };
  watch();
};

const summarize = async (page, label, clickedAt) => {
  await page.waitForTimeout(WINDOW_MS);
  return page.evaluate(({ label, clickedAt }) => {
    const a = window.navAudit;
    const nav = performance.getEntriesByType('navigation')[0];
    const frames = a.frames.map(f => f.ms).sort((x, y) => x - y);
    const from = a.restoredAt ?? 0;
    const firstSecond = a.frames.filter(f => f.at >= from && f.at < (a.settled ?? from + 1500)).map(f => f.ms);
    return {
      label,
      url: location.pathname + location.search,
      navType: nav?.type,
      bfcache: a.persisted,
      notRestoredReasons: nav?.notRestoredReasons ? JSON.stringify(nav.notRestoredReasons.reasons || nav.notRestoredReasons) : null,
      clickToResponseStartMs: nav && clickedAt ? Math.round(performance.timeOrigin + nav.responseStart - clickedAt) : null,
      restoredAt: a.restoredAt ?? null,
      clickToRevealMs: a.reveal && clickedAt ? Math.round(performance.timeOrigin + a.reveal.at - clickedAt) : null,
      domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      revealAt: a.reveal,
      transitionSettledAt: a.settled,
      framesDuringTransition: firstSecond.length,
      framesOver33msDuringTransition: firstSecond.filter(ms => ms > 33.4).length,
      worstFrameDuringTransitionMs: Math.round(Math.max(0, ...firstSecond)),
      p95FrameMs: Math.round(frames[Math.floor(frames.length * 0.95)] ?? 0),
      framesOver33ms: frames.filter(ms => ms > 33.4).length,
      longTasksTotalMs: a.longTasks.reduce((s, t) => s + t.ms, 0),
      longTasks: a.longTasks,
      loafs: a.loafs.filter(l => l.ms >= 80).sort((x, y) => y.blockingMs - x.blockingMs).slice(0, 8),
    };
  }, { label, clickedAt });
};

const clickTo = async (page, href) => {
  const clickedAt = await page.evaluate(href => {
    let a = document.querySelector(`main a[href="${href}"], header a[href="${href}"], a[href="${href}"]`);
    if (!a) {
      a = document.createElement('a');
      a.href = href;
      a.textContent = 'audit';
      a.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
      document.body.appendChild(a);
    }
    const at = performance.timeOrigin + performance.now();
    a.click();
    return at;
  }, href);
  await page.waitForURL(url => new URL(url).pathname === href.split('?')[0], { timeout: 60000 });
  await page.waitForLoadState('load');
  return clickedAt;
};

// Playwright disables the back/forward cache by default; real Chrome has it on.
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
const results = [];
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
  await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', e => console.error('pageerror', e.message));

  // warm the server/HTTP cache like a visitor who has been on the site once
  for (const route of ['/', '/payments', '/personalize']) await page.goto(base + route, { waitUntil: 'load' });

  await page.goto(base + '/', { waitUntil: 'load' });
  results.push(await summarize(page, 'initial load /', null));

  const steps = [
    ['/ -> /payments (link)', '/payments'],
    ['/payments -> / (link)', '/'],
    ['/ -> /personalize (link)', '/personalize'],
  ];
  for (const [label, href] of steps) {
    const clickedAt = await clickTo(page, href);
    const r = await summarize(page, label, clickedAt);
    results.push(r);
    console.log(JSON.stringify({ ...r, longTasks: undefined, loafs: undefined }));
  }

  const backAt = Date.now();
  await page.goBack({ waitUntil: 'commit' });
  const back = await summarize(page, '/personalize -> / (browser back)', backAt);
  results.push(back);
  console.log(JSON.stringify({ ...back, longTasks: undefined, loafs: undefined }));
} finally {
  await browser.close();
}

if (out) {
  await fs.writeFile(out, JSON.stringify({ base, reduced, lite, environment: 'Chrome headless, 1440x1000, no CPU throttling', results }, null, 2));
  console.log('written', out);
}
