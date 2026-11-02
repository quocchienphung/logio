import { chromium } from 'playwright';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';
import { HEADERS } from '../qa/lib/collateral-fixture.mjs';

// Frame pacing of the replay: the public preview and ours, each through one full run, at normal speed and with the CPU slowed down 4x
// (a laptop on battery, a dev server). Prints counts and milliseconds only. Usage: node speculative-run-fps.mjs <our base url>
const base = process.argv[2] || 'http://localhost:3002';
const descriptions = [...Array(6).fill('Ke hoach trien khai'), ...Array(6).fill('Hang hoa'), ...Array(6).fill('Hung Yen'), 'Ke ho?ch trien khai H?ng zz?zz'];
const rows = descriptions.map((text, i) => { const row = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: '00000123', TENKH: 'Cong ty Mau', MASOBD: `T${String(i).padStart(5, '0')}`, MALOAIBD: '303', NGBDAU: '20200101', GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', DSSOHD: `HD${i}`, MOTABD: text, MOTABDS: text }; return HEADERS.map(header => row[header] ?? null); });
const buffer = Buffer.from(buildXlsx([{ name: 'FPS_TEST', rows: [HEADERS, ...rows] }]));
const browser = await chromium.launch({ channel: 'chrome' });
const probe = () => new Promise(resolve => {
  const deltas = [], longTasks = []; let last = performance.now(), idleSince = 0;
  new PerformanceObserver(list => { for (const e of list.getEntries()) longTasks.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
  const frame = now => { deltas.push(now - last); last = now; if (window.__stop?.()) resolve({ deltas, longTasks }); else requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
});
const report = (name, { deltas, longTasks }) => {
  const d = deltas.slice(2).sort((a, b) => a - b), n = d.length, at = q => d[Math.min(n - 1, Math.floor(n * q))];
  console.log(`${name}: ${n} frames | median ${at(0.5).toFixed(1)} ms | p95 ${at(0.95).toFixed(1)} | p99 ${at(0.99).toFixed(1)} | worst ${d[n - 1].toFixed(1)} | frames over 20 ms: ${d.filter(x => x > 20).length} | over 34 ms: ${d.filter(x => x > 34).length} | long tasks: ${longTasks.length}${longTasks.length ? ' (max ' + Math.max(...longTasks) + ' ms)' : ''}`);
};
for (const rate of [1, 4]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  // --- public preview
  const ref = await context.newPage();
  await ref.goto('https://uiarc.dev/components/speculative-decoding', { waitUntil: 'networkidle' });
  const refCard = ref.locator('[class*="speculative-decoding_card"]').first(); await refCard.scrollIntoViewIfNeeded();
  await ref.waitForFunction(() => /Done in/.test(document.querySelector('[class*="speculative-decoding_status"]')?.textContent ?? ''), null, { timeout: 60000 });
  await (await context.newCDPSession(ref)).send('Emulation.setCPUThrottlingRate', { rate });
  await ref.evaluate(() => { window.__done = false; window.__stop = () => window.__done; const check = () => { if (/Done in/.test(document.querySelector('[class*="speculative-decoding_status"]')?.textContent ?? '')) setTimeout(() => { window.__done = true; }, 300); else setTimeout(check, 50); }; setTimeout(check, 400); });
  const refRun = ref.evaluate(probe);
  await refCard.getByRole('button', { name: 'Restart' }).click();
  report(`public preview, CPU x${rate}`, await refRun);
  await ref.close();
  // --- ours
  const page = await context.newPage();
  await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles({ name: 'fps.xlsx', mimeType: 'application/octet-stream', buffer });
  await page.getByRole('button', { name: /See what was found/ }).click();
  await page.locator('.cr-overview').waitFor({ timeout: 60000 });
  await page.getByRole('tab', { name: /Review and fix/ }).click();
  await page.locator('.cr-search').fill('zz?zz');
  await page.locator('.sdr-summary').waitFor({ timeout: 30000 });
  await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate });
  await page.evaluate(() => { window.__stop = () => !!document.querySelector('.sdr-summary') && window.__armed; window.__armed = false; });
  const ourRun = page.evaluate(probe);
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.evaluate(() => { setTimeout(() => { window.__armed = true; }, 800); });
  report(`ours, CPU x${rate}`, await ourRun);
  await page.close(); await context.close();
}
await browser.close();
