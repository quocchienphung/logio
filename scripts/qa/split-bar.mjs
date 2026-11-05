// Browser QA of the Split bar under the Activity terrain on /personalize?section=repo: shares, hover, legend, keyboard, the link with the terrain, the three
// ways to split the week, reduced motion, phone, dark theme, and the edge spring against the one measured from the public UIArc preview.
//   node scripts/qa/split-bar.mjs [base-url]          output: docs/research/uiarc-split-bar/qa/
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/uiarc-split-bar/qa';
await fs.mkdir(out, { recursive: true });
const results = [], errors = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(ok ? 'ok  ' : 'FAIL', name, detail); if (!ok) process.exitCode = 1; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// a week of recorded operations, deterministic: Monday to today, working hours, a few failures
const OFFSET = 7 * 3600_000, DAY = 86_400_000;
const local = Date.now() + OFFSET, dayIndex = (new Date(local).getUTCDay() + 6) % 7;
const weekStart = Math.floor(local / DAY) * DAY - dayIndex * DAY - OFFSET;
let state = 7; const random = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
const kinds = ['save', 'save', 'import', 'export', 'transfer'];
const seed = [];
for (let day = 0; day <= Math.min(dayIndex, 4); day++) for (let n = 0; n < 6 + Math.floor(random() * 14); n++) {
  const t = weekStart + day * DAY + Math.min(23, Math.floor(8 + random() * 10)) * 3600_000 + Math.floor(random() * 3000_000);
  if (t <= Date.now()) seed.push({ id: `e${seed.length}`, kind: kinds[Math.floor(random() * kinds.length)], label: 'x', t, durationMs: 5, bytes: 10, outcome: random() < 0.12 ? 'error' : 'success' });
}

