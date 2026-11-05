import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { traceInit, startTrace, stopTrace } from './lib/canvas-trace.mjs';

// Scenario recorder for the public Activity terrain preview. Every scenario starts from a fresh page, records the canvas calls of every frame
// and the input events that caused them. Raw traces (large) go to the scratch directory; analysis scripts read them from there.
//   node scripts/forensics/uiarc-terrain-capture.mjs <scratch-dir> [scenario ...]
const raw = process.argv[2];
if (!raw) throw new Error('usage: node uiarc-terrain-capture.mjs <scratch-dir> [scenario ...]');
const only = process.argv.slice(3);
await fs.mkdir(raw, { recursive: true });
const URL = 'https://uiarc.dev/components/blocks/activity-terrain';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function open(browser, { width = 1440, height = 1000, dpr = 1, reduced = false, dark = false, touch = false, autostart = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: dark ? 'dark' : 'light', hasTouch: touch, isMobile: touch });
  await context.addInitScript(traceInit('activity-terrain_canvas'));
  if (autostart) await context.addInitScript(() => { addEventListener('DOMContentLoaded', () => { window.__trace.rec = true; }); });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (dark) await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  return { context, page };
}
const plot = page => page.locator('[class*="activity-terrain_plot"]');
async function settle(page, ms = 6000) { await page.waitForTimeout(ms); }
// Collect what autostart has been recording since DOMContentLoaded (no reset), for scenarios about the first moments
async function collect(page, ms) { await page.waitForTimeout(ms); return stopTrace(page); }
async function record(page, ms, action) {
  await startTrace(page);
  if (action) await action();
  await page.waitForTimeout(ms);
  return stopTrace(page);
}
async function save(name, trace, extra = {}) {
  await fs.writeFile(path.join(raw, `${name}.json`), JSON.stringify({ ...trace, extra }));
  console.log(name, 'frames', trace.frames.length, 'events', trace.events.length);
}

