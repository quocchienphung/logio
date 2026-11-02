import { chromium } from 'playwright';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';
import { HEADERS } from '../qa/lib/collateral-fixture.mjs';

// Frame pacing of the JSON viewer (opening and closing branches, jumping between matches) and of the workflow run, at normal speed and with the
// CPU slowed down 4x. Numbers only. Usage: node json-viewer-fps.mjs <base url>
const base = process.argv[2] || 'http://localhost:3002';
const rows = Array.from({ length: 130 }, (_, i) => { const row = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: '00000123', TENKH: 'Cong ty Mau', MASOBD: `T${String(i).padStart(5, '0')}`, MALOAIBD: '303', NGBDAU: '20200101', GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', DSSOHD: `HD${i}`, MOTABD: `Tai san so ${i}`, MOTABDS: `Tai san so ${i}` }; return HEADERS.map(h => row[h] ?? null); });
const buffer = Buffer.from(buildXlsx([{ name: 'FPS', rows: [HEADERS, ...rows] }]));
const browser = await chromium.launch({ channel: 'chrome' });
const probe = (stopWhen) => new Promise(resolve => { const d = []; let last = performance.now(); const frame = now => { d.push(now - last); last = now; if (window.__probeStop?.()) resolve(d); else requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
const report = (name, d) => { const a = d.slice(2).sort((x, y) => x - y), n = a.length, at = q => a[Math.min(n - 1, Math.floor(n * q))]; console.log(`${name}: ${n} frames | median ${at(0.5).toFixed(1)} ms | p95 ${at(0.95).toFixed(1)} | worst ${a[n - 1].toFixed(1)} | over 20 ms: ${a.filter(x => x > 20).length} | over 34 ms: ${a.filter(x => x > 34).length}`); };
for (const rate of [1, 4]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const p = await ctx.newPage();
  await p.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await p.locator('input[type=file]').setInputFiles({ name: 'f.xlsx', mimeType: 'application/octet-stream', buffer });
  await p.getByRole('button', { name: /See what was found/ }).click(); await p.locator('.cr-overview').waitFor();
  await p.locator('.ui-as-side__nav').getByRole('button', { name: 'JSON formation' }).click(); await p.getByRole('tab', { name: /Preview/ }).click();
  await p.locator('.jv-row').nth(2).waitFor(); await p.waitForTimeout(1500);
  await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate });
  const row = p.locator('.jv-row').filter({ hasText: /^0\s*:/ }).first();
  await p.evaluate(() => { window.__probeStop = () => window.__stopNow; window.__stopNow = false; });
  let run = p.evaluate(probe);
  for (let i = 0; i < 3; i++) { await row.click(); await p.waitForTimeout(900); await row.click(); await p.waitForTimeout(900); }
  await p.evaluate(() => { window.__stopNow = true; });
  report(`viewer open/close x3, CPU x${rate}`, await run);
  await p.locator('.jv-input').fill('TS013'); await p.waitForTimeout(900);
  await p.evaluate(() => { window.__stopNow = false; });
  run = p.evaluate(probe);
  for (let i = 0; i < 6; i++) { await p.locator('.jv-input').press('Enter'); await p.waitForTimeout(500); }
  await p.evaluate(() => { window.__stopNow = true; });
  report(`viewer next match x6 (scroll + highlight), CPU x${rate}`, await run);
  await p.getByRole('tab', { name: /Export/ }).click(); await p.locator('.wf-root').waitFor(); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__stopNow = false; });
  run = p.evaluate(probe);
  await p.getByRole('button', { name: 'Run checks' }).click();
  await p.waitForFunction(() => document.querySelector('.wf-root[aria-busy="true"]')); await p.waitForFunction(() => document.querySelector('.wf-root[aria-busy="false"]'), null, { timeout: 30000 });
  await p.evaluate(() => { window.__stopNow = true; });
  report(`workflow run, CPU x${rate}`, await run);
  await ctx.close();
}
await browser.close(); process.exit(0);