async function open(browser, { width = 1440, height = 1000, reduced = false, dark = false, touch = false, events = seed } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: dark ? 'dark' : 'light', hasTouch: touch, isMobile: touch });
  if (events) await context.addInitScript(list => { if (!localStorage.getItem('affectui:acme:skill-events')) localStorage.setItem('affectui:acme:skill-events', JSON.stringify(list)); }, events);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error).slice(0, 300)));
  page.on('console', message => { if (message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text())) errors.push(message.text().slice(0, 300)); });
  await page.goto(`${base}/personalize?section=repo`, { waitUntil: 'networkidle' });
  if (dark) await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  await page.locator('.sb').waitFor({ timeout: 30000 });
  await page.locator('.sb').scrollIntoViewIfNeeded();
  await sleep(2200);
  return { context, page };
}
// The percent insets (right, left) of a clip-path as the browser serialises it: `calc(41.5% + 1px)` where there is a gap, plain `0%` / `0px` where it simplified.
const INSETS = `(clip) => {
  const tokens = clip.replace(/^inset\\(|\\)$/g, '').replace(/ round.*$/, '').match(/calc\\([^)]*\\)|[\\d.]+(?:%|px)/g) ?? [];
  const pct = token => { const m = /([\\d.]+)%/.exec(token ?? ''); return m ? Number(m[1]) : 0; };
  return { right: pct(tokens[1]), left: pct(tokens[3]) };
}`;
// width of each part in % of the bar, read from the clip-path the page is painting right now
const widths = page => page.evaluate(`(() => { const insets = ${INSETS}; return [...document.querySelectorAll('.sb__segment')].map(segment => { const { right, left } = insets(segment.style.clipPath); return Math.round((100 - right - left) * 1000) / 1000; }); })()`);
const flags = page => page.evaluate(() => [...document.querySelectorAll('.sb__segment')].map(segment => ({ hl: segment.hasAttribute('data-hl'), dim: segment.hasAttribute('data-dim') })));
// the readout as text: the rolling digit wheels (every digit 0-9 of each column) are left out, the plain copy for screen readers stays
const readout = page => page.locator('.sb__readoutLine').last().evaluate(el => [...el.children].map(child => { const copy = child.cloneNode(true); copy.querySelectorAll('.at-number__value').forEach(node => node.remove()); return copy.textContent.replace(/\s+/g, ' ').trim(); }).filter(Boolean).join(' '));
const legend = page => page.locator('.sb__legendItem').evaluateAll(items => items.map(item => item.getAttribute('aria-label')));
const bigNumber = page => page.locator('.at__stats .at__big .at-number__sr').textContent();
const canvasLight = page => page.evaluate(() => {
  const canvas = document.querySelector('.at__canvas'), ctx = canvas.getContext('2d'), { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0, n = 0; for (let i = 0; i < data.length; i += 16) { if (data[i + 3] > 0) { sum += (data[i] + data[i + 1] + data[i + 2]) / 3; n++; } }
  return sum / Math.max(1, n);
});
const mouseToBar = async (page, fraction) => { const box = await page.locator('.sb__bar').boundingBox(); await page.mouse.move(box.x + box.width * fraction, box.y + 22, { steps: 6 }); };

// critically damped step fit (same method as scripts/forensics/uiarc-split-bar-fit.mjs)
function fitOmega(series) {
  const v0 = series[0].v, vEnd = series.at(-1).v, total = vEnd - v0;
  const startAt = series.findIndex(p => Math.abs(p.v - v0) > Math.abs(total) * 0.01);
  if (startAt < 0 || Math.abs(total) < 0.2) return null;
  const start = series[startAt].t;
  let best = { w: 0, err: Infinity };
  for (let w = 2; w <= 40; w += 0.05) {
    let err = 0, n = 0;
    for (const p of series) { if (p.t < start) continue; const t = p.t - start; err += ((1 - (1 + w * t) * Math.exp(-w * t)) - (p.v - v0) / total) ** 2; n++; }
    if (err / n < best.err) best = { w, err: err / n };
  }
  return { omega: best.w, rms: Math.sqrt(best.err), total };
}
async function recordEdge(page, act, ms = 1500) {
  await page.evaluate(`(() => {
    const insets = ${INSETS};
    window.__frames = []; window.__rec = true; const t0 = performance.now();
    const tick = () => { if (!window.__rec) return; window.__frames.push({ t: (performance.now() - t0) / 1000, v: 100 - insets(document.querySelector('.sb__segment').style.clipPath).right }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })()`);
  await sleep(120); await act(); await sleep(ms);
  return page.evaluate(() => { window.__rec = false; return window.__frames; });
}

const chrome = await chromium.launch({ channel: 'chrome' });
try {
  // ------------------------------------------------------------------ real week, desktop
  {
    const { context, page } = await open(chrome);
    check('The split bar sits under the terrain on Repo', await page.locator('.at .at__split .sb').count() === 1 && await page.getByText('Where the week went', { exact: true }).count() === 1);
    const names = await legend(page);
    check('Days with something recorded are listed, with their shares', names.length >= 2 && names.every(name => /^\w+, \d+\.\d%$/.test(name)), names.join(' | '));
    const rest = await widths(page), sum = rest.reduce((a, b) => a + b, 0);
    check('The parts fill the bar exactly', Math.abs(sum - 100) < 0.2, `sum ${sum}`);
    check('At rest nothing is highlighted or dimmed', (await flags(page)).every(item => !item.hl && !item.dim));
    const total = await bigNumber(page), readoutRest = await readout(page);
    check('The readout starts on the week total, equal to the terrain\'s', readoutRest.startsWith('This week') && readoutRest.includes(total), `${readoutRest} / terrain ${total}`);
    await page.locator('.sb').screenshot({ path: `${out}/desktop-rest.png` });
    const lightRest = await canvasLight(page);

    // hover a part
    await mouseToBar(page, 0.12);
    await sleep(1000);
    const hover = await widths(page), f = await flags(page);
    check('Hover highlights one part and dims the others', f.filter(x => x.hl).length === 1 && f.filter(x => x.dim).length === f.length - 1 && f[0].hl);
    check('The hovered part widens by 4.5 % of the bar (or what its label needs), the others give way and the bar stays whole', hover[0] - rest[0] > 4.2 && hover[0] - rest[0] < 6 && hover.slice(1).every((w, i) => w < rest[i + 1]) && Math.abs(hover.reduce((a, b) => a + b, 0) - 100) < 0.2, `${rest.join(', ')} -> ${hover.join(', ')}`);
    const hoverReadout = await readout(page);
    check('The readout names the part with its share, value and unit', /^[A-Z][a-z]+ \d+\.\d% \d+ operations?$/.test(hoverReadout), hoverReadout);
    check('No label is lost while a part is hovered at this width', await page.locator('.sb__outside').count() === 0 || await page.locator('.sb__leader').count() === await page.locator('.sb__outside').count());
    check('The terrain fades every column outside the hovered part', (await canvasLight(page)) > lightRest + 8, `${lightRest.toFixed(1)} -> ${(await canvasLight(page)).toFixed(1)}`);
    await page.locator('.at').screenshot({ path: `${out}/desktop-hover.png` });
    await page.mouse.move(5, 5); await sleep(1000);
    check('Leaving brings everything back', (await flags(page)).every(item => !item.hl && !item.dim) && Math.abs((await canvasLight(page)) - lightRest) < 1.5);

    // switch a part off from the legend
    const before = Number(total.replace(/,/g, ''));
    await page.locator('.sb__legendItem').nth(1).click();
    await page.mouse.move(5, 5); await sleep(1500);
    const after = await widths(page), item = page.locator('.sb__legendItem').nth(1);
    check('Switching a part off collapses it in place and the rest reflow to fill the bar', after[1] < 0.05 && Math.abs(after.reduce((a, b) => a + b, 0) - 100) < 0.2, after.join(', '));
    check('Its legend item is a pressed-off toggle with the word Off', await item.getAttribute('aria-pressed') === 'false' && (await item.innerText()).includes('Off') && (await item.getAttribute('aria-label')).endsWith('hidden'));
    const totalAfter = Number((await bigNumber(page)).replace(/,/g, ''));
    check('The terrain, its total and its summary leave those hours out', totalAfter < before && (await page.locator('.at__label').first().innerText()).includes('in view') && (await readout(page)).startsWith('In view'), `${before} -> ${totalAfter}`);
    check('A note names what is left out, with a way back', (await page.locator('.at__splitNote').innerText()).includes('Left out of the terrain'));
    await page.locator('.at').screenshot({ path: `${out}/desktop-off.png` });
    await page.getByRole('button', { name: 'Show all' }).click(); await sleep(1500);
    check('Show all restores the week', Number((await bigNumber(page)).replace(/,/g, '')) === before && await page.locator('.sb__legendItem[aria-pressed="false"]').count() === 0);

    // the last visible part cannot be switched off
    const items = page.locator('.sb__legendItem'), count = await items.count();
    for (let i = 1; i < count; i++) { await items.nth(i).click(); await sleep(150); }
    await page.mouse.move(5, 5); await sleep(1200);
    await items.nth(0).click(); await sleep(500);
    check('The last visible part stays on, with the reason announced', await items.nth(0).getAttribute('aria-pressed') === 'true' && (await page.locator('.sb__sr').textContent()).includes('is the only share shown, so it stays on'));
    const solo = await widths(page);
    check('With one part left the bar is whole', Math.abs(solo[0] - 100) < 0.2 && solo.slice(1).every(w => w < 0.05), solo.join(', '));
    await page.getByRole('button', { name: 'Show all' }).click(); await sleep(1200);

    // keyboard
    await page.locator('.sb__bar').focus();
    await page.keyboard.press('ArrowRight'); await sleep(700);
    const first = await readout(page);
    await page.keyboard.press('ArrowRight'); await sleep(700);
    const second = await readout(page);
    check('Arrow keys walk the parts and read each one out', first !== second && /\d+\.\d%/.test(first) && (await page.locator('.sb__sr').textContent()).includes('operations'), `${first} -> ${second}`);
    await page.keyboard.press('End'); await sleep(500);
    check('End jumps to the last part', (await flags(page)).at(-1).hl);
    await page.keyboard.press('Home'); await sleep(500);
    check('Home jumps to the first part', (await flags(page))[0].hl);
    await page.keyboard.press('Enter'); await sleep(1300);
    check('Enter switches the highlighted part off', await page.locator('.sb__legendItem[aria-pressed="false"]').count() === 1);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape'); await sleep(600);
    check('Escape clears the highlight', (await flags(page)).every(x => !x.hl));
    await page.getByRole('button', { name: 'Show all' }).click(); await sleep(1200);
    check('The bar is a focusable group named with every share', await page.locator('.sb__bar').evaluate(el => el.getAttribute('role') === 'group' && el.getAttribute('aria-roledescription') === 'split bar' && el.tabIndex === 0 && /\d+\.\d%/.test(el.getAttribute('aria-label'))));

    // the terrain lights the bar
    await page.locator('.at__plot').focus();
    await page.keyboard.press('ArrowRight'); await sleep(900);
    const peakDay = (await page.locator('.at__peak span').first().innerText()).split(' ')[0];
    const lit = await page.locator('.sb__segment').evaluateAll(list => list.findIndex(el => el.hasAttribute('data-hl')));
    const litName = lit >= 0 ? (await legend(page))[lit] : '';
    check('An hour highlighted in the terrain lights the part that holds it', lit >= 0 && litName.toLowerCase().startsWith(peakDay.toLowerCase()), `peak ${peakDay}, lit ${litName}`);
    await page.keyboard.press('Escape');

    // the three ways to split
    await page.getByRole('button', { name: 'Time of day', exact: true }).click(); await sleep(1800);
    const parts = await legend(page);
    check('Time of day gives parts of the day', parts.length >= 1 && parts.every(name => /^(Night|Morning|Afternoon|Evening)/.test(name)), parts.join(' | '));
    await page.getByRole('button', { name: 'Action', exact: true }).click(); await sleep(1800);
    const actions = await legend(page);
    check('Action gives what was done', actions.length >= 2 && actions.every(name => /^(Import|Save|Export|Transfer)/.test(name)), actions.join(' | '));
    await page.locator('.sb__legendItem').first().click(); await page.mouse.move(5, 5); await sleep(1500);
    check('Switching an action off leaves its operations out of the terrain', Number((await bigNumber(page)).replace(/,/g, '')) < before);
    await page.getByRole('button', { name: 'Day', exact: true }).click(); await sleep(1500);
    check('Changing the split starts from the whole week again', await page.locator('.sb__legendItem[aria-pressed="false"]').count() === 0 && Number((await bigNumber(page)).replace(/,/g, '')) === before);
    await page.getByRole('button', { name: 'Errors', exact: true }).click(); await sleep(1800);
    check('The bar follows the metric: errors, in red, with their own total', await page.locator('.sb[data-tone="danger"]').count() === 1 && (await readout(page)).startsWith('This week'));
    await page.locator('.at').screenshot({ path: `${out}/desktop-errors.png` });
    await page.getByRole('button', { name: 'Operations', exact: true }).click(); await sleep(1500);

    // the spring of the edges against the recorded one (critical, 14.2 to 15.7 rad/s)
    const series = await recordEdge(page, async () => { await mouseToBar(page, 0.6); });
    const fit = fitOmega(series);
    check('The edges ride the measured spring (critically damped, about 14.5 rad/s)', fit && fit.omega > 11 && fit.omega < 19 && fit.rms < 0.05, fit ? `omega ${fit.omega.toFixed(2)}, rms ${fit.rms.toFixed(4)}, travel ${fit.total.toFixed(2)}` : 'no motion');
    await context.close();
  }

  // ------------------------------------------------------------------ the sample week
  {
    const { context, page } = await open(chrome, { events: null });
    check('The sample week splits by day and by time of day, never by action', (await page.locator('[aria-label="Split the week by"] button').allInnerTexts()).join('|') === 'Day|Time of day');
    check('The seven days are listed', await page.locator('.sb__legendItem').count() === 7);
    check('At rest every label fits inside its part at this width (Sunday 57.7 px is over the 56 px rule)', await page.locator('.sb__outside').count() === 0 && await page.locator('.sb__lane').evaluate(el => el.getBoundingClientRect().height < 1));
    await mouseToBar(page, 0.3); await sleep(1500);
    check('Hover squeezes the small parts out: they stand on the lane under the bar with S-shaped leader lines', await page.locator('.sb__outside').count() >= 1 && await page.locator('.sb__leader').count() === await page.locator('.sb__outside').count() && await page.locator('.sb__lane').evaluate(el => el.getBoundingClientRect().height > 35));
    const labels = await page.locator('.sb__outside').evaluateAll(list => list.map(el => { const r = el.getBoundingClientRect(); return [r.left, r.right]; }));
    check('Outside labels never overlap', labels.every((r, i) => i === 0 || r[0] >= labels[i - 1][1] - 0.5));
    const box = await page.locator('.sb__bar').boundingBox(), lane = await page.locator('.sb__outside').evaluateAll(list => list.map(el => el.getBoundingClientRect().right));
    check('Outside labels stay inside the bar\'s width', lane.every(right => right <= box.x + box.width + 0.5));
    await page.mouse.move(5, 5); await sleep(1500);
    check('Leaving closes the lane again', await page.locator('.sb__outside').count() === 0 && await page.locator('.sb__lane').evaluate(el => el.getBoundingClientRect().height < 1));
    await page.locator('.sb__legendItem').last().hover(); await sleep(900);
    check('Hovering a legend item highlights its part', (await flags(page)).at(-1).hl);
    await page.locator('.at').screenshot({ path: `${out}/sample-desktop.png` });
    await page.getByRole('button', { name: 'Your activity' }).click(); await sleep(1200);
    check('Switching the data source clears what was switched off', await page.locator('.sb__legendItem[aria-pressed="false"]').count() === 0);
    await context.close();
  }

  // ------------------------------------------------------------------ nothing recorded, "Your activity"
  {
    const { context, page } = await open(chrome, { events: null });
    await page.getByRole('button', { name: 'Your activity' }).click(); await sleep(1800);
    check('With nothing recorded the bar says so instead of inventing shares', await page.locator('.sb__emptyLabel').count() === 1 && await page.locator('.sb__legendItem').count() === 0 && await page.locator('.sb__bar[data-empty]').count() === 1);
    await context.close();
  }

  // ------------------------------------------------------------------ reduced motion: every change lands at once
  {
    const { context, page } = await open(chrome, { reduced: true });
    await page.locator('.sb__legendItem').nth(1).click(); await page.mouse.move(5, 5); await sleep(150);
    const w = await widths(page);
    check('Reduced motion: a part switched off is gone at once', w[1] < 0.05 && Math.abs(w.reduce((a, b) => a + b, 0) - 100) < 0.2, w.join(', '));
    await context.close();
  }

  // ------------------------------------------------------------------ phone
  {
    const { context, page } = await open(chrome, { width: 390, height: 844, touch: true });
    check('Phone: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const box = await page.locator('.sb__bar').boundingBox();
    check('Phone: the bar spans its card', box.width > 280 && box.x >= 0 && box.x + box.width <= 390, `${box.width}`);
    await page.touchscreen.tap(box.x + box.width * 0.12, box.y + 22); await sleep(900);
    check('Phone: a tap highlights a part', (await flags(page)).some(x => x.hl));
    await page.touchscreen.tap(200, 10); await sleep(700);
    check('Phone: a tap elsewhere clears it', (await flags(page)).every(x => !x.hl));
    await page.locator('.sb').screenshot({ path: `${out}/phone.png` });
    await context.close();
  }

  // ------------------------------------------------------------------ dark theme
  {
    const { context, page } = await open(chrome, { dark: true });
    await mouseToBar(page, 0.12); await sleep(900);
    const colors = await page.evaluate(() => { const seg = document.querySelector('.sb__segment'), s = getComputedStyle(seg), text = getComputedStyle(seg.querySelector('.sb__inside')); return { bg: s.backgroundColor, text: text.color }; });
    check('Dark theme: the highlighted part keeps readable text', !!colors.bg && !!colors.text, JSON.stringify(colors));
    await page.locator('.at').screenshot({ path: `${out}/dark-hover.png` });
    await context.close();
  }
  check('No console errors', errors.length === 0, errors.join(' | '));
} finally {
  await chrome.close();
  await fs.writeFile(`${out}/qa-results.json`, JSON.stringify({ ran: new Date().toISOString(), base, results }, null, 2));
  console.log(`${results.filter(r => r.ok).length}/${results.length} checks passed`);
}
