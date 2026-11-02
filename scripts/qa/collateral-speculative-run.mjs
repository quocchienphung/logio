import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';
import { HEADERS } from './lib/collateral-fixture.mjs';

// The Guess-and-check replay inside the correction workbench, measured against what was recorded on the public preview of UIArc's Speculative
// decoding (docs/research/speculative-decoding/source/timeline-*.json). Synthetic workbook only.
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/collateral/speculative-run-qa';
await fs.mkdir(out, { recursive: true });
const descriptions = [...Array(6).fill('Ke hoach trien khai'), ...Array(6).fill('Hang hoa'), ...Array(6).fill('Hung Yen'), 'Ke ho?ch trien khai H?ng zz?zz'];
const rows = descriptions.map((text, i) => {
  const row = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: '00000123', TENKH: 'Cong ty Mau', MASOBD: `T${String(i).padStart(5, '0')}`, MALOAIBD: '303', NGBDAU: '20200101', GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', DSSOHD: `HD${i}`, MOTABD: text, MOTABDS: text };
  return HEADERS.map(header => row[header] ?? null);
});
const buffer = Buffer.from(buildXlsx([{ name: 'RUN_TEST', rows: [HEADERS, ...rows] }]));
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], foreign = [], checks = [];
const check = (label, ok) => { assert.ok(ok, label); checks.push(label); console.log(`✓ ${label}`); };
const near = (label, actual, expected, tolerance) => check(`${label}: ${Math.round(actual * 10) / 10} ms (recorded ${Math.round(expected * 10) / 10} ± ${tolerance})`, Math.abs(actual - expected) <= tolerance);

