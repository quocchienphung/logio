// QA for the Orchestrator section (src/components/sites/orchestrator): the run's timeline against the recording of the public preview, the wires, the
// totals, concurrency (queue, raising it mid-run), Retry now, approvals, the transcript spring, the tool-call group, the timeline's replay, scrubber,
// pinned path and hover card, both themes, a phone and reduced motion. Usage: node scripts/qa/orchestrator.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/orchestrator/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=orchestrator`;
const results = [], errors = [];
const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
const check = async (name, run) => {
  if (only && !only.test(name)) return;
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 6).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });

const SAMPLER = () => {
  window.__ev = []; window.__t0 = 0;
  window.__arm = () => {
    window.__ev = []; window.__t0 = performance.now();
    let prev = {};
    const note = (key, value) => { if (prev[key] !== value) { prev[key] = value; window.__ev.push([Math.round(performance.now() - window.__t0), key, value]); } };
    const tick = () => {
      const root = document.querySelector('.ob');
      if (root) {
        note('plan', root.querySelectorAll('.ob-plan__item').length);
        [...root.querySelectorAll('.ob-lane')].forEach((lane, index) => note(`lane${index + 1}`, lane.dataset.phase));
        note('run', root.querySelector('.ob-toolbar .op-btn')?.textContent.trim());
        const nodes = root.querySelectorAll('.ob-node');
        note('summary', nodes[1]?.querySelector('.ob-status:last-child, .ob-node__status')?.textContent.trim().replace(/\s+/g, ' '));
      }
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
    document.addEventListener('click', event => { if (event.target.closest?.('.ob-toolbar .op-btn')) window.__ev.push([Math.round(performance.now() - window.__t0), 'click', 1]); }, true);
  };
  window.__disarm = () => { cancelAnimationFrame(window.__raf); return window.__ev; };
};
async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'], ...options });
  await context.addInitScript(SAMPLER);
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource|hydrat/i.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ob');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  return { context, page };
}
const runButton = page => page.locator('.ob-toolbar .op-btn');
const finished = (page, timeout = 40000) => page.waitForFunction(() => /Run again/.test(document.querySelector('.ob-toolbar')?.textContent ?? '') && document.querySelectorAll('.ob-lane[data-phase="done"]').length >= 1, null, { timeout });
const started = page => page.waitForFunction(() => /Stop/.test(document.querySelector('.ob-toolbar')?.textContent ?? '') && document.querySelectorAll('.ob-lane[data-phase="done"]').length === 0, null, { timeout: 8000 });
const idle = async page => { await finished(page); await page.waitForTimeout(900); };
const springAt = (o, z, t) => { if (t <= 0) return 0; if (Math.abs(z - 1) < 1e-3) return 1 - (1 + o * t) * Math.exp(-o * t); if (z < 1) { const wd = o * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * o * t) * (Math.cos(wd * t) + (z * o / wd) * Math.sin(wd * t)); } const s = o * Math.sqrt(z * z - 1), r1 = -z * o + s, r2 = -z * o - s; return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1); };
/** rmse of a recorded 0..1 series against a spring, with the start free within a frame or two (the sampler runs on its own phase) */
const springRmse = (points, o, z, t0) => { let best = Infinity; for (let shift = -0.045; shift <= 0.045; shift += 0.003) { const sample = points.filter(p => p[0] - t0 < 0.9 && p[0] - t0 > -0.05); const r = Math.sqrt(sample.reduce((sum, p) => sum + (springAt(o, z, p[0] - t0 + shift) - p[1]) ** 2, 0) / sample.length); if (r < best) best = r; } return best; };
const near = (actual, expected, tolerance, what) => assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual} vs recorded ${expected} (±${tolerance})`);

// Recorded from the public preview (run-events.txt), ms after Run
const RECORDED = {
  plan: [410, 641, 871, 1101], starting: [1465, 1575, 1686, 1799], working: [1925, 2036, 2149, 2260],
  done: { 2: 8376, 4: 9273 - 364 + 0, 1: 9273, 3: 10048 },
};

{
  const { context, page } = await open();
  await check('The section is in the Techniques folder, the page has no errors, and the first run starts when it scrolls into view', async () => {
    assert.equal(await page.locator('.ui-as-side__item[aria-current="page"]').innerText(), 'Orchestrator');
    await page.waitForFunction(() => /Stop/.test(document.querySelector('.ob-toolbar')?.textContent ?? ''), null, { timeout: 8000 });
  });
  await idle(page);

  await check('Layout (side by side): the card, header, lanes and the summary have the measured sizes', async () => {
    const m = await page.evaluate(() => {
      const css = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
      const rect = sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
      return { root: css('.ob', 'borderRadius'), lane: css('.ob-lane', 'borderRadius'), laneRect: rect('.ob-lane'), gap: css('.ob-flow', 'rowGap'), cols: css('.ob-lanes', 'gridTemplateColumns').split(' ').length, headPad: css('.ob-header', 'padding'), goal: css('.ob-goal', 'fontSize') + ' ' + css('.ob-goal', 'fontWeight'), flowPad: css('.ob-flow', 'padding'), limit: css('.op-seg', 'borderRadius') };
    });
    assert.equal(m.root, '26px'); assert.equal(m.lane, '16px'); assert.equal(m.laneRect[1], 129, `lane height ${m.laneRect[1]}`);
    assert.equal(m.gap, '40px'); assert.equal(m.cols, 4); assert.equal(m.headPad, '18px 20px 16px'); assert.equal(m.goal, '16px 500'); assert.equal(m.flowPad, '20px 20px 22px'); assert.equal(m.limit, '18px');
  });

  await check('Wires: a trunk with two buses and an elbow into the last lane, a branch and a port per lane and side (17 shapes), the colours of the series', async () => {
    const wires = await page.evaluate(() => { const svg = document.querySelector('.ob-wires'); return { trunk: svg.querySelector('.ob-trunk').getAttribute('d'), branches: svg.querySelectorAll('.ob-branch').length, ports: svg.querySelectorAll('.ob-port').length, on: svg.querySelectorAll('[data-on]').length, last: svg.querySelectorAll('.ob-branch')[6]?.getAttribute('d'), aria: svg.getAttribute('aria-hidden') }; });
    assert.match(wires.trunk, /^M[\d.]+ [\d.]+V[\d.]+Q[\d.]+ [\d.]+ [\d.]+ [\d.]+H[\d.]+M[\d.]+ [\d.]+H[\d.]+Q[\d.]+ [\d.]+ [\d.]+ [\d.]+V[\d.]+$/);
    assert.equal(wires.branches, 8); assert.equal(wires.ports, 8); assert.equal(wires.on, 16, 'every lane has returned');
    assert.match(wires.last, /Q/); assert.equal(wires.aria, 'true');
  });
  await page.screenshot({ path: `${out}/finished-wide.png`, clip: { x: 220, y: 0, width: 1220, height: 1000 } });

  await check('The totals are the recording\'s: 119.7k tokens, $0.19, 11.4s wall time, 32.8s in sequence, 2.9x faster; lanes 31.2k/19.5k/28.9k/24.7k', async () => {
    const text = (await page.locator('.ob-totals').innerText()).replace(/\n/g, ' ');
    assert.match(text, /Tokens 119\.7k Cost \$0\.19 Wall time 11\.4s In sequence 32\.[789]s 2\.9x faster than running in sequence/);
    const metrics = await page.locator('.ob-lane__metrics').allInnerTexts();
    assert.deepEqual(metrics.map(item => item.replace(/\s+/g, ' ')), ['31.2k tokens · $0.079', '19.5k tokens · $0.002', '28.9k tokens · $0.012', '24.7k tokens · $0.012'].map(item => item.replace(' · ', ' ').replace(/ \$/, ' $')).map(item => item));
  });

  await check('A run replays the recording: plan items, dispatches, lanes working and returning, merge and finish within 150 ms of the preview', async () => {
    await page.evaluate(() => window.__arm());
    await runButton(page).click();
    await started(page);
    await finished(page);
    await page.waitForTimeout(600);
    const events = await page.evaluate(() => window.__disarm());
    const clickAt = events.find(item => item[1] === 'click')?.[0] ?? 0;
    const t = (key, value) => events.find(item => item[0] >= clickAt && item[1] === key && item[2] === value)?.[0];
    const t0 = clickAt;
    [1, 2, 3, 4].forEach(n => near(t('plan', n) - t0, RECORDED.plan[n - 1], 150, `plan item ${n}`));
    [1, 2, 3, 4].forEach(n => { near(t(`lane${n}`, 'starting') - t0, RECORDED.starting[n - 1], 150, `lane ${n} starts`); near(t(`lane${n}`, 'working') - t0, RECORDED.working[n - 1], 150, `lane ${n} works`); });
    const returned = [1, 2, 3, 4].map(n => [n, t(`lane${n}`, 'done') - t0]).sort((a, b) => a[1] - b[1]);
    assert.deepEqual(returned.map(item => item[0]), [2, 4, 1, 3], 'Haiku, GPT, Sonnet, Gemini');
    [[2, 8376], [4, 8909], [1, 9273], [3, 10048]].forEach(([n, expected]) => near(returned.find(item => item[0] === n)[1], expected, 150, `lane ${n} returns`));
    const stopAt = events.find(item => item[0] >= clickAt && item[1] === 'run' && item[2] === 'Stop')[0];
    near(events.find(item => item[0] > stopAt && item[1] === 'run' && String(item[2]).includes('Run again'))[0] - t0, 11243, 200, 'the run ends (the label starts to change)');
    const failed = t('lane3', 'error') - t0, retried = events.filter(item => item[1] === 'lane3' && item[2] === 'working')[1][0] - t0;
    near(failed, 4834, 150, 'the 503'); near(retried - failed, 2000, 150, 'the retry wait');
  });

  await check('Packets: one per dispatch and one per return, 460 ms on the in-out curve, removed when they land', async () => {
    await page.evaluate(() => { window.__pulses = []; new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains('ob-pulse')) setTimeout(() => { const a = n.getAnimations()[0]; window.__pulses.push([n.getAttribute('stroke'), a?.effect.getTiming().duration, a?.effect.getTiming().easing, getComputedStyle(n).strokeDasharray, n.getTotalLength()]); }, 80); }).observe(document.querySelector('.ob-wires'), { childList: true }); });
    await runButton(page).click();
    await started(page);
    await finished(page);
    await page.waitForTimeout(1500);
    const pulses = await page.evaluate(() => window.__pulses);
    assert.equal(pulses.length, 8, `${pulses.length} packets`);
    for (const pulse of pulses) { assert.equal(pulse[1], 460); assert.equal(pulse[2], 'cubic-bezier(0.65, 0, 0.35, 1)'); assert.ok(Math.abs(parseFloat(pulse[3].split(', ')[1]) - (pulse[4] + 18)) < 0.01 && pulse[3].startsWith('18px, '), `one dash of 18px and a gap of the route plus 18, as the preview (${pulse[3]} for ${pulse[4]})`); }
    assert.equal(await page.locator('.ob-pulse').count(), 0, 'all removed');
  });

  await check('A lane\'s transcript opens and closes on a critically damped spring (fitted from the recording: omega 19 to 21); the closed one is inert', async () => {
    const lane = page.locator('.ob-lane').first();
    const button = lane.locator('.ob-lane__button');
    assert.equal(await lane.locator('.ob-collapse').getAttribute('inert'), '');
    await page.evaluate(() => { window.__h = []; const el = document.querySelector('.ob-lane .ob-collapse'); const t0 = performance.now(); const tick = () => { window.__h.push([performance.now() - t0, el.getBoundingClientRect().height]); window.__hr = requestAnimationFrame(tick); }; window.__hr = requestAnimationFrame(tick); });
    await button.click(); await page.waitForTimeout(1100);
    const open = await page.evaluate(() => { cancelAnimationFrame(window.__hr); return window.__h; });
    const target = open.at(-1)[1];
    assert.ok(target > 100, `open height ${target}`);
    const t0 = open.find(p => p[1] > 0.5)?.[0] ?? 0;
    const rmse = springRmse(open.map(p => [p[0] / 1000, p[1] / target]), Math.sqrt(380), 39 / (2 * Math.sqrt(380)), t0 / 1000);
    console.log(`   transcript open: ${target.toFixed(0)}px, rmse against stiffness 380 / damping 39: ${rmse.toFixed(4)}`);
    assert.ok(rmse < 0.03, `rmse ${rmse}`);
    assert.equal(await button.getAttribute('aria-expanded'), 'true');
    assert.match(await lane.locator('.ob-transcript').innerText(), /Web search[\s\S]*Fetch page[\s\S]*Read file[\s\S]*Write findings[\s\S]*Returned to the lead/);
    await button.click(); await page.waitForTimeout(900);
    assert.equal(await lane.locator('.ob-collapse').getAttribute('inert'), '');
  });

  await check('Keyboard: arrows, Home and End choose the concurrency; Enter on a lane opens its transcript', async () => {
    const seg = page.locator('.ob-limit .op-seg__button[aria-pressed="true"]');
    await seg.focus();
    await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('.ob-limit .op-seg__button[aria-pressed="true"]').innerText(), '3');
    await page.keyboard.press('Home'); assert.equal(await page.locator('.ob-limit .op-seg__button[aria-pressed="true"]').innerText(), '1');
    await page.keyboard.press('End'); assert.equal(await page.locator('.ob-limit .op-seg__button[aria-pressed="true"]').innerText(), '4');
    const lane = page.locator('.ob-lane__button').nth(1);
    await lane.focus(); await page.keyboard.press('Enter');
    assert.equal(await lane.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Enter');
    assert.equal(await lane.getAttribute('aria-expanded'), 'false');
  });
  await context.close();
}

// ---------------------------------------------------------------- concurrency, Retry now, approvals
{
  const { context, page } = await open();
  await finished(page); await page.waitForTimeout(900);
  await check('Concurrency 2: two lanes start, the others wait ("Queued, next in line", "Queued, 2nd in line"), and the next starts when one returns', async () => {
    await page.locator('.ob-limit .op-seg__button', { hasText: '2' }).click();
    await runButton(page).click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="queued"]').length === 2, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    const text = await page.locator('.ob-lane').evaluateAll(lanes => lanes.map(lane => lane.querySelector('.ob-activity__label')?.textContent.trim()));
    assert.equal(text[2], 'Queued, next in line'); assert.equal(text[3], 'Queued, 2nd in line');
    await page.screenshot({ path: `${out}/queued.png`, clip: { x: 220, y: 150, width: 1220, height: 560 } });
    await page.waitForFunction(() => document.querySelector('.ob-lane:nth-child(3)').dataset.phase === 'starting' || document.querySelector('.ob-lane:nth-child(3)').dataset.phase === 'working', null, { timeout: 15000 });
    assert.equal(await page.locator('.ob-lane[data-phase="done"]').count() >= 1, true, 'a lane returned before the third started');
  });
  await check('Raising the limit mid-run releases the queued lanes at once', async () => {
    await runButton(page).click();                                 // Stop
    await page.waitForFunction(() => /Run again/.test(document.querySelector('.ob-toolbar')?.textContent ?? ''));
    await page.locator('.ob-limit .op-seg__button', { hasText: '1' }).click();
    await runButton(page).click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="queued"]').length === 3, null, { timeout: 8000 });
    await page.locator('.ob-limit .op-seg__button', { hasText: '4' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="queued"]').length === 0, null, { timeout: 3000 });
    await runButton(page).click();
    await page.waitForFunction(() => document.querySelector('.ob-lane').dataset.phase === 'stopped' || document.querySelector('.ob-lane').dataset.phase === 'done', null, { timeout: 5000 });
    assert.equal((await page.locator('.ob-node').first().innerText()).includes('Stopped'), true, 'Stop says so');
  });
  await check('Retry now: while the lane waits to retry, Retry (in the tool calls and in the transcript) skips the wait', async () => {
    await page.locator('.ob-limit .op-seg__button', { hasText: '4' }).click();
    await runButton(page).click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="error"]').length === 1, null, { timeout: 15000 });
    await page.waitForTimeout(500);
    assert.match(await page.locator('.ob-lane[data-phase="error"] .ob-activity__label').innerText(), /Failed, retrying in \d+s/);
    const before = Date.now();
    await page.locator('.tc-call [aria-label^="Retry"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="error"]').length === 0, null, { timeout: 3000 });
    assert.ok(Date.now() - before < 1500, 'the retry was at once');
    await finished(page); await page.waitForTimeout(500);
    assert.match((await page.locator('.ob-totals').innerText()).replace(/\n/g, ' '), /Wall time 10\.[0-9]s/, 'the run finished earlier by what was left of the wait');
  });
  await check('Approvals: with "Ask before a worker writes" each lane waits before its write; Allow carries on, Deny returns without writing; the run still finishes', async () => {
    await page.locator('.orch__switch').click();
    await runButton(page).click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="approval"]').length === 4 || document.querySelectorAll('.tc-call[data-status="approval"]').length >= 3, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/approvals.png`, fullPage: false });
    const asking = await page.locator('.tc-call[data-status="approval"]').count();
    assert.ok(asking >= 1);
    // deny the first, allow the others as they come
    await page.locator('.tc-call[data-status="approval"] [aria-label^="Deny"]').first().click();
    for (let i = 0; i < 12; i += 1) {
      const next = page.locator('.tc-call[data-status="approval"] [aria-label^="Allow"]').first();
      if (await next.count()) await next.click({ timeout: 2000 }).catch(() => {});
      if (/Run again/.test(await runButton(page).innerText())) break;
      await page.waitForTimeout(900);
    }
    await finished(page);
    assert.ok(await page.locator('.ob-lane[data-phase="done"]').filter({ hasText: 'Returned without writing' }).count() >= 1, 'a denied lane returned without writing');
    await page.locator('.orch__switch').click();
  });
  await check('After the run the lead proposes a post: Allow runs it ("Posting…", "Posted"), the header says "Used N tools" and the group folds 450 ms after', async () => {
    await runButton(page).click();
    await started(page);
    await finished(page); await page.waitForTimeout(1200);
    const call = page.locator('.tc-call[data-status="approval"]');
    assert.equal(await call.count(), 1);
    assert.match(await page.locator('.tc-group__toggle').innerText(), /Waiting for approval/);
    const stampsPromise = page.evaluate(() => new Promise(resolve => {
      const out = {};
      const done = () => { const last = [...document.querySelectorAll('.tc-call')].at(-1); if (last?.dataset.status === 'success' && out.success === undefined) out.success = performance.now(); if (document.querySelector('.tc-group__toggle')?.getAttribute('aria-expanded') === 'false' && out.fold === undefined) { out.fold = performance.now(); observer.disconnect(); resolve(out); } };
      const observer = new MutationObserver(done);
      observer.observe(document.querySelector('.tc-group'), { attributes: true, subtree: true, attributeFilter: ['data-status', 'aria-expanded'] });
      setTimeout(() => { observer.disconnect(); resolve(out); }, 6000);
    }));
    await call.locator('[aria-label^="Allow"]').click();
    await page.waitForFunction(() => document.querySelector('.tc-call:last-child')?.dataset.status === 'running' || document.querySelector('.tc-item:last-child .tc-call')?.dataset.status === 'running', null, { timeout: 2000 });
    await page.waitForFunction(() => /Used \d+ tools/.test(document.querySelector('.tc-group__toggle')?.textContent ?? ''), null, { timeout: 3000 });
    const stamps = await stampsPromise;
    assert.ok(stamps.fold !== undefined, 'the group folded itself');
    near(stamps.fold - (stamps.success ?? stamps.fold), 450, 120, 'the group folds 450 ms after the last call finished');
    await page.locator('.tc-group__toggle').click(); await page.waitForTimeout(900);
    assert.match(await page.locator('.tc-call').last().innerText(), /Posted to #pricing-review/);
  });
  await check('Deny on the post marks it denied and the header totals the other calls', async () => {
    await runButton(page).click();
    await started(page);
    await finished(page); await page.waitForTimeout(1200);
    await page.locator('.tc-call[data-status="approval"] [aria-label^="Deny"]').click();
    await page.waitForFunction(() => document.querySelector('.tc-call[data-status="denied"]'), null, { timeout: 2000 });
    assert.match(await page.locator('.tc-group__toggle').innerText(), /Used 17 tools/);
  });
  await context.close();
}

