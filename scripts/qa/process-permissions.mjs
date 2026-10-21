// Isolated browser coverage for Process's single-run permission requests. Never uses the user's Chrome profile.
// Usage: node --experimental-strip-types scripts/qa/process-permissions.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { createBlankProcess, createLibrary, createNode } from '../../src/components/sites/process/process-model.ts';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/process/permissions/qa';
await fs.mkdir(out, { recursive: true });
const doc = createBlankProcess('Review the launch');
doc.id = 'permission-demo';
doc.root = createNode({ id: 'coordinator', name: 'Coordinator', role: 'coordinator', task: 'Coordinate the pricing page launch.', approval: true, askText: 'May I coordinate this launch?', limit: 2, sim: { durationMs: 1000 }, children: [
  createNode({ id: 'coder', name: 'Coder', role: 'coder', task: 'Prepare the pricing page changes for review.', tools: ['github'], approval: true, askText: 'Start preparing the pricing page?', limit: 1, sim: { durationMs: 1000 } }),
  createNode({ id: 'writer', name: 'Writer', role: 'helper', task: 'Write the launch announcement.', approval: true, sim: { durationMs: 1000 }, children: [
    createNode({ id: 'publisher', name: 'Publisher', task: 'Prepare a publishing checklist.', sim: { durationMs: 1000 } }),
  ] }),
] });
const library = createLibrary([doc]);
const results = [], errors = [];
const browser = await chromium.launch({ channel: 'chrome' });
const check = async (name, test) => {
  try { await test(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false, error: String(error.message) }); console.log('FAIL', name, error.message); }
};
async function open(options = {}, engine = browser, remote = false) {
  const context = await engine.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.addInitScript(({ library, remote }) => {
    if (remote) window.__workspaceBackendConfig = { baseUrl: 'http://qa.test/api', serverProcess: true };
    else if (!localStorage.getItem('affectui:acme:process')) localStorage.setItem('affectui:acme:process', JSON.stringify(library));
  }, { library, remote });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  if (!remote) await page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  return { context, page };
}
const card = page => page.locator('.proc-permissions .permission-request[role=dialog]');
const run = page => page.locator('.agt__extra').getByRole('button', { name: /^(Run|Run again)$/ });
const stop = page => page.locator('.agt__extra').getByRole('button', { name: 'Stop', exact: true });
const runStore = page => page.evaluate(() => JSON.parse(localStorage.getItem('affectui:acme:process-run') || 'null'));
const waitText = (page, selector, text) => page.waitForFunction(([selector, text]) => document.querySelector(selector)?.textContent.includes(text), [selector, text]);
async function shot(page, name) { await page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' }); }
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const box = await page.locator('.proc-permissions').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height, JSON.stringify(box));
  const dock = await page.locator('.proc-dock').boundingBox();
  assert.ok(box.y + box.height <= dock.y, 'permission surface leaves the map dock reachable');
  if (viewport.width <= 420) {
    const topbar = await page.locator('.proc-pill--bar').boundingBox();
    assert.ok(box.y >= topbar.y + topbar.height + 4, 'permission surface leaves the run controls reachable');
  }
}

