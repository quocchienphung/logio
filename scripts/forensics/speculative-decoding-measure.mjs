import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. Declared CSS, DOM, a time-lapse of one run, geometry and the slider/switch states.
const directory = 'docs/research/speculative-decoding/source';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/speculative-decoding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const css = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).filter(text => /speculative-decoding_/.test(text)); } catch { return []; } }));
  await fs.writeFile(`${directory}/declared-styles.css`, css.join('\n\n'));
  const root = page.locator('[class*="speculative-decoding_card"]').first();
  await root.scrollIntoViewIfNeeded();
  await fs.writeFile(`${directory}/initial.html`, await root.evaluate(n => n.outerHTML.slice(0, 20000)));
  // Replay and photograph the run
  const replay = page.getByRole('button', { name: /replay|restart|again|run/i }).first();
  console.log('buttons:', await page.locator('[class*="speculative-decoding_card"] button').evaluateAll(n => n.map(b => b.getAttribute('aria-label') || b.textContent?.trim()).slice(0, 10)));
  if (await replay.count()) await replay.click();
  const frames = [];
  for (const t of [0, 300, 700, 1200, 1800, 2600, 3600, 5000, 7000, 9000]) {
    await page.waitForTimeout(t === 0 ? 50 : t - (frames.at(-1)?.t ?? 0));
    frames.push({ t, status: await page.locator('[class*="speculative-decoding_status"]').first().innerText().catch(() => ''), summary: (await page.locator('[class*="speculative-decoding_summary"]').first().innerText().catch(() => '')).replace(/\n/g, ' | ').slice(0, 120) });
    await root.screenshot({ path: `${directory}/run-${String(t).padStart(5, '0')}.png` });
  }
  await fs.writeFile(`${directory}/run-frames.json`, JSON.stringify(frames, null, 2));
  console.log(frames.map(f => `${f.t}: ${f.status} / ${f.summary}`).join('\n'));
  // Token classes during/after a run
  await fs.writeFile(`${directory}/tokens-after.json`, JSON.stringify(await page.locator('[class*="speculative-decoding_tok"]').evaluateAll(nodes => nodes.slice(0, 60).map(n => ({ text: n.textContent, data: Object.assign({}, n.dataset), cls: n.className.split(' ').pop(), bg: getComputedStyle(n).backgroundColor, color: getComputedStyle(n).color }))), null, 2));
  await root.screenshot({ path: `${directory}/card-final.png` });
} finally { await browser.close(); }
