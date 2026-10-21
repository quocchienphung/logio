// QA for /personalize?section=tracing (the Trace Waterfall fed by the Process page): the empty state, a run started on the Process page
// (in another tab) appearing live, the waterfall's rows, axis, details window, keyboard and folding, waiting for a person, failed tries,
// the performance cards, loops, several processes, dark mode, phone, WebKit, a mocked server engine, and nothing leaving the browser.
// Usage: node scripts/qa/tracing.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/trace-waterfall/qa';
await fs.mkdir(out, { recursive: true });
const tracingUrl = `${base}/personalize?section=tracing`, processUrl = `${base}/personalize?section=process`;
const results = [], errors = [], external = new Set();
let lastPage = null;
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) {
    if (process.env.QA_SHOTS && lastPage) await lastPage.screenshot({ path: `${out}/failed-${results.length}.png` }).catch(() => {});
    results.push({ name, ok: false, error: String(error.message).split('\n').slice(0, 4).join(' | ') }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 4).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });

function watch(page) {
  lastPage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource/.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  page.on('request', request => { const u = new URL(request.url()); if (u.protocol.startsWith('http') && u.origin !== new URL(base).origin && u.hostname !== 'qa.test') external.add(u.origin); });
}
async function openPage(context, url, selector) {
  const page = await context.newPage();
  watch(page);
  await page.goto(url, { waitUntil: 'networkidle' });
  if (selector) await page.waitForSelector(selector);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  return page;
}
const row = (page, name) => page.locator('.twf__row').filter({ has: page.locator('.twf__title', { hasText: new RegExp(`^${name}$`) }) });
const stat = async (page, label) => (await page.locator('.twf__stat').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`, 'i') }) }).locator('dd').innerText()).trim();
const startRun = async processPage => { await processPage.locator('.agt__extra').getByRole('button', { name: 'Run', exact: true }).click(); };
const goto = async (page, section) => page.locator('.ui-as-side__item', { hasText: section }).click();

// ---------- an empty workspace, then a run that starts somewhere else ----------
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const trace = await openPage(context, tracingUrl);
  await trace.waitForSelector('.trc__empty');
  await check('Tracing is a third section after Process: with no run it says so and sends the person to the Process page', async () => {
    assert.deepEqual(await trace.locator('.ui-as-side__item').allInnerTexts(), ['Mapping', 'Process', 'Tracing']);
    assert.equal(await trace.locator('.ui-as-side__item[aria-current=page]').innerText(), 'Tracing');
    assert.match(await trace.locator('.trc__empty h2').innerText(), /No run of “Launch the pricing page” yet/);
    assert.equal(await trace.locator('.trc h1').innerText(), 'Tracing');
    assert.match(await trace.locator('.trc__chip').innerText(), /Simulated/);
    await trace.screenshot({ path: `${out}/tracing-empty.png` });
  });

  const process = await openPage(context, processUrl, '.pmap__block');
  await startRun(process);
  await check('A run started on the Process page (in another tab) shows up here by itself, live, within seconds', async () => {
    await trace.waitForSelector('.twf__row', { timeout: 8000 });
    assert.equal(await trace.locator('.trc__empty').count(), 0);
    assert.equal(await trace.locator('.twf__row[data-kind="agent"]').count(), 1);
    const first = await stat(trace, 'Duration');
    await trace.waitForTimeout(1500);
    assert.notEqual(await stat(trace, 'Duration'), first, 'the duration keeps counting');
    assert.match(await trace.locator('.twf__head .twf__pill').innerText(), /Live|Needs you/);
  });
  await check('The waterfall is built from the run: the first block is the agent run, the others sub-agents, each with model calls, tool calls and a logo', async () => {
    await trace.waitForFunction(() => document.querySelectorAll('.twf__row[data-kind="tool"]').length >= 3, null, { timeout: 15000 });
    const root = trace.locator('.twf__row[data-kind="agent"]');
    assert.equal(await root.getAttribute('aria-level'), '1');
    assert.equal(await root.locator('.twf__title').innerText(), 'Coordinator');
    assert.ok(await trace.locator('.twf__row[data-kind="subagent"]').count() >= 5);
    assert.ok(await trace.locator('.twf__row[data-kind="llm"]').count() >= 5);
    assert.ok(await trace.locator('.twf__row[data-kind="tool"]').count() >= 3);
    assert.equal(await trace.locator('.twf__row[data-kind="subagent"] .twf__icon[data-logo] svg').count() >= 5, true, 'a real logo for each AI engine');
    assert.equal(await trace.locator('[role=tree]').count(), 1);
    assert.ok(await trace.locator('.twf__row[aria-level="3"]').count() > 0, 'calls are one level under their block');
    assert.match(await row(trace, 'Planner').getAttribute('aria-label'), /^Planner, Block, (Running|Done), /);
  });
  await check('Header numbers: duration, cost, tokens, calls and errors count up while the run goes; the heading shows the goal', async () => {
    assert.equal(await trace.locator('.twf__heading').innerText(), 'Trace');
    assert.match(await trace.locator('.twf__task').innerText(), /Launch the new pricing page by Friday/);
    assert.deepEqual(await trace.locator('.twf__stat dt').allInnerTexts(), ['Duration', 'Cost', 'Tokens', 'LLM calls', 'Tool calls', 'Errors']);
    assert.match(await stat(trace, 'Cost'), /^\$\d+\.\d+$/);
    assert.match(await stat(trace, 'Tokens'), /^\d+(\.\d)?k?$/);
    assert.ok(Number(await stat(trace, 'LLM calls')) >= 5);
    assert.equal(await trace.locator('.twf__amount[data-live]').count() > 0, true, 'live numbers shimmer');
  });
  await check('The axis follows the run: round ticks starting at 0s, never more than five, and it moves up as the run gets longer', async () => {
    const ticks = async () => (await trace.locator('.twf__tick:not([data-leaving]) > span').allInnerTexts());
    const early = await ticks();
    assert.equal(early[0], '0s');
    assert.ok(early.length >= 3 && early.length <= 5, early.join(','));
    await trace.waitForFunction(() => /(^|,)(1m|20s|30s|40s|10s)(,|$)/.test([...document.querySelectorAll('.twf__tick:not([data-leaving]) > span')].map(el => el.textContent).join(',')), null, { timeout: 30000 });
    assert.ok((await ticks()).length <= 5);
  });
  await check('A task that waits for a person shows a "Waiting for approval" span that is still running, and the state says Needs you', async () => {
    await trace.waitForFunction(() => document.querySelector('.twf__head .twf__pill')?.textContent === 'Needs you');
    const wait = trace.locator('.twf__row[data-kind="wait"]').first();
    assert.equal(await wait.getAttribute('data-status'), 'running');
    assert.match(await trace.locator('.trc__callout').innerText(), /waiting for you/);
  });

  await check('Details: a click opens a window with the span\'s numbers and input; Esc closes it and puts focus back on the row', async () => {
    await row(trace, 'Planner').click();
    const dialog = trace.getByRole('dialog', { name: 'Planner details' });
    await dialog.waitFor();
    const text = await dialog.innerText();
    for (const word of ['Duration', 'Started', 'Input', 'Break the launch into steps']) assert.ok(text.includes(word), word);
    assert.equal(await row(trace, 'Planner').getAttribute('aria-selected'), 'true');
    await trace.screenshot({ path: `${out}/tracing-details.png` });
    await trace.keyboard.press('Escape');
    await trace.waitForFunction(() => !document.querySelector('.twf__pop'));
    assert.equal(await trace.evaluate(() => document.activeElement?.classList.contains('twf__row') && document.activeElement.querySelector('.twf__title').textContent), 'Planner');
    // a model call shows tokens and cost
    await trace.locator('.twf__row[data-kind="llm"]').first().click();
    const llm = await trace.getByRole('dialog').innerText();
    assert.match(llm, /Tokens in/);
    assert.match(llm, /Cost/);
    await trace.keyboard.press('Escape');
  });
  await check('Keyboard: one row is in the tab order; arrows, Home and End move between rows; Left folds and shows +N, Right opens again', async () => {
    assert.equal(await trace.locator('.twf__row[tabindex="0"]').count(), 1);
    await row(trace, 'Coordinator').focus();
    await trace.keyboard.press('ArrowDown');
    assert.equal(await trace.evaluate(() => document.activeElement.querySelector('.twf__title').textContent) !== 'Coordinator', true);
    await trace.keyboard.press('End');
    const last = await trace.evaluate(() => document.activeElement.getAttribute('aria-label'));
    await trace.keyboard.press('Home');
    assert.equal(await trace.evaluate(() => document.activeElement.querySelector('.twf__title').textContent), 'Coordinator');
    assert.ok(last.length > 0);
    await row(trace, 'Researcher').focus();
    await trace.keyboard.press('ArrowLeft');
    assert.equal(await row(trace, 'Researcher').getAttribute('aria-expanded'), 'false');
    assert.match(await row(trace, 'Researcher').locator('.twf__more').innerText(), /^\+\d+$/);
    assert.ok(await row(trace, 'Researcher').locator('.twf__mark').count() > 0, 'its calls are drawn as small marks on its bar');
    await trace.keyboard.press('ArrowLeft');
    assert.equal(await trace.evaluate(() => document.activeElement.querySelector('.twf__title').textContent), 'Coordinator', 'Left on a folded row goes to its parent');
    await row(trace, 'Researcher').focus();
    await trace.keyboard.press('ArrowRight');
    assert.equal(await row(trace, 'Researcher').getAttribute('aria-expanded'), 'true');
    await trace.keyboard.press('Enter');
    await trace.getByRole('dialog', { name: 'Researcher details' }).waitFor();
    await trace.keyboard.press('Escape');
  });
  await check('Fold finished closes finished blocks to one line each; Expand all opens them again; clicking a chevron folds one block', async () => {
    const before = await trace.locator('.twf__row:not([data-hidden])').count();
    await row(trace, 'Planner').locator('.twf__chev').click();
    await trace.waitForTimeout(500);
    assert.ok(await trace.locator('.twf__row:not([data-hidden])').count() < before);
    await row(trace, 'Planner').locator('.twf__chev').click();
    await trace.getByRole('button', { name: 'Fold finished' }).click();
    await trace.waitForTimeout(600);
    assert.ok(await trace.locator('.twf__row:not([data-hidden])').count() < before);
    await trace.getByRole('button', { name: 'Expand all' }).click();
    await trace.waitForTimeout(600);
    assert.equal(await trace.locator('.twf__row:not([data-hidden])').count() >= before, true);
  });

  await check('The performance cards read the same trace: where the time went, the critical path and the engines; a row opens that span', async () => {
    assert.equal(await trace.locator('.trc__metric').count(), 4);
    assert.match(await trace.locator('.trc__metric').first().innerText(), /Parallelism\s+\d+\.\d×/);
    assert.ok(await trace.locator('.trc__bars li').count() >= 3);
    assert.equal(await trace.locator('.trc__path li').first().innerText().then(text => text.replace(/\s+/g, ' ')), '1 Coordinator ' + (await trace.locator('.trc__path li').first().locator('.trc__bar-value').innerText()));
    assert.ok(await trace.locator('.trc__table tbody tr').count() >= 3);
    const name = await trace.locator('.trc__bars li').first().locator('.trc__bar-name').innerText();
    await trace.locator('.trc__bars li').first().getByRole('button').click();
    await trace.getByRole('dialog', { name: `${name} details` }).waitFor();
    await trace.keyboard.press('Escape');
    await trace.screenshot({ path: `${out}/tracing-desktop.png`, fullPage: false });
  });

  // the person decides on the Process page; the trace shows how long the task waited
  await check('After the person approves on the Process page, the waiting span closes with the time it took, and the failed try of the tester stays as its own failed span', async () => {
    await process.locator('.agt__sum-btn[data-kind="waiting"]').click();
    await process.getByRole('dialog', { name: 'Blocks that need you' }).getByRole('button', { name: 'Approve' }).click();
    await trace.waitForFunction(() => { const wait = document.querySelector('.twf__row[data-kind="wait"]'); return wait?.getAttribute('data-status') === 'done'; }, null, { timeout: 10000 });
    await trace.waitForFunction(() => !!document.querySelector('.twf__row[data-kind="subagent"][data-status="failed"]'), null, { timeout: 30000 });
    assert.equal(await stat(trace, 'Errors') >= '1', true);
    assert.equal(await trace.locator('.twf__stat[data-kind="failed"]').count(), 1);
    await row(trace, 'Tester').click();
    assert.match(await trace.getByRole('dialog', { name: 'Tester details' }).innerText(), /Failed/);
    await trace.keyboard.press('Escape');
    await process.locator('.agt__sum-btn[data-kind="failed"]').click();
    await process.getByRole('dialog', { name: 'Failed blocks' }).getByRole('button', { name: 'Retry' }).click();
    await trace.waitForFunction(() => [...document.querySelectorAll('.twf__row[data-status="failed"] .twf__title')].some(el => /try 1/.test(el.textContent)), null, { timeout: 10000 });
    assert.equal(await trace.locator('.twf__row[data-status="failed"]').count() >= 1, true, 'the failed try is kept');
  });
  await check('When every block is finished the state turns Done, the clock stops and the numbers settle', async () => {
    await trace.waitForFunction(() => document.querySelector('.twf__head .twf__pill')?.textContent === 'Done', null, { timeout: 90000 });
    assert.equal(await trace.locator('.twf__bar[data-status="running"]').count(), 0);
    const duration = await stat(trace, 'Duration'), cost = await stat(trace, 'Cost');
    await trace.waitForTimeout(1500);
    assert.equal(await stat(trace, 'Duration'), duration);
    assert.equal(await stat(trace, 'Cost'), cost);
    assert.equal(await trace.locator('.twf__amount[data-live]').count(), 0);
    assert.equal(await trace.locator('.twf__row[data-slow]').count(), 1, 'the slowest call is tagged');
    assert.equal(await trace.locator('.trc__callout').count(), 0);
    await trace.screenshot({ path: `${out}/tracing-done.png` });
  });
  await check('Dark mode: the waterfall follows the theme class and keeps its colors readable', async () => {
    await trace.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
    await trace.waitForTimeout(300);
    const colors = await trace.evaluate(() => { const style = getComputedStyle(document.querySelector('.twf')); return { background: style.backgroundColor, text: getComputedStyle(document.querySelector('.twf__title')).color }; });
    assert.equal(colors.background, 'rgb(28, 28, 31)');
    assert.notEqual(colors.text, 'rgb(0, 0, 0)');
    await trace.screenshot({ path: `${out}/tracing-dark.png` });
    await trace.evaluate(() => { document.documentElement.classList.remove('dark'); document.documentElement.removeAttribute('data-theme'); });
  });

  await check('Several processes: the picker switches which run is shown; a process that has not run says so', async () => {
    await process.getByRole('button', { name: 'New process' }).click();
    await process.getByRole('dialog').getByRole('button', { name: /^Blank/ }).click();
    await process.waitForTimeout(900);
    await trace.waitForSelector('.trc__actions .cbx', { timeout: 8000 });
    await trace.getByRole('combobox', { name: 'Process' }).click();
    await trace.getByRole('option', { name: 'Untitled process' }).click();
    await trace.waitForSelector('.trc__empty');
    assert.match(await trace.locator('.trc__empty h2').innerText(), /Untitled process/);
    await trace.getByRole('combobox', { name: 'Process' }).click();
    await trace.getByRole('option', { name: 'Launch the pricing page' }).click();
    await trace.waitForSelector('.twf__row');
    await trace.getByRole('button', { name: 'Open in Process' }).click();
    await trace.waitForSelector('.pmap__block');
    assert.equal(await trace.locator('.ui-as-side__item[aria-current=page]').innerText(), 'Process');
  });
  await context.close();
}

// ---------- a loop shows each round ----------
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const process = await openPage(context, processUrl, '.pmap__block');
  await process.getByRole('button', { name: 'New process' }).click();
  await process.getByRole('dialog').getByRole('button', { name: /Closed loop: ship to production/ }).click();
  await process.waitForSelector('.pmap__block');
  await startRun(process);
  await goto(process, 'Tracing');
  await process.waitForSelector('.twf__row');
  await check('A loop shows in the trace: the plan ran twice, so the run holds a span for each round, and the deploy asked twice', async () => {
    await process.waitForFunction(() => document.querySelector('.twf__row[data-kind="wait"]'), null, { timeout: 90000 });
    await goto(process, 'Process');
    await process.waitForSelector('.pmap__block');
    await process.getByRole('button', { name: /Allow once/ }).click({ timeout: 90000 });
    await goto(process, 'Tracing');
    await process.waitForFunction(() => [...document.querySelectorAll('.twf__row[data-kind="subagent"] .twf__detail')].some(el => /round 2/.test(el.textContent)), null, { timeout: 90000 });
    const details = await process.locator('.twf__row[aria-level="2"][data-kind="subagent"] .twf__detail').allInnerTexts();
    assert.ok(details.some(text => /round 1/.test(text)) && details.some(text => /round 2/.test(text)), details.join(' | '));
    assert.equal(await process.locator('.twf__row[aria-level="1"] .twf__title').innerText(), 'Coordinator');
    await process.getByRole('combobox', { name: 'Process' }).count();
    assert.match(await process.locator('.trc__metric').nth(2).innerText(), /Rounds\s+2/);
    await process.screenshot({ path: `${out}/tracing-loop.png` });
  });
  await context.close();
}

// ---------- phone ----------
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await openPage(context, processUrl, '.pmap__block');
  await page.locator('.agt__extra').getByRole('button', { name: 'Run', exact: true }).tap();
  await page.waitForTimeout(700);
  await page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('section', 'tracing'); history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForSelector('.twf__row');
  await page.waitForTimeout(3000);
  await check('Phone: no horizontal overflow; each row stacks (name, time and cost on one line, the bar under it); the numbers wrap to three columns', async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    assert.equal(await page.locator('.twf[data-narrow]').count(), 1);
    const meta = await page.locator('.twf__row[data-kind="subagent"]').first().locator('.twf__meta').evaluate(el => getComputedStyle(el).display);
    assert.equal(meta, 'flex');
    const columns = await page.locator('.twf__stats').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, 3);
    const bar = await page.locator('.twf__row').first().evaluate(el => { const bar = el.querySelector('.twf__bar').getBoundingClientRect(), name = el.querySelector('.twf__name').getBoundingClientRect(); return bar.top >= name.bottom - 1; });
    assert.equal(bar, true, 'the bar is under the name');
    await page.screenshot({ path: `${out}/tracing-phone.png` });
  });
  await check('Phone: a tap opens the details inside the screen and a second tap closes it; the cards fall into one column', async () => {
    await page.locator('.twf__row[data-kind="subagent"]').first().tap();
    const dialog = page.getByRole('dialog').first();
    await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 391, `${box.x}..${box.x + box.width}`);
    await dialog.getByRole('button', { name: 'Close details' }).tap();
    await page.waitForFunction(() => !document.querySelector('.twf__pop'));
    await page.locator('.trc__metrics').scrollIntoViewIfNeeded();
    const columns = await page.locator('.trc__grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  });
  await context.close();
}

// ---------- webkit smoke ----------
{
  const wk = await webkit.launch();
  const context = await wk.newContext({ viewport: { width: 1280, height: 900 } });
  const process = await openPage(context, processUrl, '.pmap__block');
  await startRun(process);
  await goto(process, 'Tracing');
  await check('WebKit: the waterfall draws its bars and ticks, a row opens its details and the run counts up', async () => {
    await process.waitForSelector('.twf__row');
    await process.waitForTimeout(2500);
    assert.ok(await process.locator('.twf__bar').count() >= 5);
    assert.ok(await process.locator('.twf__tick').count() >= 3);
    const width = await process.locator('.twf__row[data-kind="subagent"] .twf__bar').first().evaluate(el => el.getBoundingClientRect().width);
    assert.ok(width > 3, `bar ${width}px wide`);
    await process.locator('.twf__row[data-kind="subagent"]').first().click();
    await process.getByRole('dialog').first().waitFor();
    assert.ok(Number((await stat(process, 'LLM calls'))) >= 3);
  });
  await context.close();
  await wk.close();
}

// ---------- a server runs the process (mocked): its spans are shown as reported, nothing is invented ----------
{
  const T = Date.now() - 20_000;
  const ids = ['launch', 'planner', 'research', 'scraper', 'analyst', 'writer', 'coder', 'tester', 'fixer'];
  const nodes = Object.fromEntries(ids.map((id, index) => [id, { status: id === 'fixer' ? 'running' : 'done', cost: 0.05, started: T + index * 1500, ...(id === 'fixer' ? {} : { ended: T + 8000 + index * 1500 }),
    ...(id === 'planner' ? { calls: [{ id: 'c1', kind: 'llm', name: 'Draft the plan', status: 'done', start: T + 1500, end: T + 4500, tokensIn: 1200, tokensOut: 300, cost: 0.02, input: 'Plan it', output: 'Three steps' }, { id: 'c2', kind: 'tool', name: 'web_search', detail: 'competitors', status: 'failed', start: T + 4600, end: T + 6000, error: 'Rate limited' }] } : {}) }]));
  const snapshot = { id: 'srv-1', processId: 'proc-launch', startedAt: T, at: T + 20_000, state: 'running', nodes };
  const rest = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await rest.addInitScript(`window.__workspaceBackendConfig = ${JSON.stringify({ baseUrl: 'http://qa.test/api', serverProcess: true })};`);
  await rest.route('http://qa.test/api/**', async route => {
    const request = route.request(), u = new URL(request.url()), path = u.pathname.replace('/api', '');
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: body === undefined ? '' : JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return json(204);
    if (/\/process\/runs$/.test(path) && request.method() === 'GET') return json(200, { data: { ...snapshot, at: Date.now() }, version: 'r1' });
    if (/\/process\/engines$/.test(path)) return json(200, { data: [] });
    return json(404, {});
  });
  const page = await openPage(rest, tracingUrl);
  await check('Server engine: the newest run is read from the engine; block spans and the calls it reported are shown, none are invented', async () => {
    await page.waitForSelector('.twf__row', { timeout: 15000 });
    assert.match(await page.locator('.trc__chip').innerText(), /Connected/);
    assert.equal(await page.locator('.twf__row[data-kind="subagent"]').count(), 8);
    assert.equal(await page.locator('.twf__row[data-kind="llm"]').count(), 1, 'only the call the server reported');
    assert.equal(await page.locator('.twf__row[data-kind="tool"]').count(), 1);
    assert.equal(await page.locator('.twf__row[data-kind="tool"]').getAttribute('data-status'), 'failed');
    assert.equal(await stat(page, 'Errors'), '1');
    assert.match(await page.locator('.trc__caption').innerText(), /what the connected engine reported/);
    await page.locator('.twf__row[data-kind="llm"]').click();
    const text = await page.getByRole('dialog').innerText();
    assert.match(text, /Tokens in\s+1\.2k/);
    assert.match(text, /Three steps/);
    await page.screenshot({ path: `${out}/tracing-server.png` });
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
