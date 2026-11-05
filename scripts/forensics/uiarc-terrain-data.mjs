import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// The sample week the public preview shows: value and "last week" of every hour of every day, per metric, read from the panel the page renders for
// each highlighted hour (keyboard stepping, exactly what a visitor sees). Output: docs/research/uiarc-terrain/source/sample-data.json
const out = 'docs/research/uiarc-terrain/source/sample-data.json';
const URL = 'https://uiarc.dev/components/blocks/activity-terrain';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = text => Number(text.replace(/[,\s]/g, '').replace('−', '-'));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  const plot = page.locator('[class*="activity-terrain_plot"]');
  const data = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (const metric of ['Sessions', 'Deploys', 'Errors']) {
    await page.getByRole('button', { name: metric, exact: true }).click();
    await page.waitForTimeout(2500);
    await plot.focus();
    const read = async () => page.evaluate(() => { const p = document.querySelector('[class*="activity-terrain_panel"]'); return { text: p.innerText, spark: [...p.querySelectorAll('[class*="activity-terrain_spark"] > span')].map(s => ({ v: getComputedStyle(s).getPropertyValue('--v') || s.style.getPropertyValue('--v'), on: s.hasAttribute('data-on') })) }; });
    // go to Monday 00:00
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Home'); await sleep(150);
    const values = [], previous = [];
    for (let d = 0; d < 7; d++) {
      await page.keyboard.press('Home'); await sleep(90);
      for (let h = 0; h < 24; h++) {
        const { text } = await read();
        const m = /^(\w+day)\s+(\d\d):00 to \d\d:00\s+([\d,]+)\s+\w+\s+Last week\s+([\d,]+)/.exec(text.replace(/\s+/g, ' ').trim());
        if (!m) throw new Error(`cannot read panel: ${JSON.stringify(text)}`);
        if (m[1] !== days[d] || Number(m[2]) !== h) throw new Error(`unexpected cell ${m[1]} ${m[2]} at ${days[d]} ${h}`);
        const value = num(m[3]), last = num(m[4]);
        values.push(value); previous.push(last);
        if (h < 23) { await page.keyboard.press('ArrowRight'); await sleep(70); }
      }
      if (d < 6) { await page.keyboard.press('ArrowDown'); await sleep(90); }
    }
    const sample = await read();
    data[metric.toLowerCase()] = { values, previous, sparkSample: sample.spark.slice(0, 5) };
    console.log(metric, 'cells', values.length, 'total', values.reduce((a, b) => a + b, 0), 'previous total', previous.reduce((a, b) => a + b, 0));
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  }
  await fs.writeFile(out, JSON.stringify({ source: URL, note: 'Sample week "Sep 14 to 20, 2026" shown by the public Activity terrain preview; values and last-week values per hour, Monday first.', ...data }, null, 1));
} finally { await browser.close(); }