const scenarios = {
  // the first seconds and a long idle: intro wave, camera settling, whether anything keeps moving
  async load(browser) {
    const { context, page } = await open(browser, { autostart: true });
    const trace = await collect(page, 6000);
    await save('load', trace); await context.close();
  },
  async idle(browser) {
    const { context, page } = await open(browser);
    await settle(page, 12000);
    const trace = await record(page, 4000);
    await save('idle', trace); await context.close();
  },
  async metrics(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const runs = {};
    for (const name of ['Deploys', 'Errors', 'Sessions']) {
      runs[name] = await record(page, 3500, () => page.getByRole('button', { name, exact: true }).click());
      await settle(page, 1500);
    }
    for (const [name, trace] of Object.entries(runs)) await save(`metric-${name.toLowerCase()}`, trace);
    await context.close();
  },
  async flatten(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const top = await record(page, 3500, () => page.getByRole('button', { name: 'Top view', exact: true }).click());
    await save('flatten-top', top);
    await settle(page, 1500);
    const back = await record(page, 3500, () => page.getByRole('button', { name: 'Perspective', exact: true }).click());
    await save('flatten-perspective', back);
    await context.close();
  },
  async orbit(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height * 0.45;
    // slow drag right, then a fast flick left with release
    const horiz = await record(page, 3500, async () => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 1; i <= 30; i++) { await page.mouse.move(cx + i * 4, cy); await sleep(16); }
      await page.mouse.up();
    });
    await save('orbit-drag-slow', horiz);
    await settle(page, 3000);
    const flick = await record(page, 4000, async () => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(cx - i * 22, cy); await sleep(8); }
      await page.mouse.up();
    });
    await save('orbit-flick', flick);
    await settle(page, 3000);
    const vert = await record(page, 3500, async () => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 1; i <= 30; i++) { await page.mouse.move(cx, cy + i * 4); await sleep(16); }
      await page.mouse.up();
    });
    await save('orbit-drag-vertical', vert);
    await context.close();
  },
  async zoom(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const wheelIn = await record(page, 3000, async () => { for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -120); await sleep(30); } });
    await save('zoom-wheel-in', wheelIn);
    await settle(page, 2000);
    await plot(page).focus();
    const keys = await record(page, 3000, async () => { await page.keyboard.press('+'); await sleep(250); await page.keyboard.press('+'); await sleep(250); await page.keyboard.press('-'); });
    await save('zoom-keys', keys);
    await context.close();
  },
  async hover(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    const trace = await record(page, 3500, async () => {
      for (let i = 0; i <= 40; i++) { await page.mouse.move(box.x + box.width * (0.3 + i * 0.012), box.y + box.height * (0.45 + i * 0.002)); await sleep(30); }
    });
    await save('hover-sweep', trace, { panelText: await page.locator('[class*="activity-terrain_panel"]').innerText().catch(() => null) });
    await context.close();
  },
  async fly(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    const x = box.x + box.width * 0.5, y = box.y + box.height * 0.5;
    await page.mouse.move(x, y); await sleep(300);
    const into = await record(page, 3500, async () => { await page.mouse.click(x, y); });
    await save('fly-click', into);
    await settle(page, 1500);
    const esc1 = await record(page, 3500, async () => { await page.keyboard.press('Escape'); });
    await save('fly-escape-1', esc1);
    await settle(page, 1000);
    const esc2 = await record(page, 2500, async () => { await page.keyboard.press('Escape'); });
    await save('fly-escape-2', esc2);
    await context.close();
  },
  async keyboard(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    await plot(page).focus();
    const arrows = await record(page, 3000, async () => { for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) { await page.keyboard.press(k); await sleep(180); } });
    await save('kb-arrows', arrows, { live: await page.locator('p[aria-live="polite"][class*="srOnly"]').first().innerText().catch(() => null) });
    const shift = await record(page, 3500, async () => { for (const k of ['ArrowRight', 'ArrowRight', 'ArrowUp']) { await page.keyboard.press(`Shift+${k}`); await sleep(220); } });
    await save('kb-shift-orbit', shift);
    const home = await record(page, 2500, async () => { await page.keyboard.press('Home'); await sleep(500); await page.keyboard.press('End'); });
    await save('kb-home-end', home);
    const enter = await record(page, 3500, async () => { await page.keyboard.press('Enter'); });
    await save('kb-enter', enter);
    await context.close();
  },
  async peaks(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const first = page.locator('button[class*="activity-terrain_peak"]').first();
    const fly = await record(page, 3500, () => first.click());
    await save('peak-fly', fly, { pressed: await first.getAttribute('aria-pressed') });
    const leave = await record(page, 3500, () => first.click());
    await save('peak-leave', leave, { pressed: await first.getAttribute('aria-pressed') });
    await context.close();
  },
  async reduced(browser) {
    const { context, page } = await open(browser, { reduced: true, autostart: true });
    const load = await collect(page, 3000);
    await save('reduced-load', load);
    const click = await record(page, 2500, () => page.getByRole('button', { name: 'Deploys', exact: true }).click());
    await save('reduced-metric', click);
    const top = await record(page, 2500, () => page.getByRole('button', { name: 'Top view', exact: true }).click());
    await save('reduced-top', top);
    await context.close();
  },
  async phone(browser) {
    const { context, page } = await open(browser, { width: 390, height: 844, dpr: 2, touch: true, autostart: true });
    const load = await collect(page, 8000);
    await save('phone-load', load);
    await context.close();
  },
  async dark(browser) {
    const { context, page } = await open(browser, { dark: true, autostart: true });
    const load = await collect(page, 7000);
    await save('dark-load', load);
    const errors = await record(page, 3500, () => page.getByRole('button', { name: 'Errors', exact: true }).click());
    await save('dark-errors', errors);
    await settle(page, 1000);
    const top = await record(page, 3500, () => page.getByRole('button', { name: 'Top view', exact: true }).click());
    await save('dark-top', top);
    await context.close();
  },
  async orbitv(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height * 0.45;
    const down = await record(page, 3500, async () => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 1; i <= 25; i++) { await page.mouse.move(cx, cy + i * 4); await sleep(16); }
      await page.mouse.up();
    });
    await save('orbitv-down', down);
    const up = await record(page, 3500, async () => {
      await page.mouse.move(cx, cy + 100); await page.mouse.down();
      for (let i = 1; i <= 70; i++) { await page.mouse.move(cx, cy + 100 - i * 4); await sleep(16); }
      await page.mouse.up();
    });
    await save('orbitv-up', up);
    const limit = await record(page, 3000, async () => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 1; i <= 120; i++) { await page.mouse.move(cx, cy + i * 3); await sleep(16); }
      await page.mouse.up();
    });
    await save('orbitv-down-limit', limit);
    await context.close();
  },
  async zoomlimits(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    await plot(page).focus();
    const zin = await record(page, 4000, async () => { for (let i = 0; i < 12; i++) { await page.keyboard.press('+'); await sleep(200); } });
    await save('zoom-in-limit', zin);
    const zout = await record(page, 5000, async () => { for (let i = 0; i < 24; i++) { await page.keyboard.press('-'); await sleep(200); } });
    await save('zoom-out-limit', zout);
    await context.close();
  },
  async ctrlwheel(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4);
    await page.keyboard.down('Control');
    const trace = await record(page, 3000, async () => { for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -100); await sleep(40); } });
    await page.keyboard.up('Control');
    await save('ctrl-wheel', trace);
    await context.close();
  },
  // fly to many columns from the rest pose: TERRAIN_CLICKS = [{ index, x, y }] in canvas pixels
  async flies(browser) {
    const clicks = JSON.parse(process.env.TERRAIN_CLICKS || '[]');
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    for (const c of clicks) {
      await page.mouse.move(box.x + c.x, box.y + c.y); await sleep(250);
      const trace = await record(page, 2600, () => page.mouse.click(box.x + c.x, box.y + c.y));
      await save(`fly-${c.index}`, trace, { click: c });
      await page.keyboard.press('Escape'); await sleep(2200); await page.mouse.move(box.x - 40, box.y - 40); await sleep(300);
    }
    await context.close();
  },
  // fly from an orbited yaw: TERRAIN_YAW_PRESSES = number of Shift+ArrowRight presses (negative: left), TERRAIN_CLICKS as above (points at that yaw)
  async fliesyaw(browser) {
    const clicks = JSON.parse(process.env.TERRAIN_CLICKS || '[]'), presses = Number(process.env.TERRAIN_YAW_PRESSES || 2);
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    await plot(page).focus();
    for (let i = 0; i < Math.abs(presses); i++) { await page.keyboard.press(`Shift+Arrow${presses > 0 ? 'Right' : 'Left'}`); await sleep(150); }
    await sleep(2500);
    await page.mouse.move(box.x - 40, box.y - 40); await sleep(300);
    for (const c of clicks) {
      await page.mouse.move(box.x + c.x, box.y + c.y); await sleep(250);
      const trace = await record(page, 2600, () => page.mouse.click(box.x + c.x, box.y + c.y));
      await save(`flyyaw${presses}-${c.index}`, trace, { click: c });
      await plot(page).focus(); await page.keyboard.press('Escape'); await sleep(2200); await page.mouse.move(box.x - 40, box.y - 40); await sleep(300);
    }
    await context.close();
  },
  async load1920(browser) {
    const { context, page } = await open(browser, { width: 1920, height: 1100, autostart: true });
    const trace = await collect(page, 6000);
    await save('load1920', trace); await context.close();
  },
  async load820(browser) {
    const { context, page } = await open(browser, { width: 820, height: 1100, autostart: true });
    const trace = await collect(page, 6000);
    const size = await page.evaluate(() => { const p = document.querySelector('[class*="activity-terrain_plot"]'); return [p.clientWidth, p.clientHeight]; });
    await save('load820', trace, { size }); console.log('plot', JSON.stringify(size)); await context.close();
  },
  // the Fullscreen preview: a much larger canvas, to learn how the framing scales
  async fullscreen(browser) {
    const { context, page } = await open(browser, { width: 1920, height: 1100 });
    await settle(page, 8000);
    const before = await plot(page).boundingBox();
    const trace = await record(page, 3500, () => page.getByRole('button', { name: 'Fullscreen preview' }).click());
    const after = await page.evaluate(() => { const c = document.querySelector('[class*="activity-terrain_canvas"]'); const p = document.querySelector('[class*="activity-terrain_plot"]'); return { css: [p.clientWidth, p.clientHeight], backing: [c.width, c.height] }; });
    await save('fullscreen', trace, { before, after });
    console.log('fullscreen sizes', JSON.stringify({ before, after }));
    await context.close();
  },
  // simultaneous canvas + panel samples for the hover rules, with dash arrays recorded
  async hoverdom(browser) {
    const { context, page } = await open(browser);
    await settle(page, 9000);
    const box = await plot(page).boundingBox();
    const trace = await record(page, 4500, async () => {
      for (let i = 0; i <= 60; i++) { await page.mouse.move(box.x + box.width * (0.22 + i * 0.008), box.y + box.height * (0.38 + (i % 12) * 0.03)); await sleep(60); }
    });
    await save('hover-dom', trace);
    const kb = await record(page, 3500, async () => { await plot(page).focus(); for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'Home', 'End']) { await page.keyboard.press(k); await sleep(380); } });
    await save('kb-dom', kb);
    await context.close();
  },
};

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, run] of Object.entries(scenarios)) {
    if (only.length && !only.includes(name)) continue;
    try { await run(browser); } catch (error) { console.log(name, 'FAILED', String(error).slice(0, 300)); }
  }
} finally { await browser.close(); }
