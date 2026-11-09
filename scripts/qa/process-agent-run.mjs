// Run with node --experimental-strip-types scripts/qa/process-agent-run.mjs [base-url].
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { createBlankProcess, createLibrary, createNode } from '../../src/components/sites/process/process-model.ts';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/process-agent-run';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], external = new Set(), results = [];
let lastPage;
const doc = createBlankProcess('Ship the pricing page');
doc.root = createNode({ id: 'lead', name: 'Coordinator', mode: 'sequence', task: 'Coordinate the pricing page update', sim: { durationMs: 500 }, children: [
  createNode({ id: 'plan', name: 'Planner', task: 'Plan the pricing update', sim: { durationMs: 800 } }),
  createNode({ id: 'review', name: 'Reviewer', task: 'Review the proposed pricing update', approval: true, askText: 'Approve the pricing update for this run?', sim: { durationMs: 800 } }),
  createNode({ id: 'test', name: 'Tester', task: 'Check the pricing update', sim: { durationMs: 1200, failOnce: true } }),
] });
const library = createLibrary([doc]);
async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.addInitScript(library => {
    window.__monitorQaEvents = [];
    document.addEventListener('pointerdown', event => { const root = document.querySelector('.prun'); window.__monitorQaEvents.push({ target: event.target?.getAttribute?.('class'), name: event.target?.closest?.('button')?.getAttribute('aria-label'), open: root?.dataset.open, state: root?.dataset.state, inside: event.composedPath().includes(root) }); }, true);
    localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true, preferences: false, analytics: false, marketing: false }, version: '1', updatedAt: new Date().toISOString() }));
    if (!localStorage.getItem('agent-run-qa-seeded')) { localStorage.setItem('affectui:acme:process', JSON.stringify(library)); localStorage.setItem('agent-run-qa-seeded', '1'); }
  }, library);
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  lastPage = page;
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => { const url = new URL(req.url()); if (/^http/.test(url.protocol) && url.origin !== new URL(base).origin) external.add(url.origin); });
  await page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.prun-toggle');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  return { page, context };
}
const expand = async page => { const toggle = page.locator('.prun-toggle'); if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click(); await page.waitForTimeout(700); };
const waitState = (page, state) => page.waitForSelector(`.prun[data-state="${state}"]`);
const shot = async (page, name) => { await page.waitForTimeout(650); await page.screenshot({ path: `${out}/local-${name}.png` }); if (await page.locator('.prun-card').count()) await page.locator('.prun').screenshot({ path: `${out}/local-card-${name}.png` }); };
async function check(name, fn) { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
try {
  const { page, context } = await open();
  await check('The top-right bar unfolds into the card (no circle below); Escape folds it back and returns focus to its toggle', async () => {
    assert.equal(await page.locator('.prun-orb').count(), 0);
    assert.equal(await page.locator('.prun-card').count(), 0);
    const closed = await page.locator('.prun').boundingBox();
    assert.ok(closed.y < 40 && closed.height < 60, `closed bar ${JSON.stringify(closed)}`);
    assert.match(await page.locator('.prun').innerText(), /Blocks/);
    await shot(page, 'bar');
    await expand(page);
    assert.equal(Math.round((await page.locator('.prun').boundingBox()).width), 665);
    await shot(page, 'idle');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(550);
    assert.equal(await page.locator('.prun-toggle').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('.prun-card').count(), 0);
    await expand(page);
  });
  await check('Start keeps the popup open; streams real block states and causal connections', async () => {
    await page.locator('.prun-card').getByRole('button', { name: 'Start run', exact: true }).click();
    await waitState(page, 'waiting');
    await page.locator('.prun-step[data-state=waiting]').waitFor();
    assert.equal(await page.locator('.prun-card').count(), 1);
    assert.match(await page.locator('.prun-live-routes').innerText(), /Planner[\s\S]*Reviewer/);
    assert.match(await page.locator('.prun').innerText(), /Simulated block activity/);
    assert.equal(await page.locator('.prun-step[data-block-id=test]').count(), 0);
    assert.equal(await page.locator('.proc-permissions').isVisible(), false);
    await page.locator('.prun-step[data-block-id=plan] .prun-step-head').click();
    assert.match(await page.locator('.prun-step[data-block-id=plan]').innerText(), /Plan the pricing update/);
    await shot(page, 'waiting');
  });
  await check('Reload preserves the pending approval; approve advances the existing engine', async () => {
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.prun-toggle'); await expand(page);
    await page.locator('.prun').getByRole('button', { name: 'Approve', exact: true }).click();
    await page.locator('.prun-step[data-block-id=review][data-state=running]').waitFor();
    await waitState(page, 'failed');
    await page.locator('.prun-fold').click();
    await page.locator('.prun-step[data-block-id=test] .prun-step-head').click();
    assert.match(await page.locator('.prun-step[data-block-id=test]').innerText(), /Simulated failure/);
    await shot(page, 'failed');
  });
  await check('Retry completes and folds the steps; timer freezes; result opens the trace', async () => {
    await page.locator('.prun').getByRole('button', { name: 'Retry block' }).click();
    await waitState(page, 'done');
    await page.waitForTimeout(700);
    const timer = await page.locator('.prun-timer').innerText();
    assert.equal(await page.locator('.prun-steps').count(), 0);
    assert.match(await page.locator('.prun-result').innerText(), /Completed 4 blocks/);
    await page.waitForTimeout(1200); assert.equal(await page.locator('.prun-timer').innerText(), timer);
    await shot(page, 'done');
    await page.locator('.prun-fold').click();
    await page.locator('.prun-step[data-block-id=test] .prun-step-head').click();
    assert.match(await page.locator('.prun-step[data-block-id=test]').innerText(), /Attempt 1/);
    await page.locator('.prun').getByRole('button', { name: 'View trace', exact: true }).click();
    await page.waitForURL(/section=tracing/);
    await page.waitForSelector('.prun', { state: 'detached' });
  });
  await context.close();
  for (const width of [390, 320]) {
    const { page, context } = await open({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    await check(`Mobile ${width}: popup stays inside the page, rejection and Stop work`, async () => {
      await expand(page);
      await page.locator('.prun').getByRole('button', { name: 'Start run', exact: true }).click(); await waitState(page, 'waiting');
      const rect = await page.locator('.prun').boundingBox(); assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= 844);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const overflow = await page.locator('.prun').evaluate(el => el.scrollWidth <= el.clientWidth + 1); assert.equal(overflow, true);
      await shot(page, `mobile-${width}`);
      await page.locator('.prun').getByRole('button', { name: 'Reject', exact: true }).click();
      await page.waitForSelector('.prun-step[data-block-id=review][data-state=stopped]');
      await waitState(page, 'failed');
      await page.locator('.prun').getByRole('button', { name: 'Run again' }).click(); await waitState(page, 'waiting');
      await page.locator('.prun').getByRole('button', { name: 'Stop', exact: true }).click(); await waitState(page, 'stopped');
      await page.locator('.prun').getByRole('button', { name: 'Run again' }).click(); await waitState(page, 'waiting');
      await page.locator('.prun-toggle').click();
      await page.waitForSelector('.prun-card', { state: 'detached' }); assert.equal(await page.locator('.proc-permissions').isVisible(), true);
    });
    await context.close();
  }
  const reduced = await open({ reducedMotion: 'reduce' });
  await check('Reduced motion keeps every state without animation', async () => {
    await expand(reduced.page);
    assert.equal(await reduced.page.locator('.prun').getAttribute('data-motion-off'), 'true');
    assert.equal(await reduced.page.locator('.prun').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  }); await reduced.context.close();
  await check('Connected engine: reported calls disclose their exact input/output; loops retain both rounds', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const connectedDoc = structuredClone(doc); connectedDoc.links = [{ id: 'back', from: 'test', to: 'lead', rounds: 2 }];
    const T = Date.now() - 3000;
    const snapshot = { id: 'reported-run', processId: doc.id, startedAt: T, at: T + 3000, state: 'running', nodes: {
      lead: { status: 'running', cost: .1, started: T + 2000, round: 2, of: 2, rounds: [{ round: 1, status: 'done', cost: .1, started: T, ended: T + 1500 }], calls: [{ id: 'read', kind: 'tool', name: 'Read source', status: 'done', start: T + 2000, end: T + 2300, input: 'src/pricing.ts', output: `export const price = 42;\n${'long-output '.repeat(100)}` }] },
    } };
    await context.addInitScript(baseUrl => { window.__workspaceBackendConfig = { baseUrl, serverProcess: true }; localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true, preferences: false, analytics: false, marketing: false }, version: '1', updatedAt: new Date().toISOString() })); }, `${base}/api/monitor-qa`);
    await context.route('**/api/monitor-qa/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const data = /\/process\/engines$/.test(path) ? [] : /\/process\/runs$/.test(path) ? snapshot : /\/process$/.test(path) ? createLibrary([connectedDoc]) : undefined;
      return route.fulfill({ status: data === undefined ? 404 : 200, contentType: 'application/json', body: JSON.stringify({ data, version: 'qa-1' }) });
    });
    const page = await context.newPage(); lastPage = page;
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' }); await page.waitForSelector('.prun-toggle'); await expand(page);
    assert.match(await page.locator('.prun').innerText(), /Connected engine/);
    assert.equal(await page.locator('.prun-step').count(), 2);
    assert.match(await page.locator('.prun-live-routes').innerText(), /Tester[\s\S]*Coordinator/);
    const current = page.locator('.prun-step').last(); await current.locator('.prun-step-head').click();
    await current.locator('.prun-call summary').click();
    await page.waitForTimeout(600);
    assert.equal(await current.locator('pre').first().innerText(), 'src/pricing.ts');
    assert.match(await current.locator('pre').last().innerText(), /export const price = 42;/);
    await shot(page, 'reported-calls');
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
    assert.equal(await page.locator('.prun-scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    assert.equal(await current.locator('pre').last().evaluate(el => el.scrollWidth > el.clientWidth), true);
    await context.close();
  });
  assert.deepEqual(errors, []); assert.deepEqual([...external], []);
  results.push({ name: 'No page errors or third-party requests', ok: true });
} catch (error) { if (lastPage && !lastPage.isClosed()) { await shot(lastPage, 'failure'); console.log('Failure popup:', (await lastPage.locator('.prun').innerText()).slice(0, 1500)); console.log('Events', await lastPage.evaluate(() => window.__monitorQaEvents?.slice(-16))); } results.push({ name: 'Failure', ok: false, error: String(error.stack) }); throw error; }
finally { await fs.writeFile(`${out}/qa.json`, JSON.stringify({ results, errors, external: [...external] }, null, 2)); await browser.close(); }