// ---------------------------------------------------------------- tool calls
{
  const { context, page } = await open();
  await finished(page); await page.waitForTimeout(1200);
  await check('A call opens into Input and Output (key/value, results, JSON, text) with copy buttons; the spring is the recorded one (stiffness 182, damping 27.5)', async () => {
    await page.locator('.tc-group__toggle[aria-expanded="false"]').click().catch(() => {});
    await page.waitForTimeout(900);
    const call = page.locator('.tc-call').first();
    await page.evaluate(() => { window.__h = []; const el = document.querySelector('.tc-call .tc-bodyclip'); const t0 = performance.now(); const tick = () => { window.__h.push([performance.now() - t0, el.getBoundingClientRect().height]); window.__hr = requestAnimationFrame(tick); }; window.__hr = requestAnimationFrame(tick); });
    await call.locator('.tc-toggle').click(); await page.waitForTimeout(1000);
    const series = await page.evaluate(() => { cancelAnimationFrame(window.__hr); return window.__h; });
    const target = series.at(-1)[1];
    const t0 = series.find(p => p[1] > 0.5)?.[0] ?? 0;
    const rmse = springRmse(series.map(p => [p[0] / 1000, p[1] / target]), Math.sqrt(182), 27.5 / (2 * Math.sqrt(182)), t0 / 1000);
    console.log(`   row open: ${target.toFixed(0)}px, rmse ${rmse.toFixed(4)}`);
    assert.ok(rmse < 0.03);
    const text = await call.innerText();
    assert.match(text, /Input[\s\S]*query[\s\S]*Output[\s\S]*#1\s+Notewise pricing/);
    await call.screenshot({ path: `${out}/call-open.png` });
    await call.locator('[aria-label="Copy output"]').click();
    await page.waitForTimeout(300);
    assert.equal(await call.locator('[aria-label="Copy output"]').getAttribute('data-copy-state'), 'copied');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /#1 Notewise pricing/);
    await call.locator('.tc-toggle').click();
  });
  await check('A JSON output is tinted and folds after ten lines behind "Show N more lines"', async () => {
    const call = page.locator('.tc-call', { hasText: 'Read docs/pricing.md' }).first();
    await call.locator('.tc-toggle').click(); await page.waitForTimeout(900);
    assert.ok(await call.locator('.tc-json__key').count() >= 2);
    assert.ok(await call.locator('.tc-json__string').count() >= 1);
    await call.locator('.tc-toggle').click();
  });
  await check('The lane picker filters the calls; the header counts them', async () => {
    await page.locator('.orch__card .op-seg__button', { hasText: 'Quillstack' }).click(); await page.waitForTimeout(900);
    assert.equal(await page.locator('.tc-call').count(), 4);
    assert.match((await page.locator('.tc-group__toggle').innerText()).replace(/\s+/g, ' '), /Used 4 tools 1 failed/);
    await page.locator('.orch__card .op-seg__button', { hasText: 'All' }).click();
  });
  await context.close();
}

// ---------------------------------------------------------------- timeline
{
  const { context, page } = await open();
  await finished(page); await page.waitForTimeout(1200);
  await page.locator('.tl').scrollIntoViewIfNeeded();
  await check('The finished timeline: five rows, spans of three kinds, a failed span, a retry, eight connectors, the legend', async () => {
    const m = await page.evaluate(() => ({ rows: document.querySelectorAll('.tl-row').length, kinds: [...new Set([...document.querySelectorAll('.tl-span')].map(s => s.dataset.kind))].sort(), failed: document.querySelectorAll('.tl-span[data-failed]').length, links: document.querySelectorAll('.tl-link').length, ports: document.querySelectorAll('.tl-port').length, legend: document.querySelector('.tl-legend').textContent, status: document.querySelector('.tl-layer[data-on]').textContent, row: getComputedStyle(document.querySelector('.tl-row')).height, bar: getComputedStyle(document.querySelector('.tl-span')).height, playhead: document.querySelector('.tl-playhead').dataset.settled }));
    assert.equal(m.rows, 5); assert.deepEqual(m.kinds, ['thinking', 'tool', 'waiting'].sort()); assert.equal(m.failed, 1); assert.equal(m.links, 8); assert.equal(m.ports, 8);
    assert.equal(m.legend, 'ThinkingTool callWaitingHandoffFailed'); assert.match(m.status.replace(/\s+/g, ' '), /Finished: 5 agents · 11\.4s · 2\.9x faster than sequential · \$0\.19/);
    assert.equal(m.row, '44px'); assert.equal(m.bar, '16px'); assert.equal(m.playhead, '');
  });
  await check('Replay: the clock runs at 1x (and 2x), the header counts tokens and cost, the finished line returns at the end; Restart starts over', async () => {
    const now = () => page.evaluate(() => +document.querySelector('.tl-plot').style.getPropertyValue('--now'));
    await page.getByRole('button', { name: 'Restart' }).click();
    await page.waitForTimeout(200);
    const a = await now(); await page.waitForTimeout(2000); const b = await now();
    near((b - a) / 2, 1, 0.12, 'seconds of run per second at 1x');
    const counters = await page.locator('.tl-layer[data-on]').innerText();
    assert.match(counters.replace(/\s+/g, ' '), /Running Paused Ready · [\d.]+s · [\d,]+ tokens · \$\d\.\d\d/);
    await page.locator('.tl .op-seg__button', { hasText: '2x' }).click();
    const c = await now(); await page.waitForTimeout(1500); const d = await now();
    near((d - c) / 1.5, 2, 0.3, 'seconds of run per second at 2x');
    await page.getByRole('button', { name: 'Pause' }).click();
    const e = await now(); await page.waitForTimeout(500); assert.equal(await now(), e, 'paused');
    assert.match(await page.locator('.tl-layer[data-on]').innerText(), /Paused/);
    await page.getByRole('button', { name: 'Play' }).click();
    await page.waitForFunction(() => document.querySelector('.tl-layer[data-on]')?.textContent.includes('Finished'), null, { timeout: 15000 });
    await page.locator('.tl .op-seg__button', { hasText: '1x' }).click();
  });
  await check('The scrubber: keyboard steps half a second (five with Shift), Home and End; dragging the axis moves the playhead; spans and connectors follow', async () => {
    const knob = page.locator('.tl-knob');
    await knob.focus();
    await page.keyboard.press('Home');
    assert.equal(await knob.getAttribute('aria-valuenow'), '0');
    await page.keyboard.press('ArrowRight'); assert.equal(await knob.getAttribute('aria-valuenow'), '0.5');
    await page.keyboard.press('Shift+ArrowRight'); assert.equal(await knob.getAttribute('aria-valuenow'), '5.5');
    assert.ok(await page.locator('.tl-link').count() >= 3 && await page.locator('.tl-link').count() < 8, 'connectors appear as the playhead passes them');
    await page.keyboard.press('PageUp'); assert.equal(await knob.getAttribute('aria-valuenow'), '10.5');
    assert.match(await knob.getAttribute('aria-valuetext'), /^10\.5s of 11\.4s$/);
    await page.keyboard.press('End');
    assert.equal(await page.locator('.tl-link').count(), 8);
    const box = await page.locator('.tl-axis').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.25, box.y + 10, { steps: 4 }); await page.mouse.up();
    const value = +(await knob.getAttribute('aria-valuenow'));
    near(value, 11.4 * 0.25, 0.6, 'dragged to a quarter');
    await knob.focus(); await page.keyboard.press('End');
  });
  await check('Hover shows the card (agent, model, what it did, tool, time, tokens, failure) and it glides between spans on the morph spring (omega 51, zeta 1.8)', async () => {
    const spans = page.locator('.tl-span');
    const first = page.locator('.tl-span[data-kind="tool"]').first();
    await first.hover(); await page.waitForTimeout(500);
    const card = page.locator('.tl-card');
    assert.match(await card.innerText(), /Web search[\s\S]*tokens/);
    assert.equal(+(await page.locator('.tl-card-layer').evaluate(n => getComputedStyle(n).opacity)), 1);
    await page.evaluate(() => { window.__c = []; const el = document.querySelector('.tl-card-layer'); const t0 = performance.now(); const tick = () => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); window.__c.push([performance.now() - t0, m.e, m.f]); window.__cr = requestAnimationFrame(tick); }; window.__cr = requestAnimationFrame(tick); });
    const failed = page.locator('.tl-span[data-failed]');
    await failed.hover(); await page.waitForTimeout(900);
    const series = await page.evaluate(() => { cancelAnimationFrame(window.__cr); return window.__c; });
    const x0 = series[0][1], x1 = series.at(-1)[1];
    const t0 = series.find(p => Math.abs(p[1] - x0) > 0.3)?.[0] ?? 0;
    const rmse = springRmse(series.map(p => [p[0] / 1000, (p[1] - x0) / (x1 - x0)]), 51, 1.8, t0 / 1000);
    console.log(`   card glide: ${x0.toFixed(0)} to ${x1.toFixed(0)}, rmse ${rmse.toFixed(4)}`);
    assert.ok(rmse < 0.05);
    assert.match(await card.innerText(), /Failed: The page returned 503/);
    await page.screenshot({ path: `${out}/card.png`, clip: { x: 220, y: 0, width: 1220, height: 1000 } });
    await page.mouse.move(5, 5); await page.waitForTimeout(400);
    assert.equal(+(await page.locator('.tl-card-layer').evaluate(n => getComputedStyle(n).opacity)), 0);
    void spans;
  });
  await check('Pinning a span lights its handoff path and dims the others; Escape unpins; arrows move between spans (one tab stop)', async () => {
    const target = page.locator('.tl-span').filter({ has: page.locator('.tl-span__icon') }).first();
    const retried = page.locator('.tl-span[data-kind="tool"]').nth(5);
    const withNext = page.locator('.tl-span[data-kind="tool"]').first();
    await retried.click(); await page.waitForTimeout(400);
    assert.equal(await page.locator('.tl-plot').getAttribute('data-path'), '');
    assert.ok(await page.locator('.tl-span[data-dim]').count() > 5);
    assert.equal(await page.locator('.tl-link[data-hot]').count(), 2);
    assert.equal(await retried.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    assert.equal(await page.locator('.tl-plot').getAttribute('data-path'), null);
    assert.equal(await page.locator('.tl-span[tabindex="0"]').count(), 1, 'the chart is one tab stop');
    await withNext.focus(); await page.keyboard.press('ArrowRight');
    assert.notEqual(await page.evaluate(() => document.activeElement?.dataset.spanId), await withNext.getAttribute('data-span-id'));
    void target;
  });
  await context.close();
}

