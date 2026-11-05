// QA for the two extra lanes (Hermes Agent, Ollama) in the CRM frame of /personalize?browse=1&group=crm.
// Covers the marks, the demo tasks, fit and symmetric whitespace at many frame sizes, popovers staying inside the frame,
// the ?lanes=base escape hatch, native taps and zero external requests.
// Usage: node scripts/qa/agent-lanes-extra.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/agent-lanes/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?browse=1&group=crm`;
const results = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false, error: String(error.message).split('\n')[0] }); console.log('FAIL', name, '\n  ', String(error.message).split('\n').slice(0, 3).join('\n   ')); }
};

const browser = await chromium.launch({ channel: 'chrome' });
const open = async (options, target = url, engine = browser) => {
  const context = await engine.newContext({ reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const external = [];
  const errors = [];
  page.on('request', request => { const u = new URL(request.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !/^(data|blob):/.test(request.url()) && u.hostname !== new URL(base).hostname) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text().slice(0, 160)); });
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForSelector('.agl__block');
  await page.waitForTimeout(500);
  return { context, page, external, errors };
};
const layout = page => page.evaluate(() => {
  const frame = document.querySelector('.crm-lanes').getBoundingClientRect();
  const card = document.querySelector('.agl__card').getBoundingClientRect();
  return {
    frame: [frame.width, frame.height], card: [card.width, card.height], above: card.top - frame.top, below: frame.bottom - card.bottom,
    tight: document.querySelector('.agl').classList.contains('agl--tight'), agents: document.querySelectorAll('.agl__agent').length, svgs: document.querySelectorAll('.agl__avatar svg').length,
    clipped: card.top < frame.top - 0.5 || card.bottom > frame.bottom + 0.5 || card.left < frame.left - 0.5 || card.right > frame.right + 0.5,
  };
});
// Six lanes at most; the card's padding is trimmed (73 instead of 87) only when that buys one more lane.
const expectedRows = height => {
  const roomy = Math.min(6, Math.floor((height - 87) / 48));
  const snug = Math.min(6, Math.floor((height - 73) / 48));
  return snug > Math.max(roomy, 4) ? { lanes: snug, tight: true } : { lanes: Math.max(4, roomy), tight: false };
};

{
  const { context, page, external, errors } = await open({ viewport: { width: 1440, height: 1000 } });
  await check('Hermes Agent and Ollama join as lanes 5 and 6 with real, sized marks', async () => {
    const info = await page.evaluate(() => [...document.querySelectorAll('.agl__agent')].map(agent => {
      const tile = agent.querySelector('.agl__avatar'); const svg = tile.querySelector('svg');
      return { label: tile.getAttribute('aria-label'), paths: svg.querySelectorAll('path').length, box: svg.getBoundingClientRect().width, title: agent.title, logo: tile.hasAttribute('data-logo') };
    }));
    assert.deepEqual(info.map(row => row.label), ['Claude', 'Claude', 'ChatGPT', 'Gemini', 'Hermes Agent', 'Ollama']);
    for (const row of info.slice(4)) { assert.ok(row.paths >= 1 && row.logo); assert.equal(row.box, 18); }
    assert.match(info[4].title, /Hermes Agent/); assert.match(info[5].title, /Ollama/);
  });
  await check('The reference lanes are untouched; the new lanes carry the duplicated block style', async () => {
    const blocks = await page.locator('.agl__block').evaluateAll(els => els.map(el => [el.dataset.taskId, el.dataset.status]));
    assert.deepEqual(blocks.slice(0, 6).map(row => row[1]), ['done', 'running', 'running', 'done', 'failed', 'waiting']);
    assert.deepEqual(blocks.slice(6), [['h1', 'done'], ['h2', 'running'], ['l1', 'done'], ['l2', 'running']]);
    assert.equal(await page.locator('.agl__summary [data-kind="running"]').textContent(), '4 running');
    assert.equal(await page.locator('.agl__summary [data-kind="needs"]').textContent(), '1 need you');
    assert.equal(await page.locator('.agl__curves path').count(), 1);
    const tools = await page.locator('[data-task-id="h1"] .agl__tool svg, [data-task-id="l2"] .agl__tool svg').count();
    assert.equal(tools, 3);
  });
  await check('Tooltips of the new blocks show their summaries and stay inside the frame', async () => {
    for (const [id, text] of [['h1', 'Read 38 new tickets'], ['h2', 'Answering the 9 urgent tickets'], ['l1', 'Embedded them on this machine'], ['l2', 'Running 40 prompts']]) {
      await page.locator(`[data-task-id="${id}"]`).click();
      assert.match(await page.locator('.agl__pop').innerText(), new RegExp(text));
      const inside = await page.evaluate(() => { const pop = document.querySelector('.agl__pop').getBoundingClientRect(), frame = document.querySelector('.crm-lanes').getBoundingClientRect(); return pop.left >= frame.left - 1 && pop.right <= frame.right + 1 && pop.top >= frame.top - 1 && pop.bottom <= frame.bottom + 1; });
      assert.ok(inside, `${id} popover outside the frame`);
    }
    await page.keyboard.press('Escape');
  });
  await check('The approval dialog still works with six lanes', async () => {
    await page.locator('[data-task-id="o2"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Approve');
    const inside = await page.evaluate(() => { const pop = document.querySelector('.agl__pop').getBoundingClientRect(), frame = document.querySelector('.crm-lanes').getBoundingClientRect(); return pop.left >= frame.left - 1 && pop.right <= frame.right + 1 && pop.top >= frame.top - 1 && pop.bottom <= frame.bottom + 1; });
    assert.ok(inside);
    await page.getByRole('button', { name: 'Approve' }).click();
    assert.equal(await page.locator('[data-task-id="o2"]').getAttribute('data-status'), 'running');
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.agl__block');
  await page.locator('.guide-preview').screenshot({ path: `${out}/extra-lanes-1440.png` });
  await check('Nothing external was requested and nothing errored', async () => { assert.deepEqual(external, []); assert.deepEqual(errors, []); });
  await context.close();
}

const sizes = [
  ['320x640 small phone', { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['360x740 phone', { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['375x667 phone', { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['390x844 phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['430x932 large phone', { viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['844x390 landscape', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['768x1024 tablet', { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 2 }],
  ['1024x768 laptop', { viewport: { width: 1024, height: 768 } }],
  ['1440x900 desktop', { viewport: { width: 1440, height: 900 } }],
  ['1920x1080 wide', { viewport: { width: 1920, height: 1080 } }],
];
const fitted = {};
for (const [label, options] of sizes) {
  const { context, page } = await open(options);
  await check(`${label}: lanes fit the frame, never clip, and the whitespace above and below matches`, async () => {
    const info = await layout(page);
    fitted[label] = info;
    const expected = expectedRows(info.frame[1]);
    assert.equal(info.agents, expected.lanes, `${info.agents} lanes in a ${info.frame[1]}px frame`);
    assert.equal(info.tight, expected.tight);
    assert.ok(Math.abs(info.card[1] - ((info.tight ? 73 : 87) + 48 * info.agents)) <= 1, `card ${info.card[1]}px for ${info.agents} lanes`);
    assert.equal(info.svgs, info.agents);
    assert.equal(info.clipped, false, JSON.stringify(info));
    assert.ok(Math.abs(info.above - info.below) <= 1, `above ${info.above} below ${info.below}`);
    assert.ok(info.above < 48, `${info.above}px of blank above: another lane would have fit`);
  });
  if (label.startsWith('390') || label.startsWith('1440') || label.startsWith('320')) await page.locator('.guide-preview').screenshot({ path: `${out}/extra-lanes-${label.split(' ')[0]}.png` });
  await context.close();
}

await check('Both new lanes show on 390px phones and up; smaller phones show as many as fit', async () => {
  for (const label of ['390x844 phone', '430x932 large phone', '768x1024 tablet', '1024x768 laptop', '1440x900 desktop', '1920x1080 wide']) assert.equal(fitted[label].agents, 6, label);
  assert.equal(fitted['320x640 small phone'].agents, 4);
});

{
  const { context, page } = await open({ viewport: { width: 1440, height: 1000 } }, `${url}&lanes=base`);
  await check('?lanes=base keeps the reference\'s four lanes for the comparison script', async () => {
    assert.equal(await page.locator('.agl__agent').count(), 4);
    assert.equal(await page.locator('.agl__summary [data-kind="running"]').textContent(), '2 running');
  });
  await context.close();
}

for (const [name, engine, launch] of [['chromium', chromium, { channel: 'chrome' }], ['webkit', webkit, {}]]) {
  const touchBrowser = await engine.launch(launch);
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, url, touchBrowser);
  await check(`${name}: a native tap on a new block opens its details without leaving CRM`, async () => {
    const lanes = await page.locator('.agl__agent').count();
    const target = lanes >= 5 ? 'h2' : 'r2';
    await page.locator(`[data-task-id="${target}"]`).tap();
    assert.equal(await page.locator('.agl__pop').count(), 1);
    assert.equal(await page.evaluate(() => document.querySelector('.guide-item[aria-current] .guide-item__name').textContent), 'CRM');
    const info = await layout(page);
    assert.equal(info.clipped, false);
  });
  await context.close();
  await touchBrowser.close();
}

const passed = results.filter(result => result.ok).length;
console.log(passed === results.length ? 'ALL PASS' : 'SOME FAILED', `${passed}/${results.length}`);
await fs.writeFile(`${out}/extra-lanes-results.json`, JSON.stringify({ base, results, fitted }, null, 2) + '\n');
await browser.close();
if (passed !== results.length) process.exit(1);
