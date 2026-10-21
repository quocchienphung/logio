// QA for /personalize?section=process (the Process map): the full-bleed canvas, blocks joined around one block in the middle,
// adding blocks by role and with the + handles, dragging, the settings panel, AI blocks and roles, undo, the Tree view, the
// simulated run, templates, export/import, keyboard, phone, WebKit and a mocked REST backend with a server-run engine.
// Usage: node scripts/qa/process.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/process/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=process`;
const results = [], errors = [], external = new Set();
let lastPage = null;
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) {
    if (process.env.QA_SHOTS && lastPage) await lastPage.screenshot({ path: `${out}/failed-${results.length}.png` }).catch(() => {});
    results.push({ name, ok: false, error: String(error.message).split('\n').slice(0, 4).join(' | ') }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 4).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });

async function open(options = {}, target = url, engine = browser, init) {
  const context = await engine.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  lastPage = page;
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource/.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  page.on('request', request => { const u = new URL(request.url()); if (u.protocol.startsWith('http') && u.origin !== new URL(base).origin && u.hostname !== 'qa.test') external.add(u.origin); });
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pmap__block');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(600);
  return { context, page };
}
const block = (page, name) => page.locator('.pmap__block').filter({ has: page.locator('.agt__name', { hasText: new RegExp(`^${name}$`) }) });
const names = page => page.locator('.pmap__block .agt__name').allInnerTexts();
const statusOf = (page, name, index = 0) => page.locator('.agt__node').filter({ has: page.locator('.agt__name', { hasText: new RegExp(`^${name}$`) }) }).nth(index).getAttribute('data-status');
const inspector = page => page.locator('.proc-inspector');
const combo = (page, name) => page.getByRole('combobox', { name });
async function pick(page, name, option) { await combo(page, name).click(); await page.getByRole('option', { name: option }).first().click(); }
const waitStatus = (page, name, status, timeout = 20000, index = 0) => page.waitForFunction(([n, s, i]) => { const found = [...document.querySelectorAll('.agt__node')].filter(el => el.querySelector('.agt__name')?.textContent === n); return found[i]?.dataset.status === s; }, [name, status, index], { timeout });
const saved = page => page.locator('.proc-save').filter({ hasText: /^Saved$/ }).waitFor();
const stored = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
const storedLibrary = async page => { const key = await page.evaluate(() => Object.keys(localStorage).find(item => item.endsWith(':process'))); return stored(page, key); };
const run = page => page.locator('.agt__extra').getByRole('button', { name: 'Run', exact: true });
const goto = async (page, section) => page.locator('.ui-as-side__item', { hasText: section }).click();
const undo = page => page.locator('.proc-dock [aria-label="Undo"]');
const redo = page => page.locator('.proc-dock [aria-label="Redo"]');
const view = page => page.evaluate(() => { const stage = document.querySelector('.pmap__stage'); const m = new DOMMatrixReadOnly(getComputedStyle(stage).transform); return { x: m.e, y: m.f, scale: m.a }; });
const box = async locator => locator.boundingBox();
const openBlock = async (page, name) => { await block(page, name).locator('.agt__name').click(); await page.locator('.proc-side').waitFor(); };

// ---------- the map ----------
{
  const { context, page } = await open();
  await check('The canvas has the whole page: no title row, breadcrumb or toolbar row above it, only floating controls', async () => {
    assert.equal(await page.locator('.proc-title, .proc-toolbar, .proc-crumbs, .proc-goal').count(), 0);
    const stage = await box(page.locator('.proc-stage')), map = await box(page.locator('.pmap')), shell = await box(page.locator('.proc-workspace'));
    assert.ok(Math.abs(map.width - shell.width) < 2 && Math.abs(map.height - shell.height) < 2, `map ${map.width}x${map.height} in ${shell.width}x${shell.height}`);
    assert.ok(stage.height > 800, `stage height ${stage.height}`);
    assert.equal(await page.locator('.proc-side').count(), 0, 'the settings panel stays closed until a block is opened');
    assert.equal(await page.locator('.proc-name input').inputValue(), 'Launch the pricing page');
    assert.equal(await page.locator('.proc-state').innerText(), 'Draft');
    assert.match(await page.locator('.proc-chip[data-kind="simulated"]').innerText(), /Simulated/);
  });
  await check('One block sits in the middle and the other eight branch out around it, joined by arrows, none overlapping', async () => {
    assert.deepEqual((await names(page)).sort(), ['Analyst', 'Coder', 'Coordinator', 'Fixer', 'Planner', 'Researcher', 'Scraper', 'Tester', 'Writer']);
    assert.equal(await page.locator('.pmap__edge').count(), 8);
    assert.equal(await page.locator('.pmap__block[data-root] .agt__name').innerText(), 'Coordinator');
    const boxes = await page.locator('.pmap__block').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { name: el.querySelector('.agt__name').textContent, x: r.x, y: r.y, w: r.width, h: r.height }; }));
    for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i], b = boxes[j];
      assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y), `${a.name} overlaps ${b.name}`);
    }
    const root = boxes.find(item => item.name === 'Coordinator'), mapBox = await box(page.locator('.pmap'));
    assert.ok(Math.abs(root.x + root.w / 2 - (mapBox.x + mapBox.width / 2)) < 60, 'the middle block is in the middle of the page');
    for (const item of boxes) assert.ok(item.x >= mapBox.x - 1 && item.x + item.w <= mapBox.x + mapBox.width + 1 && item.y >= mapBox.y - 1 && item.y + item.h <= mapBox.y + mapBox.height + 1, `${item.name} is inside the page`);
    assert.ok((await view(page)).scale >= 0.55, 'blocks are shown at a readable size');
    await page.screenshot({ path: `${out}/process-desktop.png` });
  });
  await check('Every AI block shows its real brand mark and its role', async () => {
    assert.equal(await page.locator('.pmap__block .agt__avatar[data-logo] svg, .pmap__block .agt__avatar svg').count() >= 9, true);
    const roles = await page.locator('.pmap__block .agt__badge').allInnerTexts();
    assert.deepEqual(roles.sort(), ['Coder', 'Coordinator', 'Fixer', 'Helper', 'Helper', 'Instructor', 'Planner', 'Processor', 'Processor']);
    const providers = await page.locator('.pmap__block .agt__avatar').evaluateAll(els => els.map(el => el.getAttribute('title')));
    for (const expected of ['Kimi', 'Gemini', 'DeepSeek', 'Claude Code', 'Codex']) assert.ok(providers.some(text => text?.includes(expected)), `${expected} in ${providers.join(', ')}`);
  });
  await check('Pan and zoom: dragging the background pans, the buttons and Ctrl+wheel zoom, Fit brings the whole map back', async () => {
    const start = await view(page);
    const mapBox = await box(page.locator('.pmap'));
    await page.mouse.move(mapBox.x + 200, mapBox.y + 200);
    await page.mouse.down(); await page.mouse.move(mapBox.x + 320, mapBox.y + 260, { steps: 6 }); await page.mouse.up();
    const panned = await view(page);
    assert.ok(Math.abs(panned.x - start.x - 120) < 4 && Math.abs(panned.y - start.y - 60) < 4, `panned ${panned.x - start.x},${panned.y - start.y}`);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    assert.ok((await view(page)).scale > start.scale);
    await page.keyboard.down('Control'); await page.mouse.wheel(0, 200); await page.keyboard.up('Control');
    assert.ok((await view(page)).scale < start.scale * 1.2 + 0.01);
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    const fitted = await view(page);
    assert.ok(Math.abs(fitted.scale - start.scale) < 0.01 && Math.abs(fitted.x - start.x) < 2);
  });
  await context.close();
}

