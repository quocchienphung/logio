// Compares the local Invoice section with the saved reference captures in docs/research/invoice (ref-<width>.png).
// Fully offline: the references were captured once from the public preview; nothing here contacts that site.
// The local invoice is seeded with the reference's sample text so differences are layout, not copy.
import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const dir = 'docs/research/invoice';
const out = `${dir}/comparison`;
await fs.mkdir(out, { recursive: true });
const sample = { version: 1, number: '2026-041', issued: '2026-09-19', due: '2026-10-19', from: { name: 'Northstar Studio', address: '44 Hudson Street\nNew York, NY 10013' }, billTo: { name: 'Acme Product', address: '125 Spring Street\nNew York, NY 10012' }, lines: [{ id: 'line-1', description: 'Discovery and direction', quantity: 1, rate: 900 }, { id: 'line-2', description: 'Interface design', quantity: 2, rate: 650 }, { id: 'line-3', description: 'Design handoff', quantity: 1, rate: 250 }], taxRate: 8, note: 'Thank you for the work together. Payment is due within 30 days.', seq: 3 };
const browser = await chromium.launch({ channel: 'chrome' });
const results = {};
for (const width of [878, 740, 558, 378]) {
  const page = await (await browser.newContext({ viewport: { width: 1536, height: 1400 }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(data => localStorage.setItem('affectui:acme:invoice', JSON.stringify(data)), sample);
  await page.goto(`${base}/personalize?section=invoice`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `nextjs-portal{display:none!important}.inv-frame{width:${width + 2}px!important}.inv-page{padding-top:0!important}` });
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900);
  const box = await page.locator('.inv-sheet').boundingBox();
  const ref = PNG.sync.read(await fs.readFile(`${dir}/ref-${width}.png`));
  // The reference is cut from the top of the frame; its footer ends where the invoice content ends.
  const height = Math.min(Math.floor(box.height - 2), ref.height);
  const localBuffer = await page.screenshot({ clip: { x: box.x + 1, y: box.y + 1, width, height } });
  const local = PNG.sync.read(localBuffer);
  const crop = new PNG({ width, height }); PNG.bitblt(ref, crop, 0, 0, width, height, 0, 0);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(crop.data, local.data, diff.data, width, height, { threshold: 0.12, includeAA: false });
  results[width] = { size: [width, height], localHeight: Math.round(box.height - 2), pixelsDifferent: changed, percent: +(changed / (width * height) * 100).toFixed(3) };
  await fs.writeFile(`${out}/local-${width}.png`, localBuffer);
  await fs.writeFile(`${out}/diff-${width}.png`, PNG.sync.write(diff));
  await fs.writeFile(`${out}/ref-crop-${width}.png`, PNG.sync.write(crop));
  console.log(width, JSON.stringify(results[width]));
  await page.context().close();
}
await fs.writeFile(`${out}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