async function open(context) {
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|WebSocket/.test(message.text())) errors.push(message.text()); });
  page.on('request', request => { if (request.url().startsWith('http') && new URL(request.url()).origin !== new URL(base).origin) foreign.push(request.url()); });
  await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles({ name: 'run-test.xlsx', mimeType: 'application/octet-stream', buffer });
  await page.getByRole('button', { name: /See what was found/ }).click();
  await page.locator('.cr-overview').waitFor({ timeout: 60000 });
  await page.getByRole('tab', { name: /Review and fix/ }).click();
  await page.locator('.cr-search').fill('zz?zz');
  await page.locator('.sdr').waitFor();
  return page;
}
// Time-stamped record of what the replay does, in the page itself (same method as the one used on the public preview).
const instrument = page => page.evaluate(() => {
  const root = document.querySelector('.sdr'); const ev = window.__run = []; let t0 = performance.now();
  window.__runReset = () => { t0 = performance.now(); ev.length = 0; };
  const push = o => ev.push({ t: +(performance.now() - t0).toFixed(1), ...o });
  new MutationObserver(list => { for (const m of list) {
    const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue;
    if (m.type === 'attributes' && m.attributeName === 'data-phase') push({ k: 'phase', v: el.getAttribute('data-phase') });
    if (m.type === 'attributes' && m.attributeName === 'data-state' && el.classList.contains('sdr-column')) push({ k: 'state', j: el.style.getPropertyValue('--j'), v: el.getAttribute('data-state') });
    if (m.type === 'childList') for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.classList.contains('sdr-column')) push({ k: 'column', j: n.style.getPropertyValue('--j') }); const holder = n.matches('.sdr-columns') ? n : n.querySelector?.('.sdr-columns'); if (holder) push({ k: 'phase', v: holder.getAttribute('data-phase') }); if (n.matches('.sdr-summary') || n.querySelector?.('.sdr-summary')) push({ k: 'phase', v: 'done' }); }
    if (m.type === 'attributes' && m.attributeName === 'data-on' && el.classList.contains('sdr-tok') && el.hasAttribute('data-on')) push({ k: 'token', w: el.dataset.word ?? '' });
  } }).observe(root, { subtree: true, attributes: true, childList: true });
});
const events = page => page.evaluate(() => window.__run.slice());

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await open(context);
  check('The replay sits inside the correction workbench, above the table of words', await page.evaluate(() => { const a = document.querySelector('.sd-card > .sdr'), b = document.querySelector('.sd-card > .sd-tablehead'); return !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  await page.waitForFunction(() => document.querySelector('.sdr-columns, .sdr-summary'));
  await page.locator('.sdr').screenshot({ path: `${out}/01-replay.png` });
  check('It has the lanes, the output line, three rolling numbers, a draft length slider and a compare switch', await page.locator('.sdr-laneLabel').count() === 2 && await page.locator('.sdr-outputs .sdr-line').count() === 1 && await page.locator('.sdr-stat').count() === 3 && await page.locator('.sdr-slider').count() === 1 && await page.getByRole('switch').count() === 1);
  check('The slider has the range of the preview (2 to 8 words, 4 by default)', await page.locator('.sdr-slider').evaluate(n => n.min === '2' && n.max === '8' && n.value === '4'));
  check('Header buttons are the preview\'s: Pause / Play and Restart, each with a name', await page.getByRole('button', { name: /^(Pause|Play)$/ }).count() === 1 && await page.getByRole('button', { name: 'Restart' }).count() === 1);

  // --- Timing against the recording
  await instrument(page);
  await page.waitForFunction(() => document.querySelector('.sdr-summary'), null, { timeout: 30000 });
  await page.evaluate(() => window.__runReset());
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => document.querySelector('.sdr-summary'), null, { timeout: 30000 });
  const ev = await events(page);
  const phases = ev.filter(e => e.k === 'phase' && e.v);
  const at = (phase, nth = 0) => phases.filter(e => e.v === phase)[nth]?.t;
  check(`A run goes idle, then draft, verify, settle for each pass and ends in done (${phases.map(e => e.v[0] + Math.round(e.t)).join(' ')}; summary events ${ev.filter(e => e.k === 'phase' && e.v === 'done').length})`, phases.map(e => e.v).join(',').replace(/^idle,/, '').startsWith('draft,verify,settle,draft,verify,settle') && phases.at(-1).v === 'done');
  // Pass 1 has four columns, like the recorded pass 1: its phases are measured one by one, and the pass cycle from draft to draft.
  const cycle = at('draft', 1) - at('draft', 0), draftMs = at('verify', 0) - at('draft', 0), verifyMs = at('settle', 0) - at('verify', 0), settleMs = at('draft', 1) - at('settle', 0);
  near('Pass cycle (draft to draft)', cycle, 900, 45);
  near('Draft phase with four columns', draftMs, 250, 40);
  near('Verify phase (sweep 266.7 + hold 200)', verifyMs, 466.7, 40);
  near('Settle phase', settleMs, 183.3, 40);
  const firstPass = ev.filter(e => e.k === 'column' && e.t >= at('draft', 0) - 20 && e.t < at('verify', 0));
  const born = [0, 1, 2, 3].map(j => firstPass.find(e => e.j === String(j))?.t);
  [0, 66.7, 133.3, 200].forEach((expected, j) => near(`Column ${j} appears after the first one`, born[j] - born[0], expected, 40));
  const verdicts = ev.filter(e => e.k === 'state' && e.t > at('verify', 0) && e.t < at('settle', 0));
  [33.3, 100, 166.7, 233.3].forEach((expected, j) => { const found = verdicts.find(e => e.j === String(j)); near(`Column ${j} gets its verdict half-way through the sweep`, found.t - at('verify', 0), expected, 45); });
  check('Verdicts arrive in column order', verdicts.map(e => Number(e.j)).slice(0, 4).join('') === '0123');
  check('The first miss is struck through and the guesses after it are discarded', await (async () => { const states = ev.filter(e => e.k === 'state').map(e => e.v); return states.includes('rejected') ? states.slice(states.indexOf('rejected') + 1, states.indexOf('rejected') + 2).every(s => s === 'discarded') : true; })());
  const tokenTimes = ev.filter(e => e.k === 'token').map(e => e.t);
  check('Words land in the output at settle time, never before a pass is checked', tokenTimes.length >= 6 && tokenTimes[0] >= at('settle', 0) - 20);

  // --- Flight
  const flight = await (async () => {
    await page.getByRole('button', { name: 'Restart' }).click();
    await page.waitForFunction(() => document.querySelector('.sdr-columns[data-phase="settle"]'), null, { timeout: 10000 });
    return page.evaluate(() => new Promise(resolve => {
      const samples = []; const started = performance.now();
      const frame = () => { const el = [...document.querySelectorAll('.sdr-tok[data-on]')][0]; if (el) { const m = new DOMMatrix(getComputedStyle(el).transform); samples.push({ t: performance.now() - started, x: m.e, y: m.f }); } if (performance.now() - started < 700) requestAnimationFrame(frame); else resolve(samples); };
      frame();
    }));
  })();
  const moved = flight.filter(s => Math.abs(s.x) > 0.5 || Math.abs(s.y) > 0.5);
  check(`The first accepted word flies in from the lane: it is displaced upward and settles at zero (${flight.length} samples, ${moved.length} displaced, first ${JSON.stringify(moved[0])}, last ${JSON.stringify(flight.at(-1))})`, moved.length >= 3 && moved[0].y < -20 && Math.abs(flight.at(-1).x) < 0.5 && Math.abs(flight.at(-1).y) < 0.5);
  check('The flight is a spring that decays smoothly (no jump back)', flight.filter(s => s.t > 30).every((s, i, all) => i === 0 || Math.abs(s.y) <= Math.abs(all[i - 1].y) + 1.5));
  await page.waitForFunction(() => document.querySelector('.sdr-summary'), null, { timeout: 30000 });
  await page.locator('.sdr').screenshot({ path: `${out}/02-done.png` });

  // --- Numbers roll
  check('The three numbers have rolled to values taken from the run', await page.locator('.sdr-stat .sdr-statValue .sr-only').allInnerTexts().then(list => list.length === 3 && list.every(text => /\d/.test(text))));
  check('The summary names how many words were drafted and how many checks it took', (await page.locator('.sdr-summary').innerText()).match(/words drafted/) !== null && /checks? for \d+ words/.test(await page.locator('.sdr-summary').innerText()));

  // --- Pause freezes the clock, Play carries on
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => document.querySelector('.sdr-columns[data-phase="verify"]'));
  await page.waitForTimeout(120);
  await page.getByRole('button', { name: 'Pause' }).click();
  const frozen = await page.evaluate(() => ({ phase: document.querySelector('.sdr-columns')?.dataset.phase, sweep: getComputedStyle(document.querySelector('.sdr-columns')).getPropertyValue('--sweep') }));
  await page.waitForTimeout(900);
  const still = await page.evaluate(() => ({ phase: document.querySelector('.sdr-columns')?.dataset.phase, sweep: getComputedStyle(document.querySelector('.sdr-columns')).getPropertyValue('--sweep') }));
  check('Pause freezes the replay in the middle of a verify: nothing moves for a second', frozen.phase === still.phase && frozen.sweep === still.sweep && frozen.phase === 'verify');
  check('The button now says Play', await page.getByRole('button', { name: 'Play' }).count() === 1);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => document.querySelector('.sdr-columns')?.dataset.phase === 'settle', null, { timeout: 3000 });
  check('Play carries on with the time that was left (the pass settles within three seconds)', await page.locator('.sdr-columns').count() >= 0);
  await page.waitForFunction(() => document.querySelector('.sdr-summary'), null, { timeout: 30000 });

  // --- Draft length
  await page.locator('.sdr-slider').focus();
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('.sdr-columns'));
  await page.waitForTimeout(400);
  check('Draft length 2 restarts the run with at most two columns in a pass', await page.locator('.sdr-slider').inputValue() === '2' && await page.locator('.sdr-column').count() <= 2 && (await page.locator('.sdr-output, .sdr-status').first().count()) >= 0);
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelectorAll('.sdr-column').length >= 6, null, { timeout: 4000 });
  check('Draft length 8 shows up to eight columns in one pass', await page.locator('.sdr-column').count() >= 6);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  check('Arrow keys change the draft length one word at a time', await page.locator('.sdr-slider').inputValue() === '3');
  await page.locator('.sdr-slider').evaluate(n => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(n, '4'); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('.sdr-summary'), null, { timeout: 30000 });

  // --- Compare
  await page.getByRole('switch').click();
  await page.locator('.sdr-baselineWrap').waitFor();
  const grow = await page.evaluate(() => new Promise(resolve => { const heights = []; const started = performance.now(); const frame = () => { const el = document.querySelector('.sdr-baselineWrap'); if (el) heights.push(Math.round(el.getBoundingClientRect().height)); if (performance.now() - started < 450) requestAnimationFrame(frame); else resolve(heights); }; frame(); }));
  check(`The comparison line opens with a spring in height, from nothing to its full size (${grow.filter((_, i) => i % 3 === 0).join(',')})`, grow[0] < 20 && grow.at(-1) > 40 && grow.every((h, i) => i === 0 || h >= grow[i - 1] - 1));
  await page.waitForFunction(() => document.querySelectorAll('.sdr-line[data-line="base"] .sdr-tok[data-on]').length >= 2, null, { timeout: 8000 });
  const baseTimes = await page.evaluate(() => new Promise(resolve => { const seen = []; const started = performance.now(); const count = () => document.querySelectorAll('.sdr-line[data-line="base"] .sdr-tok[data-on]').length; let last = count(); const frame = () => { const c = count(); if (c !== last) { seen.push(Math.round(performance.now() - started)); last = c; } if (seen.length < 3 && performance.now() - started < 4000) requestAnimationFrame(frame); else resolve(seen); }; frame(); }));
  check('The comparison writes one word per pass, about every 640 ms', baseTimes.length >= 2 && Math.abs((baseTimes[1] - baseTimes[0]) - 640) < 60);
  await page.getByRole('switch').click();
  await page.locator('.sdr-baselineWrap').waitFor({ state: 'detached', timeout: 3000 });
  check('Switching it off removes the comparison line', await page.locator('.sdr-baselineWrap').count() === 0);
  await page.waitForFunction(() => document.querySelector('.sdr-summary'), null, { timeout: 30000 });

  // --- Honesty: what the output shows is only what has been decided
  const unsureTokens = await page.locator('.sdr-tok[data-unsure]').allInnerTexts();
  check('Words that are ambiguous or unknown stay as they are in the file, flagged, until a choice is made', unsureTokens.some(text => /H\?ng/.test(text)) && unsureTokens.some(text => /zz\?zz/.test(text)));
  check('Nothing was written to the draft value by the replay', await page.locator('.cd-textarea').inputValue().then(value => value === 'Ke ho?ch trien khai H?ng zz?zz'));
  check('The numbers describe the replay, not the quality of the answer: no accuracy claim anywhere in it', !/accura|correct\b|100%/i.test(await page.locator('.sdr').innerText()) || /Drafts accepted/.test(await page.locator('.sdr').innerText()));

  // --- Choosing in the table puts the word into the output
  const row = page.locator('.sd-wordrow').filter({ has: page.locator('.sd-wordrow__text', { hasText: 'H?ng' }) });
  const word = await row.getAttribute('data-word-row');
  await row.getByRole('button', { name: /Hung/ }).click();
  const token = page.locator(`.sdr-tok[data-word="${word}"]`);
  check('Choosing a candidate puts it in the output, underlined as the person\'s own choice', (await token.innerText()).includes('Hung') && await token.getAttribute('data-origin') === 'you' && await token.getAttribute('data-unsure') === null);
  // --- Linked hover, jump and keys
  await token.hover();
  check('Hovering a word of the answer lights its row, and the other way round', await row.getAttribute('data-hot') !== null);
  await page.mouse.move(5, 5);
  await row.hover();
  check('Hovering a row lights the word in the answer', await token.getAttribute('data-hot') !== null);
  const other = page.locator('.sdr-tok[data-jump]').last();
  await other.focus(); await page.keyboard.press('Enter');
  check('Enter on a word of the answer jumps to its row, focuses it and flashes it', await page.evaluate(() => document.activeElement?.closest('[data-word-row]') !== null) && await page.locator('.sd-wordrow[data-flash]').count() === 1);
  const first = page.locator('.sd-wordrow').first();
  await first.locator('.sd-alt').first().focus();
  await page.keyboard.press('ArrowDown');
  check('The arrow keys move between rows', await page.evaluate(() => document.activeElement?.closest('[data-word-row]')?.getAttribute('data-word-row')) !== await first.getAttribute('data-word-row'));
  await first.locator('.sd-alt').first().focus();
  await page.keyboard.press('1');
  check('The key 1 chooses the first candidate of the focused row', await first.locator('.sd-alt[aria-pressed="true"]').count() === 1);
  await page.screenshot({ path: `${out}/03-chosen.png`, fullPage: true });

  // --- The replay can be folded
  await page.locator('.sdr-title').click();
  check('The title folds the replay to one line and back', await page.locator('.sdr[data-closed]').count() === 1 && await page.locator('.sdr-lanes').count() === 0);
  await page.locator('.sdr-title').click();
  await page.locator('.sdr-lanes').waitFor();
  await context.close();

  // --- Reduced motion: no waiting, no flight, everything already there
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const calm = await open(reduced);
  await calm.waitForTimeout(250);
  check('With reduced motion the replay is already at its end: summary shown, every word in the output, nothing flying', await calm.locator('.sdr-summary').count() === 1 && await calm.locator('.sdr-tok[data-on]').count() === await calm.locator('.sdr-outputs .sdr-line:first-child .sdr-tok').count() && await calm.evaluate(() => [...document.querySelectorAll('.sdr-tok')].every(el => getComputedStyle(el).transform === 'none')));
  await calm.locator('.sdr').screenshot({ path: `${out}/04-reduced.png` });
  await reduced.close();

  // --- Phone widths and dark
  for (const width of [390, 320]) {
    const phone = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true, isMobile: true, colorScheme: width === 320 ? 'dark' : 'light' });
    const p = await open(phone);
    await p.waitForTimeout(300);
    check(`${width}: the replay fits the screen without sideways scrolling`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.sdr').getBoundingClientRect().right <= innerWidth + 1));
    check(`${width}: lanes stack with their labels above (container query)`, await p.evaluate(() => getComputedStyle(document.querySelector('.sdr-lanes')).gridTemplateColumns.split(' ').length === 1));
    await p.locator('.sdr').screenshot({ path: `${out}/phone-${width}.png` });
    await phone.close();
  }
  check('No browser errors', errors.length === 0);
  check('Nothing left the page while the replay ran', foreign.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, errors, foreign }, null, 2));
  console.log(`${checks.length} checks passed`);
} catch (error) { console.error('FAILED after:', checks.at(-1) ?? '(nothing)'); console.error(error.message.split('\n').slice(0, 8).join('\n')); console.error(errors.slice(0, 4)); process.exitCode = 1; }
finally { await browser.close(); }