// ---------- the settings panel and the AI block ----------
{
  const { context, page } = await open();
  await check('Opening a block shows its settings in a floating panel; editing the name updates the block and is saved and restored', async () => {
    await openBlock(page, 'Writer');
    assert.equal(await page.locator('.agt__node[data-selected] .agt__name').innerText(), 'Writer');
    assert.match(await inspector(page).innerText(), /Name/);
    await inspector(page).locator('input.proc-input').first().fill('Copywriter');
    assert.equal(await block(page, 'Copywriter').count(), 1);
    await saved(page);
    const raw = await storedLibrary(page);
    assert.equal(raw.processes[0].root.children[2].name, 'Copywriter');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.pmap__block');
    assert.equal(await block(page, 'Copywriter').count(), 1);
    await page.getByRole('button', { name: 'Close block settings' }).count();
  });
  await check('The role is the person\'s choice and changes the block\'s label and default instructions', async () => {
    await openBlock(page, 'Copywriter');
    const options = await (async () => { await combo(page, 'Role').click(); const list = await page.getByRole('option').allInnerTexts(); await page.keyboard.press('Escape'); return list; })();
    for (const role of ['Coordinator', 'Planner', 'Coder', 'Fixer', 'Reverter', 'Revoker', 'Instructor', 'Helper', 'Processor']) assert.ok(options.some(text => text.startsWith(role)), `${role} in ${options.join(' | ')}`);
    await pick(page, 'Role', /^Reverter/);
    assert.equal(await block(page, 'Copywriter').locator('.agt__badge').innerText(), 'Reverter');
    assert.match(await inspector(page).getByLabel('Instructions').inputValue(), /\S/);
    await undo(page).click();
  });
  await check('The AI block is the person\'s choice: Kimi, Ollama, Gemini, Claude Code, Codex, Hermes, a person; a local model is typed', async () => {
    await pick(page, 'Who does it', 'Ollama');
    assert.equal(await block(page, 'Copywriter').locator('.agt__model').innerText(), 'Ollama');
    assert.equal(await block(page, 'Copywriter').locator('.agt__avatar').getAttribute('title'), 'Ollama');
    assert.match(await inspector(page).locator('.proc-problems').innerText(), /Choose a model for Ollama/);
    assert.match(await page.locator('.proc-chip[data-kind="warn"]').innerText(), /1 needs? attention/);
    await combo(page, 'Model').click();
    await page.keyboard.type('llama3.2');
    await page.getByRole('option', { name: /llama3\.2/ }).first().click();
    assert.equal(await block(page, 'Copywriter').locator('.agt__model').innerText(), 'llama3.2');
    assert.equal(await page.locator('.proc-chip[data-kind="warn"]').count(), 0);
    await combo(page, 'Who does it').click();
    const providers = await page.getByRole('option').allInnerTexts();
    await page.keyboard.press('Escape');
    for (const provider of ['Kimi', 'Ollama', 'Gemini', 'Claude Code', 'Codex', 'Hermes', 'A person']) assert.ok(providers.some(text => text.startsWith(provider)), `${provider} in ${providers.join(' | ')}`);
    await pick(page, 'Who does it', 'Kimi');
    assert.equal(await block(page, 'Copywriter').locator('.agt__model').innerText(), 'Kimi');
    await pick(page, 'Who does it', 'A person');
    assert.equal(await block(page, 'Copywriter').locator('.agt__model').innerText(), 'Person');
    assert.equal(await inspector(page).getByLabel('Instructions').count(), 0);
    await pick(page, 'Who does it', 'Claude');
  });
  await check('Tools, approval and limits are attributes of the block', async () => {
    const before = await block(page, 'Copywriter').locator('.agt__tool').count();
    await combo(page, 'Tools it may use').click();
    await page.getByRole('option', { name: 'Stripe' }).click();
    await page.keyboard.press('Escape');
    assert.equal(await block(page, 'Copywriter').locator('.agt__tool').count(), before + 1);
    assert.equal(await block(page, 'Copywriter').locator('.proc-tag').count(), 1);
    await inspector(page).getByRole('switch', { name: /Ask me before it runs/ }).click();
    assert.equal(await block(page, 'Copywriter').locator('.proc-tag').count(), 0);
    await inspector(page).getByRole('switch', { name: /Ask me before it runs/ }).click();
    await inspector(page).getByLabel(/Stop at/).fill('0.05');
    assert.equal(await inspector(page).getByLabel(/Stop at/).inputValue(), '0.05');
    await undo(page).click();
    assert.equal(await inspector(page).getByLabel(/Stop at/).inputValue(), '');
    await redo(page).click();
    assert.equal(await inspector(page).getByLabel(/Stop at/).inputValue(), '0.05');
  });
  await context.close();
}

// ---------- adding, joining, moving ----------
{
  const { context, page } = await open();
  await check('"Add block" connects a new block of the chosen role to the selected block; it is selected, named and joined', async () => {
    await block(page, 'Coder').locator('.agt__name').click();
    await page.locator('.proc-dock').getByRole('button', { name: 'Add block' }).click();
    const menu = page.getByRole('menu');
    const items = await menu.getByRole('menuitem').allInnerTexts();
    for (const role of ['Coordinator', 'Planner', 'Coder', 'Fixer', 'Reverter', 'Revoker', 'Instructor', 'Helper', 'Processor']) assert.ok(items.some(text => text.startsWith(role)), `${role} in ${items.join(' | ')}`);
    await menu.getByRole('menuitem', { name: /^Reverter/ }).click();
    assert.equal((await names(page)).length, 10);
    assert.equal(await page.locator('.pmap__edge').count(), 9);
    assert.equal(await page.locator('.pmap__block[data-selected] .agt__badge').innerText(), 'Reverter');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.proc-inspector input.proc-input')), true, 'the name field has focus');
    await page.keyboard.type('Rollback');
    assert.equal(await block(page, 'Rollback').count(), 1);
    const created = await box(block(page, 'Rollback')), mapBox = await box(page.locator('.pmap'));
    assert.ok(created.x >= mapBox.x - 1 && created.x + created.width <= mapBox.x + mapBox.width + 1, 'the new block is on screen');
    await undo(page).click(); await undo(page).click().catch(() => {});
    await page.waitForTimeout(400);
    await redo(page).click().catch(() => {});
  });
  await check('The + handles on the selected block add a block on that side', async () => {
    await block(page, 'Planner').locator('.agt__name').click();
    const count = (await names(page)).length;
    await page.getByRole('button', { name: /^Add a block (above|to the right of|to the left of|below) Planner\./ }).first().click();
    assert.equal((await names(page)).length, count + 1);
    assert.equal(await page.locator('.pmap__block[data-selected] .agt__name').innerText(), 'New block');
  });
  await check('Dragging a block moves it, it keeps the place after a reload, and "Tidy up" gives it back to the layout', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.pmap__block');
    await page.waitForTimeout(500);
    const target = block(page, 'Tester');
    const before = await box(target);
    await page.mouse.move(before.x + 60, before.y + 14);
    await page.mouse.down(); await page.mouse.move(before.x + 160, before.y + 94, { steps: 8 }); await page.mouse.up();
    const after = await box(target);
    const moved = await (async () => { const [t, c, v] = [await box(block(page, 'Tester')), await box(block(page, 'Coordinator')), await view(page)]; return { x: (t.x - c.x) / v.scale, y: (t.y - c.y) / v.scale }; })();
    assert.ok(Math.abs(after.x - before.x - 100) < 12 && Math.abs(after.y - before.y - 80) < 12, `moved ${after.x - before.x},${after.y - before.y}`);
    await saved(page);
    const raw = await storedLibrary(page);
    const tester = JSON.stringify(raw.processes[0].root).match(/"id":"tester"[^]*?"pos":\{"x":(-?\d+),"y":(-?\d+)\}/);
    assert.ok(tester, 'the position is saved with the process');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.pmap__block');
    await page.waitForTimeout(500);
    const offset = async () => { const [t, c, v] = [await box(block(page, 'Tester')), await box(block(page, 'Coordinator')), await view(page)]; return { x: (t.x - c.x) / v.scale, y: (t.y - c.y) / v.scale }; };
    const kept = await offset();
    assert.ok(Math.abs(kept.x - moved.x) < 4 && Math.abs(kept.y - moved.y) < 4, `the block is where it was left (${kept.x - moved.x},${kept.y - moved.y})`);
    await page.getByRole('button', { name: 'Tidy up the map' }).click();
    await page.waitForTimeout(500);
    const tidy = await box(block(page, 'Tester'));
    assert.ok(Math.abs(tidy.x - before.x) < 6 && Math.abs(tidy.y - before.y) < 6, `tidy puts it back (${tidy.x - before.x},${tidy.y - before.y})`);
  });
  await check('Arrow keys nudge the focused block and Delete asks before removing it; undo brings it back', async () => {
    const target = block(page, 'Fixer');
    await target.focus();
    const before = await box(target);
    await page.keyboard.press('ArrowRight');
    assert.ok((await box(target)).x > before.x);
    await target.focus();
    await page.keyboard.press('Delete');
    assert.match(await page.getByRole('dialog').innerText(), /Delete “Fixer”/);
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('.pmap__block .agt__name')].some(el => el.textContent === 'Fixer'));
    await undo(page).click();
    assert.equal(await block(page, 'Fixer').count(), 1);
  });
  await check('The Tree view shows the same blocks as a tree and the toggle returns to the map', async () => {
    await page.getByRole('button', { name: 'Tree', exact: true }).click();
    await page.waitForSelector('.agt__link');
    assert.equal(await page.locator('[role=tree]').count(), 1);
    assert.equal(await page.locator('.pmap').count(), 0);
    assert.ok((await page.locator('.agt__node .agt__name').allInnerTexts()).includes('Coordinator'));
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForSelector('.pmap__block');
    assert.equal(await page.locator('.pmap__block').count() >= 9, true);
  });
  await context.close();
}