// ---------------------------------------------------------------- live: the timeline follows the run
{
  const { context, page } = await open();
  await finished(page); await page.waitForTimeout(600);
  await check('While a run is going the timeline is live: Running, the clock follows the run, the controls are hidden, open spans grow; it settles on the summary', async () => {
    await runButton(page).click();
    await page.waitForTimeout(3500);
    await page.locator('.tl').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.tl-footer [aria-label="Play"]').count(), 0, 'no playback controls while live');
    assert.match((await page.locator('.tl-layer[data-on]').innerText()).replace(/\s+/g, ' '), /Running Paused Ready · [\d.]+s · [\d,]+ tokens/);
    assert.ok(await page.locator('.tl-span[data-state="active"]').count() >= 3, 'lanes are active');
    await page.screenshot({ path: `${out}/live.png`, clip: { x: 220, y: 0, width: 1220, height: 1000 } });
    await finished(page); await page.waitForTimeout(1200);
    assert.match(await page.locator('.tl-layer[data-on]').innerText(), /Finished:/);
    assert.equal(await page.locator('.tl-footer [aria-label="Play"]').count(), 1, 'replay controls are back');
  });
  await context.close();
}

// ---------------------------------------------------------------- themes, phone, reduced motion
{
  const { context, page } = await open();
  await finished(page); await page.waitForTimeout(1500);
  await check('Dark theme: the card, lanes, spans and calls take the dark tokens', async () => {
    const light = await page.evaluate(() => ({ surface: getComputedStyle(document.querySelector('.ob')).backgroundColor, series: getComputedStyle(document.querySelector('.ob-plan__dot')).backgroundColor }));
    await page.evaluate(() => document.querySelector('.crm-page')?.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(500);
    const colours = await page.evaluate(() => ({ surface: getComputedStyle(document.querySelector('.ob')).backgroundColor, text: getComputedStyle(document.querySelector('.ob-goal')).color, series: getComputedStyle(document.querySelector('.ob-plan__dot')).backgroundColor }));
    assert.match(colours.surface, /^(oklch\(0\.215|lab\((1\d|[0-9])\.|rgb\(\d{1,2},)/);
    assert.notEqual(colours.series, light.series, 'the series colours are the dark ones');
    assert.notEqual(colours.surface, light.surface);
    await page.screenshot({ path: `${out}/dark.png`, fullPage: false });
    await page.evaluate(() => document.querySelector('.crm-page')?.setAttribute('data-theme', 'light'));
  });
  await context.close();
}
{
  const { context, page } = await open({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  await check('Phone: no horizontal scroll, lanes stacked under one trunk, totals in two columns, the timeline scrolls inside its frame, the labels narrow', async () => {
    await finished(page); await page.waitForTimeout(1500);
    const m = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cols: getComputedStyle(document.querySelector('.ob-lanes')).gridTemplateColumns.split(' ').length, stats: getComputedStyle(document.querySelector('.ob-stats')).gridTemplateColumns.split(' ').length, trunk: document.querySelector('.ob-trunk').getAttribute('d'), role: getComputedStyle(document.querySelector('.ob-node__role')).display, label: getComputedStyle(document.querySelector('.tl-inner')).getPropertyValue('--label-w') }));
    assert.ok(m.overflow <= 1, `page scrolls sideways by ${m.overflow}`); assert.equal(m.cols, 1); assert.equal(m.stats, 2); assert.match(m.trunk, /^M[\d.]+ [\d.]+V[\d.]+$/); assert.equal(m.role, 'none');
    await page.screenshot({ path: `${out}/phone.png`, fullPage: true });
  });
  await context.close();
}
{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  await check('Reduced motion: nothing starts by itself, Run works, there are no packets, the chunks and swaps do not animate, every state is still there', async () => {
    await page.waitForTimeout(2500);
    assert.match(await runButton(page).innerText(), /Run/);
    assert.equal(/Stop/.test(await runButton(page).innerText()), false, 'it did not start by itself');
    await runButton(page).click();
    await page.waitForTimeout(3000);
    assert.equal(await page.locator('.ob-pulse').count(), 0);
    assert.equal(await page.locator('.op-chunk').count(), 0);
    await finished(page); await page.waitForTimeout(600);
    assert.match((await page.locator('.ob-totals').innerText()).replace(/\n/g, ' '), /Tokens 119\.7k/);
  });
  await context.close();
}
await check('No page errors', async () => { assert.deepEqual(errors, []); });
await browser.close();
const failed = results.filter(result => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
