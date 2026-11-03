import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';
import { MAU9_PROFILE } from '../../src/components/sites/collateral/excel-formation/engine/mapping-profiles.ts';
import { templateProblems } from '../../src/components/sites/collateral/json-formation/engine/template-mau09.ts';

// Collateral → JSON formation against Mẫu số 09, in a real browser, with a SYNTHETIC workbook that fills every entry of the form:
// the mapping shows the example row, the export asks for the file name, and the files it gives are the form's: D40<code><date>.<zzz>.json / .zip.
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/collateral/qa';
await fs.mkdir(out, { recursive: true });
const HEADERS = MAU9_PROFILE.columns.map(spec => spec.header);
const common = { NGAYDULIEU: '30/09/2026', MACHINHANH: '009', DINHKY: '2', MACNTCTD: '00000001', TENCNTCTD: 'CN MOT', MAKH: '00000123', TENKH: 'Cong ty A', MASOBD: 'D0001', MALOAIBD: '303', NGBDAU: '20200101', GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', DSSOHD: 'HD-1', HOTENCSH: 'Nguyen Van A', GIAYTOCNCSH: '001234567890', MOTABD: 'May moc', MOTABDS: 'May moc' };
const row = o => HEADERS.map(header => ({ ...common, ...o })[header] ?? null);
const project = { TENDA: 'Du an 1', VITRIDA: 'Ha Noi', MATINHDTU: '01', GIAYPHEP: 'GP1', GIATRIDA: { n: '5000000' }, THOIHANDA: '20271231', MOTADA: 'Khu do thi', GIAYCN: 'GCN-1', DIACHI: '2 Pho Y', MATINH: '01', LOAIPT: 'Oto', GIAYDK: 'DK1', BIENKS: '30A-12345' };
const rows = [
  row({ ...project, TSCHUNGMATCTD: '00000002', CHUDA: 'Chu Dau Tu A', GIAYTOCHUDA: '012345678', MSTCHUDA: '0900000001', DIACHICHUDA: '1 Pho X' }),
  row({ ...project, TSCHUNGMATCTD: '00000002', TSCHUNGMAKH: '00000999', CHUDA: 'Chu Dau Tu B' }),
  row({ TENDA: 'Du an 2', VITRIDA: 'Hai Phong', LOAIPT: 'May bay', GIAYDK: 'DK2' }),
  row({ MASOBD: 'D0002', DSSOHD: 'HD-2' }),
];
const buffer = Buffer.from(buildXlsx([{ name: 'MAU9_TEST', rows: [HEADERS, ...rows] }]));

const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, ok) => { assert.ok(ok, name); results.push(name); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles({ name: 'mau9.xlsx', mimeType: 'application/octet-stream', buffer });
  await page.getByRole('button', { name: /See what was found/ }).click();
  await page.locator('.cr-overview').waitFor({ timeout: 60000 });
  await page.locator('.ui-as-side__nav').getByRole('button', { name: 'JSON formation' }).click();
  await page.getByRole('heading', { level: 1, name: 'JSON formation' }).waitFor();
  await page.locator('.cr-map-table').waitFor();

  // Mapping: every column of the profile, its attribute, its rule and the value of the example row
  const heads = (await page.locator('.cr-map-table thead th').allInnerTexts()).map(text => text.trim());
  check('The mapping shows the Excel column, header, JSON field, rule, the example row and the status', ['Excel column', 'Header', 'JSON field', 'Rule', 'In the example row', 'Status'].every((name, i) => heads[i] === name));
  check('It lists every column of the profile', await page.locator('.cr-map-table tbody tr').count() === HEADERS.length);
  const rowOf = header => page.locator('.cr-map-table tbody tr', { has: page.locator('td', { hasText: new RegExp(`^${header}\\*?$`) }) });
  await page.locator('.cr-map-table tbody tr').first().locator('td').nth(4).filter({ hasText: /^(?!…$)/ }).waitFor({ timeout: 20000 });
  const cells = async header => (await rowOf(header).locator('td').allInnerTexts()).map(text => text.trim());
  const chuda = await cells('CHUDA'), tenda = await cells('TENDA'), motabd = await cells('MOTABD');
  check('A project column points at TS014 with its rule and what row 2 puts there', chuda[2] === 'THONGTINBD[].TS014[].TS0141[].TS01411' && tenda[2] === 'THONGTINBD[].TS014[].TS0142' && tenda[4] === 'Du an 1' && chuda[4] === 'Chu Dau Tu A' && tenda[3].length > 0);
  check('The twin description fills TS0154', motabd[2] === 'THONGTINBD[].TS015[].TS0154');
  const kept = await page.locator('.cr-map-table tbody tr[data-state="unused"]').count();
  check('Only the two constant columns stay out of the JSON', kept === 2);
  await page.screenshot({ path: `${out}/12-json-mapping-mau09.png`, fullPage: true });

  // Export: the file name is part of the gate
  await page.getByRole('tab', { name: /Export/ }).click();
  await page.locator('.cr-json').waitFor();
  await page.waitForFunction(() => document.querySelector('.cr-meta input')?.value === '20260930');
  await page.getByLabel('Prepared by').fill('Test User');
  await page.getByLabel('Phone').fill('0900000000');
  await page.getByLabel('Email').fill('test@example.invalid');
  await page.locator('.cr-checks li[data-ok]').first().waitFor({ timeout: 30000 });
  check('Without the TCTD code and the sequence the JSON stays locked and no D40 file is offered', await page.locator('.cr-json[data-ready]').count() === 0 && await page.getByRole('button', { name: /^Download D40/ }).count() === 0);
  await page.getByLabel('TCTD code (file name)').fill('SYNTH');
  await page.getByLabel('Sequence, 3 characters (file name)').fill('01');
  await page.waitForTimeout(800);
  check('A sequence of 2 characters is refused', await page.locator('.cr-json[data-ready]').count() === 0);
  await page.getByLabel('Sequence, 3 characters (file name)').fill('001');
  await page.locator('.cr-json[data-ready]').waitFor({ timeout: 30000 });
  check('The name the form asks for is shown as soon as it is valid', (await page.locator('.cr-filename').innerText()).trim() === 'D40SYNTH20260930.001.json');
  check('All eleven checks hold', await page.locator('.cr-checks li[data-ok="true"]').count() === 11 && await page.locator('.cr-checks li[data-ok="false"]').count() === 0);
  check('The reconciliation counts the entries of the form', (await page.locator('.cr-recon').innerText()).includes('Assets with a project (TS014)'));
  await page.screenshot({ path: `${out}/13-json-ready-mau09.png`, fullPage: true });

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download D40SYNTH20260930.001.json' }).click()]);
  check('The downloaded file is named D40 + code + date + sequence', download.suggestedFilename() === 'D40SYNTH20260930.001.json');
  const jsonBytes = await fs.readFile(await download.path());
  const jsonText = new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes);
  const parsed = JSON.parse(jsonText);
  check('Every object of the file has the keys of Mau so 09 in its order', templateProblems(parsed).length === 0);
  const assets = parsed.CNTCTD.flatMap(b => b.KHACHHANG.flatMap(c => c.THONGTINBD));
  const [a, b] = assets;
  check('TS010, TS011 and the TS014 project with its investors are filled from the rows', JSON.stringify(a.TS010) === '["00000002"]' && JSON.stringify(a.TS011) === '["00000999"]' && a.TS014.length === 2 && a.TS014[0].TS0141.length === 2 && a.TS014[0].TS0146 === 5000000 && a.TS014[1].TS0146 === 0);
  check('TS015 holds the land title with the description, TS016 the two vehicles', a.TS015.length === 1 && a.TS015[0].TS0153 === '01' && a.TS015[0].TS0154 === 'May moc' && a.TS016.length === 2 && a.TS016[1].TS0161 === 'May bay');
  check('An asset without those columns keeps the empty lists', b.TS014.length === 0 && b.TS015.length === 0 && b.TS016.length === 0 && b.TS010.length === 0);
  check('No review metadata is in the contractual file', !/status|severity|issue|fingerprint/i.test(jsonText));

  await page.getByRole('button', { name: /More downloads/ }).click();
  const [zipDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Download D40SYNTH20260930.001.zip' }).click()]);
  check('The zip has the same name with .zip', zipDownload.suggestedFilename() === 'D40SYNTH20260930.001.zip');
  const entries = unzipSync(new Uint8Array(await fs.readFile(await zipDownload.path())));
  check('It holds exactly that one JSON, byte for byte', Object.keys(entries).join() === 'D40SYNTH20260930.001.json' && Buffer.compare(Buffer.from(entries['D40SYNTH20260930.001.json']), jsonBytes) === 0);

  // Preview and search show numbers as the file has them
  await page.getByRole('tab', { name: /Preview/ }).click();
  await page.locator('.cr-preview').waitFor();
  check('No $num key is shown in the preview', (await page.locator('.cr-preview').innerText()).indexOf('$num') === -1);
  check('No page errors', errors.length === 0);
  console.log(`${results.length} checks passed`);
  await fs.writeFile(`${out}/json-template-results.json`, JSON.stringify({ results, errors }, null, 2));
} catch (error) {
  console.error('FAILED after:', results.at(-1) ?? '(nothing)'); console.error(error.message.split('\n').slice(0, 8).join('\n')); console.error(errors.slice(0, 5));
  process.exitCode = 1;
} finally { await browser.close(); }