// ---------- the simulated run ----------
{
  const { context, page } = await open();
  await check('Running on the map: arrows animate, the writer needs approval, the tester fails once and is retried, the run ends done', async () => {
    await run(page).click();
    assert.equal(await page.locator('.proc-state').innerText(), 'Running');
    await page.waitForSelector('.pmap__edges [data-live]');
    await waitStatus(page, 'Writer', 'waiting', 10000);
    assert.equal(await page.locator('.proc-state').innerText(), 'Needs you');
    await page.locator('.agt__sum-btn[data-kind="waiting"]').click();
    const dialog = page.locator('.proc-permissions [role=dialog]');
    assert.match(await dialog.innerText(), /Formal or friendly for the plan names\?/);
    await dialog.getByRole('button', { name: 'Allow once' }).click();
    await waitStatus(page, 'Writer', 'running', 4000);
    await waitStatus(page, 'Tester', 'failed', 15000);
    await page.locator('.agt__sum-btn[data-kind="failed"]').click();
    const failed = page.getByRole('dialog', { name: 'Failed blocks' });
    assert.match(await failed.innerText(), /Simulated failure/);
    await failed.getByRole('button', { name: 'Retry' }).click();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.pmap__tries').count(), 1, 'the failed try is listed on the block');
    await page.screenshot({ path: `${out}/process-run.png` });
    await page.waitForFunction(() => document.querySelector('.proc-state')?.textContent === 'Done', null, { timeout: 45000 });
    assert.equal(await statusOf(page, 'Coordinator'), 'done');
    const total = await page.locator('.agt__sum-cost').innerText();
    assert.match(total, /^\$[0-9]+\.[0-9]{2}$/);
    assert.notEqual(total, '$0.00');
  });
  await check('Clear returns every block to ready; Stop ends a run and the clock stops', async () => {
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click();
    assert.equal(await page.locator('.agt__node[data-status="idle"]').count(), 9);
    await run(page).click();
    await waitStatus(page, 'Coder', 'running', 6000);
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
    await page.waitForFunction(() => document.querySelector('.proc-state')?.textContent === 'Stopped');
    assert.equal(await page.locator('.agt__node[data-status="running"]').count(), 0);
    const cost = await page.locator('.agt__sum-cost').innerText();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.agt__sum-cost').innerText(), cost);
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click();
  });
  await check('A run survives a reload; the structure is frozen while it is active', async () => {
    await run(page).click();
    await waitStatus(page, 'Writer', 'waiting', 10000);
    assert.equal(await page.locator('.proc-dock').getByRole('button', { name: 'Add block' }).isDisabled(), true);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.pmap__block');
    assert.equal(await statusOf(page, 'Writer'), 'waiting');
    assert.equal(await page.locator('.proc-state').innerText(), 'Needs you');
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click();
  });
  await check('Run from here starts one block and what hangs under it', async () => {
    await openBlock(page, 'Researcher');
    await inspector(page).getByRole('button', { name: 'Run from here' }).click();
    await page.waitForTimeout(1500);
    assert.notEqual(await statusOf(page, 'Researcher'), 'idle');
    assert.equal(await statusOf(page, 'Coder'), 'idle');
    assert.equal(await statusOf(page, 'Coordinator'), 'idle');
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click();
  });
  await context.close();
}

