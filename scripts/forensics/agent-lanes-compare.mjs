import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/agent-lanes/comparison';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const width of [384, 349, 281]) {
    const source = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const local = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await source.goto('https://www.affectui.com/components/agent-lanes', { waitUntil: 'networkidle' });
    await source.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
    await source.clock.install();
    await source.clock.pauseAt(new Date(Date.now() + 1000));
    await source.addStyleTag({ content: `.lanes-demo{width:${width}px!important}.ui-alc{zoom:1!important}` });
    await source.getByRole('button', { name: 'Reset preview', exact: true }).click();
    await local.goto(`${base}/personalize?browse=1&group=crm`, { waitUntil: 'networkidle' });
    await local.addStyleTag({ content: `.guide-preview{width:${width}px!important}nextjs-portal{display:none!important}` });
    for (const [page, selector, name] of [[source, '.ui-alc', 'source'], [local, '.agl', 'local']]) {
      await page.evaluate(() => document.fonts.ready);
      // Align both samples to the device pixel grid so locator screenshot rounding cannot add a column.
      await page.locator(selector).evaluate(el => {
        const box = el.getBoundingClientRect();
        el.style.transform = `translate(${Math.round(box.x) - box.x}px, ${Math.round(box.y) - box.y}px)`;
      });
      await page.locator(selector).screenshot({ path: `${out}/${name}-${width}.png` });
    }
    const a = PNG.sync.read(await fs.readFile(`${out}/source-${width}.png`));
    const b = PNG.sync.read(await fs.readFile(`${out}/local-${width}.png`));
    const dimensionsMatch = a.width === b.width && a.height === b.height;
    const diff = new PNG({ width: a.width, height: a.height });
    const percent = dimensionsMatch ? pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: .15 }) / (a.width * a.height) * 100 : null;
    if (dimensionsMatch) await fs.writeFile(`${out}/diff-${width}.png`, PNG.sync.write(diff));
    const montage = new PNG({ width: a.width + b.width, height: Math.max(a.height, b.height), fill: true });
    PNG.bitblt(a, montage, 0, 0, a.width, a.height, 0, 0);
    PNG.bitblt(b, montage, 0, 0, b.width, b.height, a.width, 0);
    await fs.writeFile(`${out}/side-${width}.png`, PNG.sync.write(montage));
    results.push({ width, source: [a.width, a.height], local: [b.width, b.height], pixelDiffPercent: percent, intentionalDifferences: 'Local provider avatars 28/18px instead of 24/14px; outer card shadow/radius supplied by Guide me.' });
    console.log(results.at(-1));
    await source.close(); await local.close();
  }
  await fs.writeFile(`${out}/metrics.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