const { context, page } = await open();
await page.locator('.pmap__block[data-root]').waitFor();
await check('The inline preview uses live block details and its Allow/Deny buttons never create a run', async () => {
  await page.locator('.pmap__block[data-root] .agt__name').click();
  await page.getByText('Preview permission request', { exact: true }).click();
  const preview = page.locator('.proc-permission-preview');
  assert.match(await preview.innerText(), /May I coordinate this launch\?/);
  await preview.getByRole('button', { name: 'Allow once', exact: true }).click();
  assert.match(await preview.getByRole('status').innerText(), /Allowed just once/);
  assert.equal(await runStore(page), null);
  await preview.getByRole('button', { name: 'Try again' }).click();
  await preview.getByRole('button', { name: 'Deny', exact: true }).click();
  assert.match(await preview.getByRole('status').innerText(), /Denied/);
  assert.equal(await runStore(page), null);
  await preview.getByRole('button', { name: 'Try again' }).click();
  await shot(page, 'inspector-preview');
  await page.getByRole('button', { name: 'Close block settings' }).click();
});
await check('A real waiting block opens the review automatically with labelled dialog, scope, task, tools and cost', async () => {
  await run(page).click();
  await card(page).waitFor();
  assert.match(await card(page).innerText(), /May I coordinate this launch\?/);
  assert.match(await card(page).innerText(), /\$2\.00/);
  assert.match(await card(page).innerText(), /Just once/);
  assert.match(await card(page).innerText(), /3 connected sub-tasks/);
  assert.equal(await card(page).getAttribute('aria-modal'), 'false');
  for (const attr of ['aria-labelledby', 'aria-describedby']) {
    const id = await card(page).getAttribute(attr);
    assert.ok((await page.locator(`[id="${id}"]`).innerText()).length > 0);
  }
  assert.equal(await card(page).getByRole('radio').count(), 0, 'no unsupported timed or permanent grants');
  await noOverflow(page);
  await shot(page, 'desktop-request');
});
await check('Minimize keeps the task waiting; Needs you reopens the same request and focuses the review', async () => {
  await page.getByRole('button', { name: 'Minimize permission requests' }).click();
  assert.equal(await card(page).count(), 0);
  await page.getByRole('button', { name: /1 permission request/ }).waitFor();
  await page.locator('.agt__sum-btn[data-kind=waiting]').click();
  await card(page).waitFor();
  assert.equal(await card(page).evaluate(el => document.activeElement === el), true);
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.getByRole('button', { name: /Show Coordinator in/ }).click();
  assert.equal(await page.getByRole('button', { name: 'Map', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: /1 permission request/ }).click();
  await page.getByRole('button', { name: 'Block settings panel', exact: true }).click();
  await page.getByRole('button', { name: 'Review request', exact: true }).click();
  await card(page).waitFor();
  assert.match(await card(page).innerText(), /Coordinator wants/);
  await page.getByRole('button', { name: 'Close block settings' }).click();
});
await check('A key outside the card never approves; reload preserves the pending request without any decision', async () => {
  await page.getByRole('textbox', { name: 'Process name' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => localStorage.getItem('affectui:acme:process-run'));
  assert.equal((await runStore(page)).runs[doc.id].events.length, 0);
  await page.reload({ waitUntil: 'networkidle' });
  await card(page).waitFor();
  assert.match(await card(page).innerText(), /May I coordinate/);
});
await check('Allow once reaches the simulated engine, folds into a receipt, then queues two separate requests', async () => {
  await card(page).getByRole('button', { name: 'Allow once', exact: true }).click();
  await waitText(page, '.proc-permissions [role=status]', 'Allowed just once');
  await waitText(page, '.proc-permissions__number', '2 waiting');
  await page.getByRole('button', { name: 'Next request', exact: true }).click();
  await page.locator('.proc-permissions__queue').waitFor();
  assert.match(await card(page).innerText(), /Coder wants/);
  assert.match(await card(page).innerText(), /GitHub/);
  await page.getByRole('button', { name: 'Next request', exact: true }).click();
  assert.match(await card(page).innerText(), /Writer wants/);
  await page.getByRole('button', { name: 'Previous request' }).click();
  assert.match(await card(page).innerText(), /Coder wants/);
  await shot(page, 'desktop-queue');
});
await check('Escape denies only the focused request, stops its children and leaves the other request pending', async () => {
  await page.getByRole('button', { name: 'Next request', exact: true }).click();
  await card(page).focus();
  await page.keyboard.press('Escape');
  await waitText(page, '.proc-permissions [role=status]', 'Denied');
  await page.waitForTimeout(400);
  const events = (await runStore(page)).runs[doc.id].events;
  assert.deepEqual(events.map(event => event.action), [{ type: 'approve', id: 'coordinator' }, { type: 'reject', id: 'writer' }]);
  await page.getByRole('button', { name: 'Next request', exact: true }).click();
  assert.match(await card(page).innerText(), /Coder wants/);
});
await check('Enter on the focused dialog allows once; rerunning always asks again', async () => {
  await card(page).focus();
  await page.keyboard.press('Enter');
  await waitText(page, '.proc-state', 'Done');
  await shot(page, 'desktop-allowed');
  await run(page).click();
  await card(page).waitFor();
  assert.match(await card(page).innerText(), /Coordinator wants/);
  await stop(page).click();
  await card(page).waitFor({ state: 'hidden' });
  assert.equal(await card(page).count(), 0);
});
await context.close();

for (const [width, height] of [[390, 844], [320, 568]]) {
  const mobile = await open({ viewport: { width, height }, isMobile: true, hasTouch: true });
  await check(`Touch ${width}px: request stays in the viewport, scrolls, has 44px actions and no keyboard hints`, async () => {
    await run(mobile.page).tap(); await card(mobile.page).waitFor();
    await noOverflow(mobile.page);
    const allow = card(mobile.page).getByRole('button', { name: 'Allow once', exact: true });
    await allow.scrollIntoViewIfNeeded();
    assert.ok((await allow.boundingBox()).height >= 44);
    assert.equal(await card(mobile.page).locator('kbd').first().isVisible(), false);
    await shot(mobile.page, `mobile-${width}`);
    await allow.tap();
    await waitText(mobile.page, '.proc-permissions [role=status]', 'Allowed just once');
  });
  await mobile.context.close();
}
await check('Dark theme and reduced motion use the existing Process tokens', async () => {
  const dark = await open({ reducedMotion: 'reduce' });
  await dark.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await run(dark.page).click(); await card(dark.page).waitFor();
  assert.equal(await card(dark.page).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(35, 35, 38)');
  assert.equal(await card(dark.page).locator('li').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await shot(dark.page, 'desktop-dark');
  await dark.context.close();
});
await check('REST failures never show Allowed; double-click sends one action; confirmed retry shows a receipt', async () => {
  const remote = await open({}, browser, true);
  const startedAt = Date.now(); let fail = true, accepted = false, actions = 0;
  const snapshot = () => ({ id: 'remote-permission', processId: doc.id, startedAt, at: Date.now(), state: accepted ? 'running' : 'waiting', nodes: { coordinator: { status: accepted ? 'running' : 'waiting', cost: 0, started: startedAt, ask: 'Server asks to coordinate the launch.' } } });
  await remote.context.route('http://qa.test/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: status === 204 ? '' : JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return json(204);
    if (path.endsWith('/process/engines')) return json(200, { data: [] });
    if (path.endsWith('/actions')) {
      actions += 1; assert.deepEqual(request.postDataJSON(), { type: 'approve', id: 'coordinator' });
      await new Promise(resolve => setTimeout(resolve, 300));
      if (fail) return json(503, { error: { message: 'Engine unavailable. Your request is still waiting.' } });
      accepted = true; return json(200, { data: snapshot() });
    }
    if (/\/runs\/[^/]+$/.test(path)) return json(200, { data: snapshot() });
    if (path.endsWith('/runs')) return json(200, { data: request.method() === 'POST' ? snapshot() : null });
    if (/\/workspaces\/[^/]+\/process$/.test(path)) return json(200, { data: library, version: 'v1' });
    return json(404, {});
  });
  await remote.page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  await run(remote.page).click(); await card(remote.page).waitFor();
  await card(remote.page).getByRole('button', { name: 'Allow once', exact: true }).dblclick();
  await card(remote.page).getByRole('alert').waitFor();
  assert.equal(actions, 1);
  assert.match(await card(remote.page).innerText(), /Server asks/);
  assert.equal(await remote.page.locator('.permission-request[data-decision]').count(), 0);
  await shot(remote.page, 'rest-error');
  fail = false;
  await card(remote.page).getByRole('button', { name: 'Allow once', exact: true }).click();
  await waitText(remote.page, '.proc-permissions [role=status]', 'Allowed just once');
  assert.equal(actions, 2);
  await remote.context.close();
});
await check('WebKit renders the request and submits Deny', async () => {
  const wk = await webkit.launch();
  const local = await open({}, wk);
  await run(local.page).click(); await card(local.page).waitFor();
  await card(local.page).getByRole('button', { name: 'Deny', exact: true }).click();
  await waitText(local.page, '.proc-permissions [role=status]', 'Denied');
  await local.context.close(); await wk.close();
});
await check('No uncaught browser errors', async () => assert.deepEqual(errors, []));
await browser.close();
await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
console.log(`${results.every(result => result.ok) ? 'ALL PASS' : 'FAILED'} ${results.filter(result => result.ok).length}/${results.length}`);
if (results.some(result => !result.ok)) process.exitCode = 1;
