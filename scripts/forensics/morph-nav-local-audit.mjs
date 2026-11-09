import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:3000', label = process.argv[3] || 'before';
const out = `docs/research/morph-nav/${label}`; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000); await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
const popup = page.locator('.hds-navigation-menu__popup');
async function geometry() {
  return page.evaluate(() => {
    const props = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { rect: [r.x,r.y,r.width,r.height], font: s.font, color: s.color, background: s.backgroundColor, border: s.border, radius: s.borderRadius }; };
    const p = document.querySelector('.hds-navigation-menu__popup');
    const c = p?.querySelector('.hds-navigation-menu__content[data-status=open]');
    return { header: props(document.querySelector('header.navigation')), triggers: [...document.querySelectorAll('header.navigation .hds-navigation-menu__trigger')].map(e => ({ label: e.textContent.trim(), ...props(e) })), popup: p ? { ...props(p), transition: getComputedStyle(p).transition, willChange: getComputedStyle(p).willChange } : null, content: c ? props(c) : null, natural: c?.firstElementChild ? props(c.firstElementChild) : null, links: c ? [...c.querySelectorAll('a[href]')].map(e => ({ href: e.getAttribute('href'), text: e.textContent, ...props(e) })) : [] };
  });
}
const geometryStates = { idle: await geometry() };
await page.screenshot({ path: `${out}/idle.png`, clip: { x: 0, y: 0, width: 1440, height: 80 } });
for (const name of ['Products','Solutions','Developers','Resources']) {
  await page.getByRole('button', { name, exact: true }).hover(); await page.waitForTimeout(900);
  geometryStates[name] = await geometry(); await popup.screenshot({ path: `${out}/${name.toLowerCase()}.png` });
}
for (const name of ['Products','Solutions','Developers','Resources']) {
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.mouse.move(1380,850);
  await page.getByRole('button', { name, exact: true }).hover(); await page.waitForTimeout(1100);
  geometryStates[`isolated-${name}`] = await geometry();
  await popup.screenshot({ path: `${out}/isolated-${name.toLowerCase()}.png` });
}
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
const frames = await page.evaluate(async () => {
  const samples = [], longFrames = [], tasks = []; const start = performance.now();
  let observer, taskObserver;
  try { observer = new PerformanceObserver(list => longFrames.push(...list.getEntries().map(e => ({ t: e.startTime-start, duration: e.duration, blocking: e.blockingDuration, scripts: e.scripts?.map(s => ({ name: s.sourceFunctionName, duration: s.duration, forcedLayout: s.forcedStyleAndLayoutDuration })) })))); observer.observe({ type: 'long-animation-frame' }); } catch {}
  try { taskObserver = new PerformanceObserver(list => tasks.push(...list.getEntries().map(e => ({ t: e.startTime-start, duration: e.duration })))); taskObserver.observe({ type: 'longtask' }); } catch {}
  let last, handle; const tick = now => { if (last !== undefined) samples.push({ t: now-start, dt: now-last }); last = now; handle = requestAnimationFrame(tick); }; handle=requestAnimationFrame(tick);
  window.__navAuditStop = () => { cancelAnimationFrame(handle); observer?.disconnect(); taskObserver?.disconnect(); return { samples, longFrames, tasks }; };
  return { start };
});
const steps = [];
for (let cycle=0;cycle<3;cycle++) for (const name of ['Products','Solutions','Developers','Resources','Developers','Solutions']) {
  const at = await page.evaluate(() => performance.now()); steps.push({ name, at: at-frames.start });
  await page.getByRole('button', { name, exact: true }).hover(); await page.waitForTimeout(260);
}
await page.mouse.move(1380, 850); await page.waitForTimeout(850);
const audit = await page.evaluate(() => window.__navAuditStop());
const intervals = audit.samples.map(s=>s.dt).sort((a,b)=>a-b);
const summary = { frames: intervals.length, p50: intervals[Math.floor(intervals.length*.5)], p95: intervals[Math.floor(intervals.length*.95)], p99: intervals[Math.floor(intervals.length*.99)], worst: Math.max(...intervals), over33: intervals.filter(n=>n>33.4).length, over50: intervals.filter(n=>n>50).length, longTasks: audit.tasks.length, longAnimationFrames: audit.longFrames.length };
await fs.writeFile(`${out}/geometry.json`, JSON.stringify(geometryStates,null,2)); await fs.writeFile(`${out}/performance.json`, JSON.stringify({ base, label, note: 'Headless Chrome rAF/Long Animation Frame data, not presented-frame FPS; full homepage active, unthrottled.', steps, summary, ...audit, errors },null,2));
console.log(JSON.stringify({ geometry: Object.fromEntries(Object.entries(geometryStates).map(([key,v])=>[key,{popup:v.popup?.rect,content:v.content?.rect,natural:v.natural?.rect}])), summary, errors }));
await context.close(); await browser.close();
