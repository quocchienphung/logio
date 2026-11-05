import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:3000';
const approvalsOnly = process.argv.includes('--approvals-only');
const out = 'docs/research/workspace-i18n/orchestrator-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }), results = [], errors = [];
let lastPage, complete = false;
async function open(viewport, locale = 'en') {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  await context.addInitScript(locale => {
    localStorage.setItem('affectui:interface-language', JSON.stringify(locale));
    localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() }));
  }, locale);
  const page = await context.newPage(); lastPage = page; page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/personalize?section=orchestrator`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.ob').waitFor();
  await page.locator(`.crm-page[lang="${locale}"]`).waitFor();
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  return { page, context };
}
async function language(page, locale) {
  if (!await page.locator('.ui-as-user').isVisible()) await page.locator('.ui-as-side-open').click();
  await page.locator('.ui-as-user').click();
  await page.locator(`.account-language [lang="${locale}"]`).click();
  await page.locator(`.crm-page[lang="${locale}"]`).waitFor();
  await page.keyboard.press('Escape');
  if (await page.locator('.ui-as-app[data-drawer]').count()) {
    await page.locator('.ui-as-scrim').click({ position: { x: page.viewportSize().width - 6, y: 6 } });
  }
  await page.waitForTimeout(500);
}
const fonts = page => page.evaluate(() => Object.fromEntries(['.orch h1', '.ob-goal', '.ob-lane__titletext', '.op-seg__label', '.tl-name'].map(selector => {
  const s = getComputedStyle(document.querySelector(selector)); return [selector, [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight]];
})));
const finished = page => page.waitForFunction(() => document.querySelectorAll('.ob-lane[data-phase="done"]').length === 4 && /Chạy lại|Run again/.test(document.querySelector('.ob-toolbar').textContent));

try {
  for (const viewport of approvalsOnly ? [] : [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const { page, context } = await open(viewport);
    const laneRect = await page.locator('.ob-lane').first().boundingBox();
    await page.locator('.ob-toolbar .op-btn').click();
    await page.waitForFunction(() => document.querySelectorAll('.ob-plan__item').length === 4);
    const originalFonts = await fonts(page);
    await language(page, 'vi');
    assert.equal(await page.locator('.ob-plan__item').count(), 4, 'language switch preserves the running plan');
    await finished(page); await page.waitForTimeout(600);
    assert.deepEqual(await fonts(page), originalFonts, 'font family/size/weight/line height remain unchanged');
    const viLane = await page.locator('.ob-lane').first().boundingBox();
    assert.equal(viLane.width, laneRect.width); assert.equal(viLane.height, laneRect.height);
    assert.match(await page.locator('.ob-summary').innerText(), /Giá của chúng ta cao hơn Notewise và Quillstack/);
    assert.match(await page.locator('.ob-totals').innerText(), /119\.7k/);
    assert.match(await page.locator('.ob-totals').innerText(), /\$0\.19/);
    assert.match(await page.locator('.ob-toolbar .op-btn').innerText(), /Chạy lại/);
    await page.locator('.ob-lane__button').first().click();
    const transcript = page.locator('.ob-transcript').first();
    assert.match(await transcript.innerText(), /Đã đọc 212 dòng/);
    assert.match(await transcript.innerText(), /docs\/pricing\.md/);
    assert.match(await transcript.innerText(), /notewise\.io\/pricing/);
    await page.locator('.ob-lane__button').first().click();
    if (await page.locator('.tc-group__toggle').getAttribute('aria-expanded') === 'false') await page.locator('.tc-group__toggle').click();
    const firstCall = page.locator('.tc-call').first();
    await firstCall.locator('.tc-toggle').click();
    assert.match(await firstCall.innerText(), /Đầu vào/);
    assert.match(await firstCall.innerText(), /notewise pricing per seat 2026/);
    await firstCall.getByRole('button', { name: 'Chép đầu vào', exact: true }).click();
    assert.deepEqual(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())), { query: 'notewise pricing per seat 2026', limit: 10 });
    await firstCall.getByRole('button', { name: 'Chép đầu ra', exact: true }).click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /Notewise pricing/);
    assert.match(await firstCall.innerText(), /Giá Notewise/);
    await page.locator('.ob-toolbar').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/top-${viewport.width}-vi.png` });
    await page.locator('.tl-footer').scrollIntoViewIfNeeded();
    const timeline = page.locator('.tl');
    assert.match(await timeline.locator('.tl-legend').innerText(), /Bàn giao/);
    assert.match(await timeline.locator('.tl-span').first().getAttribute('aria-label'), /từ.*đến/);
    const controls = timeline.locator('.tl-controls .op-btn');
    await controls.first().click(); await page.waitForTimeout(250); await controls.first().click();
    const slider = timeline.getByRole('slider'); await slider.press('Home');
    assert.equal(await slider.getAttribute('aria-valuenow'), '0');
    await slider.press('End'); assert.ok(Number(await slider.getAttribute('aria-valuenow')) > 10);
    await page.screenshot({ path: `${out}/timeline-${viewport.width}-vi.png` });
    const layout = await page.evaluate(() => {
      window.scrollTo(500, 0);
      const main = document.querySelector('.ui-as-main').getBoundingClientRect();
      return { pageOverflow: document.documentElement.scrollWidth - innerWidth, sideways: scrollX, mainRight: main.right, width: innerWidth };
    });
    assert.ok(layout.pageOverflow <= 1 && layout.sideways === 0 && layout.mainRight <= viewport.width + 1, JSON.stringify(layout));
    await language(page, 'en');
    assert.match(await page.locator('.ob-summary').innerText(), /We charge more than Notewise and Quillstack/);
    assert.equal(await page.locator('.ob-lane[data-phase="done"]').count(), 4);
    assert.equal(await page.locator('.ob-toolbar .op-btn').innerText(), 'Run again');
    assert.deepEqual(await fonts(page), originalFonts);
    results.push({ viewport, layout, fonts: originalFonts }); console.log(`PASS Orchestrator EN/VI, state, details, copy, replay and layout at ${viewport.width}`);
    await context.close();
  }
  for (const width of [1440, 320]) {
  const { page, context } = await open({ width, height: width === 320 ? 568 : 1000 }, 'vi');
  await page.locator('.orch__switch').click();
  assert.equal(await page.locator('.orch__switch input').isChecked(), true);
  await page.locator('.ob-toolbar .op-btn').click();
  const denied = page.locator('.tc-call[data-status="approval"]').first();
  await denied.waitFor(); assert.match(await denied.innerText(), /Ghi kết quả/);
  await denied.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/approval-${width}-vi.png` });
  const actionBoxes = await denied.locator('.tc-actions button').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(); return { x: r.x, right: r.right };
  }));
  assert.equal(actionBoxes.length, 2); assert.ok(actionBoxes[0].right <= actionBoxes[1].x && actionBoxes.every(box => box.x >= 0 && box.right <= width));
  await denied.getByRole('button', { name: /^Từ chối:/ }).click();
  for (let i = 0; i < 3; i++) {
    const approval = page.locator('.tc-call[data-status="approval"]').first();
    await approval.waitFor(); await approval.getByRole('button', { name: /^Cho phép:/ }).click();
  }
  await finished(page);
  assert.ok((await page.locator('.ob-lane').allInnerTexts()).some(text => text.includes('không ghi')));
  const post = page.locator('.tc-call[data-status="approval"]').first();
  await post.waitFor(); assert.match(await post.innerText(), /Đăng tóm tắt vào #pricing-review/);
  await post.getByRole('button', { name: /^Cho phép:/ }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.tc-call[data-status="success"]')].some(node => node.textContent.includes('Đã đăng vào #pricing-review')));
  results.push({ approvalWidth: width, actionBoxes });
  console.log(`PASS localized approvals, deny, simulated post and preserved channel at ${width}`); await context.close();
  }
  assert.deepEqual(errors, []);
  complete = true;
} finally {
  if (!complete && lastPage && !lastPage.isClosed()) {
    await lastPage.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await fs.writeFile(`${out}/failure.txt`, await lastPage.locator('body').innerText()).catch(() => {});
  }
  await fs.writeFile(`${out}/results${approvalsOnly ? '-approvals' : ''}.json`, JSON.stringify({ complete, results, errors }, null, 2)); await browser.close();
}
