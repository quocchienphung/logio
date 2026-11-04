// QA for Collateral › Flip: upload step, the three rebuilt components on real workbook data, motion and responsive checks.
// Usage: node scripts/qa/flip.mjs [base-url] [screenshot-dir]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildSmallFixture } from './lib/collateral-fixture.mjs';

const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || 'docs/research/flip/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, ok, detail = '') => { if (!ok) console.error('FAIL', name, detail); assert.ok(ok, `${name} ${detail}`); results.push(name); };
const file = { name: 'Sample workbook.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buildSmallFixture()) };
const context = async options => {
  const ctx = await browser.newContext(options);
  await ctx.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  return ctx;
};
const open = async ctx => {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/personalize?section=flip`, { waitUntil: 'networkidle' });
  await page.locator('.cr-import').waitFor({ timeout: 60000 });
  await page.locator('[data-ascii-cover]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  return page;
};
try {
  const desktop = await context({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const page = await open(desktop);
  check('Flip opens from ?section=flip with its title', await page.getByRole('heading', { level: 1, name: 'Flip' }).count() === 1);
  check('Breadcrumb shows Collateral › Flip', /Collateral/.test(await page.locator('.cl-topbar').innerText()));
  check('The sidebar lists Flip inside the Collateral folder', await page.locator('.ui-as-side__item', { hasText: 'Flip' }).count() >= 1);
  check('No stepper before a workbook is open', await page.getByRole('tab').count() === 0);
  await page.screenshot({ path: `${out}/01-upload.png` });
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByText('Workbook opened', { exact: true }).waitFor({ timeout: 40000 });
  await page.waitForTimeout(600);
  check('The stepper appears with Upload and Flip', await page.getByRole('tab').count() === 2);
  await page.screenshot({ path: `${out}/02-opened.png` });
  await page.getByRole('tab', { name: /Flip/ }).click();
  await page.locator('.fl-stage').waitFor();
  await page.locator('.at-root').waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  check('Ghost text, AI translate and Generation stats are all on the page', await page.locator('.gt-root').count() === 1 && await page.locator('.at-root').count() === 1 && await page.locator('.gs-root').count() === 1);
  await page.screenshot({ path: `${out}/03-stage.png`, fullPage: true });
  console.log(JSON.stringify({ passed: results.length, errors }, null, 2));
  await desktop.close();
} finally { await browser.close(); }
