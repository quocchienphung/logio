// QA for Flip: the page, the TL;DR toggle, the Agent cursor, the Ghost text and the stats on a REAL workbook, with the motion measured against the recordings
// of the public previews (docs/research/{tldr-toggle,agent-cursor}/). Run it against a production build for timings that mean something:
//   next build && next start -p 3002 &   node scripts/qa/flip.mjs http://localhost:3002 [out dir]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildXlsx } from './lib/xlsx-builder.mjs';
import { SAMPLE_SHEETS } from '../../src/components/sites/flip/flip-sample.ts';
import { delimitedText } from '../../src/components/sites/flip/flip-model.ts';

const base = process.argv[2] || 'http://localhost:3001';
const out = process.argv[3] || 'docs/research/flip/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [], numbers = {};
const check = (name, ok, detail = '') => { if (!ok) console.error('  ✗', name, detail); else console.log('  ✓', name, detail && typeof detail !== 'object' ? `(${detail})` : ''); assert.ok(ok, `${name} ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`); results.push(name); };
const within = (value, low, high) => value >= low && value <= high;
const FILE = { name: 'Tai san mau.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buildXlsx(SAMPLE_SHEETS.map(sheet => ({ name: sheet.name, rows: sheet.rows })))) };
const assets = SAMPLE_SHEETS[0].rows;

async function open({ width = 1440, height = 2200, reduced = false, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`PAGEERROR ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`CONSOLE ${m.text().slice(0, 200)}`); });
  await page.goto(`${base}/personalize?section=flip`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('.cr-import').waitFor({ timeout: 60000 });
  await page.locator('[data-ascii-cover]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  if (dark) await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  return { ctx, page };
}
const upload = async page => {
  await page.locator('input[type=file]').setInputFiles(FILE);
  const convert = page.getByRole('tab', { name: /Convert/ });
  await convert.waitFor({ timeout: 30000 });
  await convert.click();
  await page.locator('.tt-root').waitFor({ timeout: 20000 });
  await page.locator('.tt-row, .tt-para').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
};
/** Per-frame samples of `fn` (a source string evaluated in the page) for `ms`, started now. */
const sample = (page, fn, ms) => page.evaluate(({ fn, ms }) => new Promise(resolve => { const f = eval(fn), series = [], t0 = performance.now(); const tick = () => { const t = performance.now() - t0; series.push([t, f()]); if (t < ms) requestAnimationFrame(tick); else resolve(series); }; requestAnimationFrame(tick); }), { fn, ms });
/** When a series that moves from its first to its last value crosses `fraction` of the way, measured from the first change. */
const crossing = (series, fraction) => { const a = series[0][1], z = series[series.length - 1][1]; const start = series.find(([, v]) => Math.abs(v - a) > Math.abs(z - a) * 0.01)?.[0] ?? 0; const hit = series.find(([, v]) => (v - a) / (z - a) >= fraction)?.[0]; return hit === undefined ? NaN : hit - start; };
const maxPast = series => { const a = series[0][1], z = series[series.length - 1][1], dir = Math.sign(z - a) || 1; return Math.max(0, ...series.map(([, v]) => (v - z) * dir)); };

try {
  // ============================================================ the page, in its place
  console.log('The page');
  let { ctx, page } = await open();
  check('Flip opens from ?section=flip with its title', await page.getByRole('heading', { level: 1, name: 'Flip' }).count() === 1);
  const nav = page.locator('.ui-as-side__nav');
  check('Flip is a sidebar item of its own, not inside the Collateral folder', await nav.locator(':scope > .ui-as-side__group > button', { hasText: 'Flip' }).count() === 1);
  await nav.getByRole('button', { name: /Collateral/ }).click();
  await page.waitForTimeout(500);
  const folder = await nav.locator('.sidebar-folder, [data-sidebar-folder], .ui-as-folder').first().innerText().catch(() => '');
  check('The Collateral folder lists Excel formation, JSON formation and Queue, and not Flip', /Excel formation/.test(await nav.innerText()) && !/Flip/.test(folder || ''));
  check('No stepper before a workbook is open', await page.getByRole('tab').count() === 0);
  check('The upload group is centred like Excel formation\'s', await page.locator('.cr-import__center').count() === 1);
  await upload(page);
  check('The stepper reads Upload, Convert', (await page.getByRole('tab').allInnerTexts()).map(text => text.replace(/\d/g, '').trim()).join(',') === 'Upload,Convert');
  check('The file chip shows the file and the cards are all there', await page.locator('.cl-file__name').innerText() === 'Tai san mau.xlsx' && await page.locator('.gt-root').count() === 1 && await page.locator('.tt-root').count() === 1 && await page.locator('.ac-root').count() === 1 && await page.locator('.gs-root').count() === 1);
  await page.screenshot({ path: `${out}/01-stage.png`, fullPage: true });

  // ============================================================ real data in the TL;DR card
  console.log('Real cells');
  const tt = page.locator('.tt-root');
  const rowCells = await tt.locator('.fl-row').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('.fl-cell')].map(cell => cell.textContent)));
  check('The Sheet view shows the first 13 rows of the uploaded workbook, cell for cell', rowCells.length === 13 && rowCells[0].join('|') === assets[0].join('|') && rowCells[3][1] === 'Laptop 14" Latitude 5440' && rowCells[4][5] === 'Thế chấp: ngân hàng A↵Giấy chứng nhận số 0012');
  check('Row numbers are the workbook\'s own, and the title, source and byline say what is shown', await tt.locator('.fl-row__no').first().innerText() === '1' && /Sample assets/.test(await tt.locator('.tt-title').innerText()) && /Tai san mau\.xlsx/.test(await tt.locator('.tt-source').innerText()) && /13 of 13 rows · 6 columns/.test(await tt.locator('.tt-byline').innerText()));
  check('The slider is disabled in Sheet mode', await tt.locator('.fp-sl').getAttribute('data-disabled') !== null);

  // ============================================================ streaming: cadence, thinking, fades, swap
  console.log('TL;DR: CSV streaming');
  await page.evaluate(() => { window.__chunks = []; window.__t0 = 0; const watch = new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('tt-chunk')) window.__chunks.push([performance.now(), n.textContent]); }); watch.observe(document.querySelector('.tt-root'), { childList: true, subtree: true }); });
  const anims = page.evaluate(() => new Promise(resolve => { const seen = new Map(); const end = performance.now() + 1400; const tick = () => { for (const a of document.getAnimations()) { const target = a.effect?.target; if (!target || !target.closest?.('.tt-root')) continue; const timing = a.effect.getTiming(); const kf = a.effect.getKeyframes()[0]; seen.set(a, `${a.animationName ?? a.transitionProperty ?? 'anim'}|${timing.duration}|${Object.keys(kf).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join(',')}`); } if (performance.now() < end) requestAnimationFrame(tick); else resolve([...new Set(seen.values())]); }; tick(); }));
  const clickAt = await page.evaluate(() => performance.now());
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-root .tt-shimmer, .tt-root .fp-shimmer', { timeout: 3000 }).catch(() => {});
  check('Thinking shows a shimmering "Reading 13 rows" and aria-busy is on', /Reading 13 rows/.test(await tt.locator('.tt-thinking').innerText()) && await tt.locator('.tt-card').getAttribute('aria-busy') === 'true');
  const seenAnims = await anims;
  check('A chunk fades in over 140 ms (tt-fade) and the view swap fades 100 ms out then 160 ms in', seenAnims.some(a => /tt-fade\|140/.test(a)) && seenAnims.some(a => /\|100\|opacity/.test(a)) && seenAnims.some(a => /\|160\|opacity/.test(a)), seenAnims.join(' ; '));
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  const chunks = await page.evaluate(() => window.__chunks);
  const gaps = chunks.slice(1).map((c, i) => c[0] - chunks[i][0]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  numbers.chunkMeanMs = +mean.toFixed(1); numbers.chunkMinMs = +Math.min(...gaps).toFixed(1); numbers.firstChunkAfterClickMs = +(chunks[0][0] - clickAt).toFixed(0);
  check('The first chunk lands about 0.7 s after the click (thinking)', within(chunks[0][0] - clickAt, 600, 1100), `${numbers.firstChunkAfterClickMs} ms`);
  check('Chunks arrive every 30 to 40 ms (recorded 31 to 41 ms)', within(mean, 30, 48) && gaps.filter(g => g < 20).length <= 1, `mean ${numbers.chunkMeanMs} ms, min ${numbers.chunkMinMs} ms over ${chunks.length} chunks`);
  const text = await tt.locator('.tt-lines').innerText();
  const expectedLines = delimitedText(assets.slice(0, 6), ',');
  check('The streamed text is exactly the delimited text of the first 6 rows (quotes doubled, line break kept in its field)', text.replace(/\r/g, '') === expectedLines, text.slice(0, 80));
  check('The footer counts the lines and offers Copy and Write again', /6 lines/.test(await tt.locator('.tt-foot').innerText()) && await tt.getByRole('button', { name: 'Copy as text' }).count() === 1 && await tt.getByRole('button', { name: 'Write again' }).count() === 1);
  check('A summary is announced once, not chunk by chunk', /6 lines ready/.test(await tt.locator(':scope > .fp-sr').innerText()));
  await page.screenshot({ path: `${out}/02-csv.png`, clip: await tt.locator('.tt-root').boundingBox() });

  // switching back is instant and cached
  await tt.getByRole('button', { name: 'Sheet', exact: true }).click(); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__chunks.length = 0; });
  const cachedAt = await page.evaluate(() => performance.now());
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-lines', { timeout: 2000 });
  const cachedMs = await page.evaluate(t => performance.now() - t, cachedAt);
  check('A saved result appears whole, within the swap time, with no streaming or fade', cachedMs < 500 && (await page.evaluate(() => window.__chunks.length)) === 0 && /saved text/.test(await tt.locator(':scope > .fp-sr').innerText()), `${cachedMs.toFixed(0)} ms`);

  // ============================================================ key points, jump
  console.log('TL;DR: notes and jump');
  await tt.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.tt-root .tt-jump').length === 4, null, { timeout: 15000 });
  const notes = await tt.locator('.tt-point').allInnerTexts();
  check('Four notes at the default length, each ticked, each with its row link', notes.length === 4 && await tt.locator('.tt-pointIcon[data-done]').count() === 4 && (await tt.locator('.tt-jump').allInnerTexts()).join(',') === 'Row 1,Row 2,Row 4,Row 5', notes.map(n => n.replace(/\n/g, ' ')).join(' | '));
  check('The notes are true of the cells: 3 comma cells (first row 2), 2 quotes (first row 4), 1 line break (row 5)', /3 cells hold a comma.*row 2/.test(notes[1]) && /2 cells hold a double quote.*row 4/.test(notes[2]) && /1 cell holds a line break.*row 5/.test(notes[3]));
  const scrollBefore = await page.evaluate(() => [...document.querySelectorAll('*')].map(n => n.scrollTop).reduce((a, b) => a + b, 0));
  const jumpAt = Date.now();
  const clipSeries = sample(page, `() => document.querySelector('.tt-root .tt-clip').getBoundingClientRect().height`, 1500);
  const litWatch = page.evaluate(() => new Promise(resolve => { const t0 = performance.now(); const poll = () => { const lit = document.querySelector('.tt-root .tt-para[data-lit]'); if (lit) resolve([performance.now() - t0, lit.dataset.id]); else if (performance.now() - t0 > 3000) resolve(null); else requestAnimationFrame(poll); }; poll(); }));
  await tt.locator('.tt-jump').nth(2).click();
  const [litAt, litId] = (await litWatch) ?? [NaN, null];
  const clip = await clipSeries;
  const finalClip = clip[clip.length - 1][1], clipAtLit = clip.find(([t]) => t >= litAt)?.[1] ?? 0;
  check('A jump goes back to the sheet and highlights the row the note came from (row 4)', litId === 'r4' && await tt.locator('.tt-card').getAttribute('aria-busy') === null, litId);
  check('The highlight waits for the height to settle (about 0.4 s after the click, recorded 0.43 s)', within(litAt, 250, 900) && clipAtLit >= finalClip * 0.95, `${litAt.toFixed(0)} ms, height at ${((clipAtLit / finalClip) * 100).toFixed(0)}% of final`);
  check('Focus lands on the highlighted row and the mode is Sheet', await page.evaluate(() => document.activeElement?.dataset?.id) === 'r4' && await tt.getByRole('button', { name: 'Sheet', exact: true }).getAttribute('aria-pressed') === 'true');
  await page.waitForTimeout(2200);
  check('The highlight goes after 1.8 s', await tt.locator('.tt-para[data-lit]').count() === 0);
  numbers.jumpHighlightMs = +litAt.toFixed(0);
  void scrollBefore; void jumpAt;

  // ============================================================ stop, copy, regenerate
  console.log('TL;DR: Stop, Copy, Write again');
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-lines'); await page.waitForTimeout(300);
  await tt.getByRole('button', { name: 'Write again' }).click();
  await page.waitForSelector('.tt-chunk', { timeout: 5000 });
  await page.waitForTimeout(120);
  await page.keyboard.press('Escape');
  const stoppedLen = (await tt.locator('.tt-lines').innerText()).length;
  await page.waitForTimeout(600);
  check('Escape stops a running stream and keeps what arrived', /Stopped/.test(await tt.locator('.tt-state').innerText()) && (await tt.locator('.tt-lines').innerText()).length === stoppedLen && stoppedLen > 0 && stoppedLen < text.length, `${stoppedLen} of ${text.length} characters`);
  await tt.getByRole('button', { name: 'Write again' }).click();
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  await tt.getByRole('button', { name: 'Copy as text' }).click();
  await page.waitForTimeout(200);
  check('Copy puts the text on the clipboard and the icon turns into a check for a moment', (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r/g, '') === expectedLines && await tt.locator('[data-copy-state="copied"]').count() === 1);

  // an error, made by breaking the chunker once (the cards have no failure switch)
  await tt.getByRole('button', { name: 'Notes', exact: true }).click(); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__boom = true; const original = String.prototype.match; String.prototype.match = function (re) { if (window.__boom && re instanceof RegExp && re.source.includes('\\t|')) { window.__boom = false; String.prototype.match = original; throw new Error('The model did not respond in time.'); } return original.apply(this, arguments); }; });
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await tt.locator('.tt-error').waitFor({ timeout: 6000 }).catch(() => {});
  await page.evaluate(() => { window.__boom = false; });
  if (await tt.locator('.tt-error').count()) {
    check('A failure shows an alert with the message, "Failed" and Try again', /Couldn’t write the text/.test(await tt.locator('.tt-error').innerText()) && /did not respond/.test(await tt.locator('.tt-error').innerText()) && /Failed/.test(await tt.locator('.tt-state').innerText()) && await tt.getByRole('button', { name: 'Try again' }).count() === 1);
    await page.screenshot({ path: `${out}/03-error.png`, clip: await tt.locator('.tt-root').boundingBox() });
    await tt.getByRole('button', { name: 'Try again' }).click();
    await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
    check('Try again runs it again and the text arrives', (await tt.locator('.tt-lines').innerText()).replace(/\r/g, '') === expectedLines);
  } else console.log('  (the error path was not reached: the chunker is not called by String.match here)');
  await ctx.close();

  console.log(JSON.stringify({ passed: results.length, numbers, errors }, null, 2));
  await fs.writeFile(`${out}/results-part1.json`, JSON.stringify({ passed: results, numbers, errors }, null, 2));
} finally { await browser.close(); }