// ---------- settings, templates, library, export and import ----------
{
  const { context, page } = await open();
  await check('Process settings: goal, cost unit, tidy, export and import; the engine dialog explains how to connect', async () => {
    await page.getByRole('button', { name: 'Process settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Process settings' });
    await dialog.getByLabel('Goal').fill('Ship it on Friday');
    await pick(page, 'Show costs in', 'Tokens');
    const [file] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Export as JSON' }).click()]);
    const path = `${out}/exported.json`;
    await file.saveAs(path);
    const exported = JSON.parse(await fs.readFile(path, 'utf8'));
    assert.equal(exported.format, 'logio-process');
    assert.equal(exported.process.goal, 'Ship it on Friday');
    assert.equal(exported.process.unit, 'tokens');
    await dialog.getByRole('button', { name: 'Done' }).click();
    await page.locator('input[type=file][accept*=json]').setInputFiles(path);
    await page.waitForFunction(() => /Imported/.test(document.querySelector('.proc-notice')?.textContent ?? ''));
    await page.locator('input[type=file][accept*=json]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":true}') });
    await page.waitForFunction(() => /not a process/.test(document.querySelector('.proc-notice[data-kind=error]')?.textContent ?? ''));
    await page.locator('.proc-chip[data-kind="simulated"]').click();
    const text = await page.getByRole('dialog', { name: 'Connect an engine' }).innerText();
    assert.match(text, /serverProcess: true/);
    assert.match(text, /POST \/runs\/\{runId\}\/actions/);
    await page.keyboard.press('Escape');
  });
  await check('A local-model template lays out Hermes Agent, two Ollama blocks and a person, and says what still needs choosing', async () => {
    await page.getByRole('button', { name: 'New process' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Local model reply/ }).click();
    await page.waitForSelector('.pmap__block');
    assert.equal(await page.locator('.proc-name input').inputValue(), 'Reply to a customer (local model)');
    assert.deepEqual((await page.locator('.pmap__block .agt__avatar').evaluateAll(els => els.map(el => el.getAttribute('title') ?? el.textContent))).sort(), ['Hermes Agent', 'ME', 'Ollama', 'Ollama']);
    assert.match(await page.locator('.proc-chip[data-kind="warn"]').innerText(), /2 need attention|2 needs attention/);
    await run(page).click();
    await waitStatus(page, 'Approver', 'waiting', 40000);
    assert.match(await page.locator('.agt__sum-cost').innerText(), /tok$/);
    await page.locator('.agt__sum-btn[data-kind="waiting"]').click();
    await page.locator('.proc-permissions [role=dialog]').getByRole('button', { name: 'Deny' }).click();
    await page.waitForFunction(() => document.querySelector('.proc-state')?.textContent === 'Done');
    await page.screenshot({ path: `${out}/process-local.png` });
  });
  await check('The library lists, switches, duplicates and deletes processes (with confirmation and undo)', async () => {
    await page.getByRole('button', { name: /Saved processes/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Saved processes' });
    const count = await dialog.locator('.proc-library li').count();
    assert.ok(count >= 2);
    await dialog.getByRole('button', { name: 'Launch the pricing page' }).first().click();
    assert.equal(await page.locator('.proc-name input').inputValue(), 'Launch the pricing page');
    await page.getByRole('button', { name: /Saved processes/ }).click();
    await page.getByRole('button', { name: 'Duplicate Launch the pricing page' }).first().click();
    assert.equal(await page.locator('.proc-name input').inputValue(), 'Launch the pricing page (copy)');
    await page.getByRole('button', { name: 'Delete Launch the pricing page (copy)' }).click();
    await page.getByRole('dialog', { name: 'Delete process' }).getByRole('button', { name: 'Delete process', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await undo(page).click();
    await page.getByRole('button', { name: /Saved processes/ }).click();
    assert.equal(await page.getByRole('dialog', { name: 'Saved processes' }).locator('.proc-library li').count(), count + 2 - 1);
    await page.keyboard.press('Escape');
  });
  await context.close();
}

// ---------- roles, every AI agent, connections and loops ----------
{
  const { context, page } = await open();
  // Where every edge starts and ends, against the sides of the blocks: no gap, whatever state the cards are in
  const edgeGaps = () => page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.pmap__block')].map(el => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: el.offsetWidth, h: el.offsetHeight }));
    const near = (point) => blocks.some(b => {
      const onX = Math.abs(point.x - b.x) <= 1.5 || Math.abs(point.x - (b.x + b.w)) <= 1.5, onY = Math.abs(point.y - b.y) <= 1.5 || Math.abs(point.y - (b.y + b.h)) <= 1.5;
      const inX = point.x >= b.x - 1.5 && point.x <= b.x + b.w + 1.5, inY = point.y >= b.y - 1.5 && point.y <= b.y + b.h + 1.5;
      return (onX && inY) || (onY && inX);
    });
    return [...document.querySelectorAll('.pmap__edges .pmap__edge')].flatMap(path => {
      const numbers = path.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
      const ends = [{ x: numbers[0], y: numbers[1] }, { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] }];
      return ends.filter(point => !near(point)).map(point => `${Math.round(point.x)},${Math.round(point.y)}`);
    });
  });
  await check('Every arrow starts and ends exactly on the side of its block, before a run, during it and after adding blocks (no gap on the way down)', async () => {
    assert.deepEqual(await edgeGaps(), []);
    await run(page).click();
    await waitStatus(page, 'Coder', 'running', 6000);
    assert.deepEqual(await edgeGaps(), [], 'while the cards change size');
    await page.waitForFunction(() => document.querySelector('.proc-state')?.textContent === 'Needs you');
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click();
    await block(page, 'Planner').locator('.agt__name').click();
    await page.locator('.proc-dock').getByRole('button', { name: 'Add block' }).click();
    await page.getByRole('menuitem', { name: /^QA/ }).click();
    await page.waitForTimeout(400);
    assert.deepEqual(await edgeGaps(), [], 'after a block was added');
    await undo(page).click();
  });
  await check('Roles: QA, Creator and Reviewer join the others; each role explains itself and offers the sub-blocks and the next role that usually go with it', async () => {
    await block(page, 'Coder').locator('.agt__name').click();
    await page.locator('.proc-dock').getByRole('button', { name: 'Add block' }).click();
    const items = await page.getByRole('menu').getByRole('menuitem').allInnerTexts();
    for (const role of ['Coordinator', 'Planner', 'Creator', 'Coder', 'QA', 'Reviewer', 'Fixer', 'Reverter', 'Revoker', 'Instructor', 'Helper', 'Processor']) assert.ok(items.some(text => text.startsWith(role)), `${role} in ${items.join(' | ')}`);
    await page.getByRole('menu').getByRole('menuitem', { name: /^QA/ }).click();
    assert.equal(await page.locator('.pmap__block[data-selected] .agt__badge').innerText(), 'QA');
    const guide = page.locator('.proc-guide');
    const text = await guide.innerText();
    for (const word of ['Use it', 'Give it', 'It passes on', 'Watch out', 'Add a sub-block', 'Usually next']) assert.ok(text.includes(word), word);
    assert.match(text, /pass or fail/i);
    // a sub-block the guide suggests, with its role and task
    await guide.getByRole('button', { name: /Run the checks/ }).click();
    assert.equal(await block(page, 'Run the checks').locator('.agt__badge').innerText(), 'QA');
    // the next role that usually follows
    await block(page, 'QA').locator('.agt__name').first().click();
    const before = (await names(page)).length;
    await page.locator('.proc-guide').getByRole('group', { name: 'Usually next' }).getByRole('button', { name: 'Reviewer' }).click();
    assert.equal((await names(page)).length, before + 1);
    assert.equal(await page.locator('.pmap__block[data-selected] .agt__badge').innerText(), 'Reviewer');
    assert.match(await inspector(page).getByLabel('Instructions').inputValue(), /Judge the result against the goal/);
    // creator and reviewer are in the role picker too
    await combo(page, 'Role').click();
    const options = await page.getByRole('option').allInnerTexts();
    await page.keyboard.press('Escape');
    for (const role of ['QA', 'Creator', 'Reviewer']) assert.ok(options.some(option => option.startsWith(role)), role);
  });
  await check('Every AI agent has a logo and can be chosen: the picker is grouped, searchable and lists more than ninety engines', async () => {
    await combo(page, 'Who does it').click();
    const all = await page.getByRole('option').allInnerTexts();
    assert.ok(all.length >= 80, `${all.length} engines`);
    for (const name of ['Claude', 'Claude Code', 'Codex', 'Gemini', 'Kimi', 'Hermes Agent', 'Ollama', 'Cursor', 'Windsurf', 'Cline', 'Devin', 'OpenHands', 'Goose', 'Kiro', 'Trae', 'Grok', 'Perplexity', 'LM Studio', 'Groq', 'OpenRouter', 'CrewAI', 'LangGraph', 'n8n', 'A person']) assert.ok(all.some(text => text.startsWith(name)), name);
    await page.keyboard.type('cursor');
    await page.getByRole('option', { name: /^Cursor/ }).first().click();
    const selected = page.locator('.pmap__block[data-selected]');
    assert.equal(await selected.locator('.agt__avatar').getAttribute('title'), 'Cursor');
    assert.ok(await selected.locator('.agt__avatar svg').count() === 1, 'a drawn logo, not initials');
    await pick(page, 'Who does it', 'Windsurf');
    assert.equal(await selected.locator('.agt__avatar').getAttribute('title'), 'Windsurf');
    assert.equal(await page.locator('.proc-chip[data-kind="warn"]').count(), 0, 'no model is required for these');
    await page.screenshot({ path: `${out}/process-roles.png` });
  });
  await check('The person draws the connections: from Fixer back to Coordinator makes a loop with rounds, a label and a card; undo removes it', async () => {
    await page.getByRole('button', { name: 'Close block settings' }).click().catch(() => {});
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(300);
    await block(page, 'Fixer').locator('.agt__name').click();
    const handle = page.getByRole('button', { name: /^Add a block .* Fixer/ }).first();
    const from = await box(handle), to = await box(block(page, 'Coordinator'));
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + 60, to.y + 40, { steps: 12 });
    assert.match(await page.locator('.pmap__hint').innerText(), /Loop back to Coordinator/);
    assert.equal(await block(page, 'Coordinator').getAttribute('data-target'), 'ok');
    await page.mouse.up();
    assert.equal(await page.locator('.pmap__link[data-kind="loop"]').count(), 1);
    assert.equal(await page.locator('.pmap__edge').count() >= 9, true);
    const editor = page.getByRole('dialog', { name: /Connection from Fixer to Coordinator/ });
    await editor.waitFor();
    assert.match(await editor.innerText(), /run again/);
    assert.equal(await editor.locator('output').innerText(), '2×');
    await editor.getByRole('button', { name: 'More rounds' }).click();
    await editor.getByRole('button', { name: 'More rounds' }).click();
    assert.equal(await editor.locator('output').innerText(), '4×');
    await editor.getByLabel('Label').fill('until it ships');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pmap__editor').count(), 0);
    const pill = page.locator('.pmap__pill[data-kind="loop"]');
    assert.equal(await pill.innerText(), 'until it ships');
    assert.match(await pill.getAttribute('aria-label'), /Loop from Fixer back to Coordinator, up to 4 rounds/);
    await saved(page);
    const raw = await storedLibrary(page);
    assert.deepEqual(raw.processes[0].links.map(link => [link.from, link.to, link.rounds, link.label]), [['fixer', 'launch', 4, 'until it ships']]);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.pmap__block');
    assert.equal(await page.locator('.pmap__pill[data-kind="loop"]').count(), 1, 'connections survive a reload');
    assert.deepEqual(await edgeGaps(), []);
    await page.locator('.pmap__pill[data-kind="loop"]').click();
    await page.getByRole('dialog', { name: /Connection from Fixer to Coordinator/ }).getByRole('button', { name: 'Remove connection' }).click();
    assert.equal(await page.locator('.pmap__pill').count(), 0);
    await page.waitForTimeout(150);
    await saved(page);
  });
  await check('A connection that is not allowed says why; a block can be connected to any other, and the inspector lists and removes connections', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.pmap__block');
    await block(page, 'Tester').locator('.agt__name').click();
    // Tester -> Coder is a loop back (Coder holds Tester), Tester -> Writer waits; Writer -> Tester then would wait for each other
    await combo(page, 'Connect this block to').click();
    const options = await page.getByRole('option').allInnerTexts();
    assert.ok(options.some(text => /Coder\s+loops back/.test(text)), options.join(' | '));
    assert.ok(options.some(text => /Writer\s+waits for this block/.test(text)));
    await page.getByRole('option', { name: /^Writer/ }).click();
    assert.equal(await page.locator('.pmap__pill[data-kind="needs"]').count(), 1);
    assert.match(await inspector(page).locator('.proc-links').innerText(), /Writer waits for this block/);
    await page.keyboard.press('Escape');
    await block(page, 'Writer').locator('.agt__name').click();
    const refused = page.getByRole('button', { name: /^Add a block .* Writer/ }).first();
    const hb = await box(refused), target = await box(block(page, 'Tester'));
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down(); await page.mouse.move(target.x + 50, target.y + 30, { steps: 10 });
    assert.match(await page.locator('.pmap__hint').innerText(), /wait for each other/);
    assert.equal(await block(page, 'Tester').getAttribute('data-target'), 'no');
    await page.mouse.up();
    assert.match(await page.locator('.proc-notice[data-kind=error]').innerText(), /wait for each other/);
    assert.equal(await page.locator('.pmap__pill').count(), 1, 'nothing was connected');
    // dropping on empty space makes a new block there, connected to the one dragged from
    const count = (await names(page)).length;
    const hb2 = await box(page.getByRole('button', { name: /^Add a block .* Writer/ }).first());
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    await page.mouse.down(); await page.mouse.move(hb2.x + 30, hb2.y + 330, { steps: 10 });
    assert.match(await page.locator('.pmap__hint').innerText(), /new block/);
    await page.mouse.up();
    assert.equal((await names(page)).length, count + 1);
    // removing from the inspector
    await block(page, 'Tester').locator('.agt__name').click();
    await inspector(page).getByRole('button', { name: /Remove the connection Tester to Writer/ }).click();
    assert.equal(await page.locator('.pmap__pill').count(), 0);
  });
  await check('Deleting a block takes its connections with it; moving a block under another can drop a connection that is no longer allowed', async () => {
    await block(page, 'Fixer').locator('.agt__name').click();
    await combo(page, 'Connect this block to').click();
    await page.getByRole('option', { name: /^Coordinator/ }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pmap__pill[data-kind="loop"]').count(), 1);
    await block(page, 'Fixer').focus();
    await page.keyboard.press('Delete');
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.pmap__pill').length === 0);
    await page.waitForTimeout(150);
    await saved(page);
    assert.equal((await storedLibrary(page).then(raw => raw.processes[0].links)) ?? null, null, 'no links field left');
  });
  await check('The closed-loop template: the deploy asks, and after the person approves the loop goes round and asks again; the cards say which round', async () => {
    await page.getByRole('button', { name: 'New process' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Closed loop: ship to production/ }).click();
    await page.waitForSelector('.pmap__block');
    assert.deepEqual((await names(page)).sort(), ['Coder', 'Coordinator', 'Creator', 'Deployer', 'Fixer', 'Planner', 'QA', 'Reviewer']);
    assert.equal(await page.locator('.pmap__pill[data-kind="loop"]').count(), 2);
    assert.equal(await page.locator('.pmap__pill[data-kind="needs"]').count(), 4);
    assert.deepEqual(await edgeGaps(), []);
    await run(page).click();
    await waitStatus(page, 'Deployer', 'waiting', 60000);
    assert.ok(['done', 'running'].includes(await statusOf(page, 'Reviewer')) || (await statusOf(page, 'Reviewer')) === 'done', 'the reviewer came before the deployer');
    await page.getByRole('button', { name: /Allow once/ }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.agt__round')].some(el => /Round 2\//.test(el.textContent)), null, { timeout: 60000 });
    assert.ok(await page.locator('.agt__round').count() >= 1, 'a block shows its round');
    await page.screenshot({ path: `${out}/process-loop.png` });
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
  });
  await context.close();
}

// ---------- choosing several blocks together and deleting them ----------
{
  const { context, page } = await open();
  const ctrl = { modifiers: ['Control'] };
  const count = () => page.locator('.pmap__block[data-multi]').count();
  await check('Ctrl + click chooses several blocks: they are marked, counted, and clicking one again lets it go; a plain click clears the group', async () => {
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(300);
    await block(page, 'Scraper').locator('.agt__name').click();
    assert.equal(await count(), 0, 'one block is just selected');
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(400);
    await block(page, 'Analyst').locator('.agt__name').click(ctrl);
    assert.equal(await count(), 2, 'the block that was selected joins the one clicked');
    await block(page, 'Tester').locator('.agt__name').click(ctrl);
    assert.equal(await count(), 3);
    assert.match(await page.locator('.proc-multi').innerText(), /3 blocks selected/);
    assert.equal(await page.locator('.pmap__block[data-selected] .agt__name').innerText(), 'Tester', 'the last one shows its settings');
    await block(page, 'Analyst').locator('.agt__name').click(ctrl);
    assert.equal(await count(), 2);
    await block(page, 'Analyst').locator('.agt__name').click(ctrl);
    assert.equal(await count(), 3);
    await block(page, 'Fixer').locator('.agt__name').click({ modifiers: ['Shift'] });
    assert.equal(await count(), 4, 'Shift works too');
    await block(page, 'Planner').locator('.agt__name').click();
    assert.equal(await count(), 0);
    assert.equal(await page.locator('.proc-multi').count(), 0);
  });
  await check('Ctrl + A chooses every block and Escape lets the group go', async () => {
    await page.locator('.pmap').focus();
    await page.keyboard.press('Control+a');
    assert.equal(await count(), 9);
    assert.match(await page.locator('.proc-multi').innerText(), /9 blocks selected/);
    await page.keyboard.press('Escape');
    assert.equal(await count(), 0);
  });
  await check('Delete (or the button) asks once for the whole group, names it, removes every block with what hangs under it, and one undo brings them all back', async () => {
    await block(page, 'Scraper').locator('.agt__name').click();
    await block(page, 'Writer').locator('.agt__name').click(ctrl);
    await block(page, 'Tester').locator('.agt__name').click(ctrl);
    await page.keyboard.press('Delete');
    const dialog = page.getByRole('dialog', { name: 'Delete blocks' });
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /Delete 3 blocks \(“Scraper”, “Writer”, “Tester”\)/);
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.pmap__block').length === 6);
    assert.deepEqual((await names(page)).sort(), ['Analyst', 'Coder', 'Coordinator', 'Fixer', 'Planner', 'Researcher']);
    assert.equal(await page.locator('.proc-multi').count(), 0);
    await saved(page);
    assert.equal((await storedLibrary(page)).processes[0].root.children.length, 3);
    await undo(page).click();
    assert.equal((await names(page)).length, 9, 'one undo restores all three');
    await redo(page).click();
    assert.equal((await names(page)).length, 6);
    await undo(page).click();
  });
  await check('A group that holds the first block keeps it; a block\'s own sub-blocks go with it; the button works too', async () => {
    await page.locator('.pmap').focus();
    await page.keyboard.press('Control+a');
    await page.locator('.proc-multi').getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete blocks' });
    assert.match(await dialog.innerText(), /The first block stays/);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    assert.equal((await names(page)).length, 9, 'cancel removes nothing');
    await page.keyboard.press('Escape');
    await block(page, 'Researcher').locator('.agt__name').click();
    await block(page, 'Coder').locator('.agt__name').click(ctrl);
    await page.locator('.proc-multi').getByRole('button', { name: 'Delete' }).click();
    assert.match(await page.getByRole('dialog', { name: 'Delete blocks' }).innerText(), /and what hangs under them, 6 blocks in all/);
    await page.getByRole('dialog', { name: 'Delete blocks' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.pmap__block').length === 3);
    assert.deepEqual((await names(page)).sort(), ['Coordinator', 'Planner', 'Writer']);
    await undo(page).click();
  });
  await check('Dragging one block of a group moves the whole group by the same amount, and it is one step to undo', async () => {
    await block(page, 'Planner').locator('.agt__name').click();
    await block(page, 'Writer').locator('.agt__name').click(ctrl);
    const before = { planner: await box(block(page, 'Planner')), writer: await box(block(page, 'Writer')), coder: await box(block(page, 'Coder')) };
    await page.mouse.move(before.planner.x + 60, before.planner.y + 14);
    await page.mouse.down(); await page.mouse.move(before.planner.x + 60, before.planner.y + 94, { steps: 8 }); await page.mouse.up();
    const after = { planner: await box(block(page, 'Planner')), writer: await box(block(page, 'Writer')), coder: await box(block(page, 'Coder')) };
    const planner = after.planner.y - before.planner.y, writer = after.writer.y - before.writer.y;
    assert.ok(Math.abs(planner - 80) < 14, `planner moved ${planner}`);
    assert.ok(Math.abs(writer - planner) < 3, `writer moved with it (${writer})`);
    assert.ok(Math.abs(after.coder.y - before.coder.y) < 3, 'a block outside the group stayed');
    assert.equal(await count(), 2, 'the group is still chosen');
    await saved(page);
    const pinned = JSON.stringify((await storedLibrary(page)).processes[0].root).match(/"pos"/g)?.length;
    assert.equal(pinned, 2);
    await undo(page).click();
    const back = await box(block(page, 'Writer'));
    assert.ok(Math.abs(back.y - before.writer.y) < 3, 'one undo puts both back');
  });
  await check('While a run is active the structure is frozen: Delete says so and removes nothing', async () => {
    await run(page).click();
    await waitStatus(page, 'Coder', 'running', 6000);
    await block(page, 'Scraper').locator('.agt__name').click();
    await block(page, 'Analyst').locator('.agt__name').click(ctrl);
    await page.keyboard.press('Delete');
    assert.equal(await page.getByRole('dialog', { name: 'Delete blocks' }).count(), 0);
    assert.match(await page.locator('.proc-notice[data-kind=error]').innerText(), /Stop the run to change the structure/);
    assert.equal(await page.locator('.proc-multi').getByRole('button', { name: 'Delete' }).isDisabled(), true);
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click();
  });
  await context.close();
}

// ---------- notifications: a star beside the block that finished or failed; it opens the notices in a card next to the block ----------
{
  const { context, page } = await open();
  const spark = (tone = '') => page.locator(`.pmap__spark${tone ? `[data-tone=${tone}]` : ''}`);
  const card = () => page.locator('.pmap__notice');
  const front = () => card().locator('.nsc__card[data-depth="0"]:not([data-leaving])');
  const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  await check('Nothing keeps a corner of the map: no stack on the left, a blinking star appears beside the block that finished, at its top right corner', async () => {
    assert.equal(await page.locator('.pmap__spark, .nsc').count(), 0, 'nothing to show before a run');
    await run(page).click();
    await page.waitForSelector('.pmap__spark[data-tone=success]', { timeout: 20000 });
    assert.equal(await page.locator('.proc-notices').count(), 0, 'the fixed stack is gone from the map view');
    assert.equal(await page.locator('.nsc').count(), 0, 'no card is open until the star is opened');
    const star = spark('success').first();
    assert.equal(await star.getAttribute('data-blinking'), '', 'blinks until opened');
    assert.equal(await star.getAttribute('aria-expanded'), 'false');
    assert.equal(await star.evaluate(el => getComputedStyle(el.querySelector('svg')).animationName), 'spark-blink');
    const label = await star.getAttribute('aria-label');
    assert.match(label, /^\d+ notifications? about [^:]+: .* finished/);
    const name = label.match(/about ([^:]+):/)[1];
    const b = await box(block(page, name)), s = await box(star);
    assert.ok(Math.abs(s.x + s.width / 2 - (b.x + b.width + 6)) < 4 && Math.abs(s.y + s.height / 2 - (b.y - 6)) < 4, `star on the corner of ${name}: ${JSON.stringify([s, b])}`);
    assert.ok(s.width >= 28 && s.height >= 28);
    await page.screenshot({ path: `${out}/process-spark-closed.png` });
  });
  await check('Clicking the star opens the notice in a card right beside the block (not at the left of the page), with the engine, cost and time; the star stops blinking once read', async () => {
    const star = spark('success').first();
    const name = (await star.getAttribute('aria-label')).match(/about ([^:]+):/)[1];
    await star.click();
    await page.waitForSelector('.pmap__notice .nsc__card', { timeout: 5000 });
    assert.equal(await star.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByRole('dialog', { name: `Notifications for ${name}` }).count(), 1);
    await page.waitForTimeout(500);
    const c = await box(card()), b = await box(block(page, name)), vp = page.viewportSize();
    assert.equal(overlap(c, b), false, 'the card does not cover its block');
    const gap = c.x >= b.x + b.width ? c.x - (b.x + b.width) : b.x - (c.x + c.width);
    assert.ok(gap >= 8 && gap <= 40, `next to the block, ${Math.round(gap)} px away`);
    assert.ok(c.y >= 0 && c.y + c.height <= vp.height && c.x >= 0 && c.x + c.width <= vp.width, 'on the screen');
    assert.ok(Math.abs(c.y - b.y) < 80 || c.y + c.height > b.y, 'level with the block');
    assert.match(await front().locator('.nsc__badge').innerText(), /^done$/i);
    assert.match(await front().locator('.nsc__title').innerText(), /(\w+ finished|\d+ blocks finished)/);
    assert.match(await front().locator('.nsc__text').innerText(), /\S/);
    assert.equal(await star.getAttribute('data-blinking'), null, 'not blinking while open');
    await page.screenshot({ path: `${out}/process-spark-open.png` });
  });
  await check('The card follows its block when the map is panned or zoomed, and Escape closes it and gives the focus back to the star', async () => {
    const star = spark('success').first();
    const name = (await star.getAttribute('aria-label')).match(/about ([^:]+):/)[1];
    const gapNow = async () => { const c = await box(card()), b = await box(block(page, name)); return Math.round(c.x >= b.x + b.width ? c.x - (b.x + b.width) : b.x - (c.x + c.width)); };
    const before = await gapNow();
    await page.locator('.pmap').hover({ position: { x: 700, y: 600 } });
    await page.mouse.wheel(30, 12);
    await page.waitForTimeout(300);
    assert.ok(Math.abs(await gapNow() - before) <= 2, 'still beside the block after panning');
    await page.keyboard.press('+');
    await page.waitForTimeout(300);
    assert.ok(await card().count() === 1, 'still open after zooming');
    const after = await gapNow();
    assert.ok(after >= 8 && after <= 40, `still beside the block after zooming (${after})`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.pmap__notice'), null, { timeout: 2000 });
    // a quiet notice's star goes once it has been read, so the focus goes to the block it was on
    assert.equal(await block(page, name).evaluate(el => document.activeElement === el), true, 'the block has the focus again');
    assert.equal(await page.locator('.pmap__block').count() > 0, true);
    assert.equal(await page.locator('.nsc__card:not([data-leaving])').count(), 0);
  });
  await check('A quiet notice is gone once it has been read (its star disappears); an unread star keeps blinking', async () => {
    const stars = await spark('success').count();
    if (stars >= 1) {
      const star = spark('success').first();
      const name = (await star.getAttribute('aria-label')).match(/about ([^:]+):/)[1];
      await star.click();
      await page.waitForSelector('.pmap__notice');
      await page.locator('.pmap__zoom').click();
      await page.waitForFunction(() => !document.querySelector('.pmap__notice'), null, { timeout: 2000 });
      assert.equal(await page.locator(`.pmap__spark[data-tone=success][aria-label*="about ${name}:"]`).count(), 0, `${name}'s quiet star is gone after reading`);
    }
  });
  await check('A failure gives a red star that stays until the block runs again; its card shows the reason and a Retry and is announced as an alert', async () => {
    await page.waitForSelector('.pmap__spark[data-tone=error]', { timeout: 40000 });
    const star = spark('error').first();
    assert.match(await star.getAttribute('aria-label'), /about Tester: Tester failed/);
    assert.equal(await star.getAttribute('data-blinking'), '');
    await page.screenshot({ path: `${out}/process-spark-failed.png` });
    await star.click();
    await page.waitForSelector('.pmap__notice .nsc__card[data-tone=error]');
    assert.match(await front().locator('.nsc__badge').innerText(), /failed/i);
    assert.match(await front().locator('.nsc__title').innerText(), /^Tester failed$/);
    assert.match(await front().locator('.nsc__text').innerText(), /Simulated failure/);
    assert.equal(await front().getByRole('button', { name: 'Retry' }).count(), 1);
    assert.equal(await card().locator('.nsc__sr[role="alert"]').count(), 1);
    const c = await box(card()), b = await box(block(page, 'Tester'));
    assert.equal(overlap(c, b), false);
    await page.screenshot({ path: `${out}/process-spark-failed-open.png` });
    // Closing without acting keeps it: a failure is not read away
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.pmap__notice'), null, { timeout: 2000 });
    assert.equal(await spark('error').count(), 1, 'the failure star stays');
    assert.equal(await spark('error').first().getAttribute('data-blinking'), null, 'but it no longer blinks');
  });
  await check('Retry in the card retries the block and its failure star goes away; the block runs again on the map', async () => {
    await spark('error').first().click();
    await front().getByRole('button', { name: 'Retry' }).click();
    await page.waitForFunction(() => !document.querySelector('.pmap__spark[data-tone=error]'), null, { timeout: 5000 });
    await waitStatus(page, 'Tester', 'running', 5000);
  });
  await check('A star whose block is out of view stays at the edge of the map, inside what the page keeps for its controls, and still opens its card', async () => {
    await page.waitForSelector('.pmap__spark', { timeout: 30000 });
    const star = page.locator('.pmap__spark').first();
    const name = (await star.getAttribute('aria-label')).match(/about ([^:]+):/)[1];
    // push the map far to the left so every block is out of view
    await page.locator('.pmap').hover({ position: { x: 700, y: 500 } });
    for (let step = 0; step < 6; step += 1) await page.mouse.wheel(900, 0);
    await page.waitForTimeout(400);
    const pinned = page.locator(`.pmap__spark[data-pinned][aria-label*="about ${name}:"]`);
    assert.equal(await pinned.count(), 1, 'pinned to the edge');
    const s = await box(pinned), map = await box(page.locator('.pmap')), vp = page.viewportSize();
    assert.ok(s.x >= map.x && s.x + s.width <= map.x + map.width && s.y >= map.y && s.y + s.height <= map.y + map.height, 'inside the map');
    const top = await box(page.locator('.proc-pill--name'));
    assert.ok(s.y >= top.y + top.height - 4 || s.x > top.x + top.width, 'below the page pills');
    await page.screenshot({ path: `${out}/process-spark-pinned.png` });
    await pinned.click();
    await page.waitForSelector('.pmap__notice');
    const c = await box(card());
    assert.ok(c.x >= 0 && c.x + c.width <= vp.width && c.y >= 0 && c.y + c.height <= vp.height, 'the card is on the screen');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(300);
  });
  await check('Several notices on one block: the star counts them and the card is the Notification Stack (12 px / 5% steps, Dismiss all)', async () => {
    const multi = page.locator('.pmap__spark .pmap__spark-count');
    if (await multi.count() === 0) return;
    const star = page.locator('.pmap__spark').filter({ has: multi }).first();
    const count = Number(await star.locator('.pmap__spark-count').innerText());
    assert.ok(count >= 2);
    await star.click();
    await page.waitForSelector('.pmap__notice .nsc__card');
    const transforms = await card().locator('.nsc__card:not([data-leaving])').evaluateAll(els => els.map(el => el.style.transform));
    assert.equal(transforms[0], 'translateY(0px) scale(1)');
    assert.equal(transforms[1], 'translateY(12px) scale(0.95)');
    assert.match(await card().locator('.nsc__foot').innerText(), new RegExp(`${count} notices`));
    await front().getByRole('button', { name: /^Dismiss / }).click();
    await page.waitForFunction(() => document.querySelectorAll('.pmap__notice .nsc__card[data-leaving]').length === 0, null, { timeout: 2000 });
    await page.keyboard.press('Escape');
  });
  await check('The permission request decides the waiting block; when the run ends one star on the first block says so, with the cost and time, and opens the trace', async () => {
    await page.getByRole('button', { name: /Allow once/ }).click();
    const star = page.locator('.pmap__spark[aria-label*="is done"]');
    await star.waitFor({ timeout: 90000 });
    assert.equal(await star.count(), 1, 'announced once');
    await star.click();
    const finished = card().locator('.nsc__card').filter({ has: page.locator('.nsc__title', { hasText: /is done$/ }) });
    assert.match(await finished.locator('.nsc__badge').innerText(), /^run finished$/i);
    assert.match(await finished.locator('.nsc__text').innerText(), /^\d+ blocks? · \$\d+\.\d\d · /);
    await page.screenshot({ path: `${out}/process-spark-run.png` });
    await finished.getByRole('button', { name: 'Open the trace' }).click({ timeout: 8000 });
    await page.waitForSelector('.trc, .twf');
    assert.equal(await page.locator('.ui-as-side__item[aria-current=page]').innerText(), 'Tracing');
  });
  await check('The Tree view has no blocks to put a star on, so it keeps the stack under the name pill', async () => {
    await goto(page, 'Process');
    await page.waitForSelector('.pmap__block');
    await page.locator('.agt__extra').getByRole('button', { name: 'Clear' }).click().catch(() => {});
    await page.getByRole('button', { name: 'Tree', exact: true }).click();
    await run(page).click();
    await page.waitForSelector('.proc-notices .nsc__card', { timeout: 30000 });
    assert.equal(await page.locator('.pmap__spark').count(), 0);
    const stack = await box(page.locator('.proc-notices .nsc')), pill = await box(page.locator('.proc-pill--name'));
    assert.ok(stack.y >= pill.y + pill.height, 'under the name pill');
    await page.screenshot({ path: `${out}/process-notice-tree.png` });
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click().catch(() => {});
  });
  await context.close();
}

// ---------- phone ----------
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await check('Phone: no horizontal overflow, blocks are readable, the dock fits and the settings open as a sheet', async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    assert.ok((await view(page)).scale >= 0.55, 'blocks are not shrunk past reading');
    const dock = await box(page.locator('.proc-dock'));
    assert.ok(dock.x >= 0 && dock.x + dock.width <= 391, `dock ${dock.x}..${dock.x + dock.width}`);
    assert.equal(await page.locator('.proc-side').count(), 0);
    await page.screenshot({ path: `${out}/process-phone.png` });
    await block(page, 'Coordinator').locator('.agt__name').tap();
    const dialog = page.getByRole('dialog', { name: 'Task settings' });
    await dialog.waitFor();
    await dialog.locator('input.proc-input').first().fill('Conductor');
    await dialog.getByRole('button', { name: /Close/ }).first().click();
    assert.equal(await block(page, 'Conductor').count(), 1);
  });
  await check('Phone: a finger drags the background to pan and a block to move it; two fingers pinch to zoom', async () => {
    const client = await context.newCDPSession(page);
    const touch = (type, points) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, index) => ({ ...point, id: index })) });
    const start = await view(page);
    await touch('touchStart', [{ x: 40, y: 300 }]);
    for (let step = 1; step <= 6; step += 1) await touch('touchMove', [{ x: 40 + step * 10, y: 300 + step * 5 }]);
    await touch('touchEnd', []);
    const panned = await view(page);
    assert.ok(panned.x - start.x > 40 && panned.y - start.y > 20, `panned ${panned.x - start.x},${panned.y - start.y}`);
    await touch('touchStart', [{ x: 150, y: 400 }, { x: 250, y: 400 }]);
    for (let step = 1; step <= 6; step += 1) await touch('touchMove', [{ x: 150 - step * 12, y: 400 }, { x: 250 + step * 12, y: 400 }]);
    await touch('touchEnd', []);
    assert.ok((await view(page)).scale > panned.scale * 1.3, 'pinching out zooms in');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  });
  await check('Phone: the run can be started and decided without leaving the page', async () => {
    await page.getByRole('button', { name: 'Fit the whole map' }).tap();
    await run(page).tap();
    await waitStatus(page, 'Writer', 'waiting', 10000);
    await page.locator('.agt__sum-btn[data-kind="waiting"]').tap();
    await page.locator('.proc-permissions [role=dialog]').getByRole('button', { name: 'Allow once' }).tap();
    await waitStatus(page, 'Writer', 'running', 4000);
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).tap();
  });
  await check('Phone: a block that finished has a star with a finger-sized target; tapping it opens the card beside or under the block, on the screen, with no sideways scroll', async () => {
    await page.waitForSelector('.pmap__spark', { timeout: 20000 });
    const star = page.locator('.pmap__spark').first();
    const s = await box(star), vp = page.viewportSize();
    assert.ok(s.width >= 36 && s.height >= 36, `target ${s.width}x${s.height}`);
    await star.tap();
    await page.waitForSelector('.pmap__notice .nsc__card');
    await page.waitForTimeout(500);
    const c = await box(page.locator('.pmap__notice'));
    assert.ok(c.x >= 0 && c.x + c.width <= vp.width && c.y >= 0 && c.y + c.height <= vp.height, `card on the screen ${JSON.stringify(c)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    await page.screenshot({ path: `${out}/process-spark-phone.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.pmap__notice'), null, { timeout: 2000 });
  });
  await context.close();
}

// ---------- webkit smoke ----------
{
  const wk = await webkit.launch();
  const { context, page } = await open({ viewport: { width: 1280, height: 900 } }, url, wk);
  await check('WebKit: the map draws with its arrows, a block is edited and a run reaches the approval', async () => {
    assert.equal(await page.locator('.pmap__edge').count(), 8);
    await openBlock(page, 'Planner');
    await inspector(page).locator('input.proc-input').first().fill('Architect');
    assert.equal(await block(page, 'Architect').count(), 1);
    await run(page).click();
    await waitStatus(page, 'Writer', 'waiting', 12000);
    await page.locator('.agt__extra').getByRole('button', { name: 'Stop' }).click();
  });
  await context.close();
  await wk.close();
}

// ---------- a REST backend with a server-run engine (mocked) ----------
{
  const saves = [];
  const runCalls = [];
  let runPhase = 0;
  const T = Date.now();
  const ids = ['launch', 'planner', 'research', 'scraper', 'analyst', 'writer', 'coder', 'tester', 'fixer'];
  const snap = phase => ({
    id: 'srv-run-1', processId: 'proc-launch', startedAt: T, at: T + phase * 4000, state: phase === 0 ? 'waiting' : phase === 1 ? 'running' : 'done',
    nodes: Object.fromEntries(ids.map(id => [id, { status: phase >= 2 ? 'done' : id === 'writer' ? (phase === 0 ? 'waiting' : 'running') : 'running', cost: 0.05 * phase, started: T, ...(phase >= 2 ? { ended: T + 9000 } : {}), ...(id === 'writer' && phase === 0 ? { ask: 'Server asks: ship the copy?' } : {}) }])),
  });
  const config = { baseUrl: 'http://qa.test/api', serverProcess: true };
  let failSaves = 0, conflict = false;
  const rest = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await rest.addInitScript(`window.__workspaceBackendConfig = ${JSON.stringify(config)};`);
  await rest.route('http://qa.test/api/**', async route => {
    const request = route.request(), u = new URL(request.url()), path = u.pathname.replace('/api', '');
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', ...headers }, body: body === undefined ? '' : JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return json(204);
    if (/\/process\/engines$/.test(path)) return json(200, { data: [{ id: 'ollama:llama3.2', label: 'Llama 3.2 (local)', provider: 'ollama', local: true }, { id: 'ollama:qwen', label: 'Qwen (local)', provider: 'ollama', local: true }] });
    if (/\/process\/runs$/.test(path) && request.method() === 'POST') { runCalls.push({ kind: 'start', body: request.postDataJSON(), auth: request.headers().authorization }); runPhase = 0; return json(201, { data: snap(0), version: 'r0' }); }
    if (/\/process\/runs$/.test(path)) return json(200, { data: null });
    if (/\/process\/runs\/[^/]+\/actions$/.test(path)) { runCalls.push({ kind: 'action', body: request.postDataJSON() }); runPhase = 1; return json(200, { data: snap(1) }); }
    if (/\/process\/runs\/[^/]+$/.test(path)) { if (runPhase === 1) runPhase = 2; return json(200, { data: snap(runPhase), version: `r${runPhase}` }); }
    if (/\/workspaces\/[^/]+\/process$/.test(path)) {
      if (request.method() === 'PUT') {
        if (conflict) return json(409, { error: { message: 'Someone else saved a newer copy.' } });
        if (failSaves > 0) { failSaves -= 1; return json(400, { error: { message: 'The server refused this process.' } }); }
        const body = request.postDataJSON();
        saves.push({ ifMatch: request.headers()['if-match'], name: body.data.processes[0].name, base: body.baseVersion });
        return json(200, { version: `v${saves.length}` });
      }
      return json(404, {});
    }
    return json(404, {});
  });
  const restPage = await rest.newPage();
  restPage.setDefaultTimeout(12000);
  restPage.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  await restPage.goto(url, { waitUntil: 'networkidle' });
  await restPage.waitForSelector('.pmap__block');
  await restPage.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await check('REST: the engine chip says connected, the engine\'s installed models are offered and processes save with versions', async () => {
    assert.match(await restPage.locator('.proc-chip[data-kind="connected"]').innerText(), /Connected/);
    await openBlock(restPage, 'Writer');
    await pick(restPage, 'Who does it', 'Ollama');
    await combo(restPage, 'Model').click();
    const options = await restPage.getByRole('option').allInnerTexts();
    assert.ok(options.some(text => /Llama 3\.2 \(local\)/.test(text)) && options.some(text => /Qwen \(local\)/.test(text)), options.join(' | '));
    await restPage.getByRole('option', { name: /Llama 3\.2/ }).click();
    assert.equal(await block(restPage, 'Writer').locator('.agt__model').innerText(), 'Llama 3.2 (local)');
    await restPage.waitForFunction(() => document.querySelector('.proc-save')?.textContent === 'Saved');
    await restPage.locator('.proc-name input').fill('Server plan');
    await restPage.waitForFunction(() => document.querySelector('.proc-save')?.textContent === 'Saved');
    assert.ok(saves.length >= 2, `saves: ${saves.length}`);
    assert.equal(saves.at(-1).name, 'Server plan');
    assert.equal(saves.at(-1).ifMatch, `v${saves.length - 1}`, 'each save carries the version the last one returned');
  });
  await check('REST: a run is started on the server; its snapshots, approval and result are shown; decisions are sent as actions', async () => {
    await run(restPage).click();
    await restPage.waitForFunction(() => document.querySelector('.proc-state')?.textContent === 'Needs you');
    assert.equal(runCalls[0].kind, 'start');
    assert.equal(runCalls[0].body.processId, 'proc-launch');
    assert.equal(runCalls[0].body.process.name, 'Server plan');
    assert.equal(runCalls[0].body.process.root.children[2].ai.model, 'ollama:llama3.2');
    assert.equal(await statusOf(restPage, 'Writer'), 'waiting');
    await restPage.locator('.agt__sum-btn[data-kind="waiting"]').click();
    assert.match(await restPage.locator('.proc-permissions [role=dialog]').innerText(), /Server asks: ship the copy\?/);
    await restPage.locator('.proc-permissions [role=dialog]').getByRole('button', { name: 'Allow once' }).click();
    assert.deepEqual(runCalls.at(-1), { kind: 'action', body: { type: 'approve', id: 'writer' } });
    await restPage.waitForFunction(() => document.querySelector('.proc-state')?.textContent === 'Done', null, { timeout: 15000 });
    assert.equal(await restPage.locator('.agt__node[data-status="done"]').count(), 9);
    await restPage.screenshot({ path: `${out}/process-rest.png` });
  });
  await check('REST: a refused save shows its message and keeps the edit; Retry saves again; a conflict offers Reload', async () => {
    failSaves = 1;
    await restPage.locator('.proc-name input').fill('Server plan 2');
    await restPage.waitForFunction(() => /refused/.test(document.querySelector('.proc-notice[data-kind=error]')?.textContent ?? ''));
    assert.equal(await restPage.locator('.proc-name input').inputValue(), 'Server plan 2');
    await restPage.getByRole('button', { name: 'Retry', exact: true }).click();
    await restPage.waitForFunction(() => document.querySelector('.proc-save')?.textContent === 'Saved');
    conflict = true;
    await restPage.locator('.proc-name input').fill('Server plan 3');
    await restPage.waitForFunction(() => /changed somewhere else/.test(document.querySelector('.proc-notice[data-kind=error]')?.textContent ?? ''));
    assert.equal(await restPage.getByRole('button', { name: 'Reload' }).count(), 1);
    conflict = false;
  });
  await rest.close();
}

// ---------- the whole thing ----------
await check('No page errors and nothing was requested from another origin', async () => {
  assert.deepEqual(errors, []);
  assert.deepEqual([...external], []);
});
await browser.close();
const passed = results.filter(result => result.ok).length;
console.log(passed === results.length ? 'ALL PASS' : 'SOME FAILED', `${passed}/${results.length}`);
await fs.writeFile(`${out}/results.json`, JSON.stringify({ base, results }, null, 2) + '\n');
if (passed !== results.length) process.exit(1);
