import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Clone engine: public rendered preview, declared CSS and observed frames only.
// No Code tab, private API, registry, source bundle or installation endpoint.
const out = 'docs/research/link-unfurl/source';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/link-unfurl', { waitUntil: 'networkidle' });
  const root = page.locator('[class*="link-unfurl_root"]').first();
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200);
  const inspect = () => root.evaluate(n => {
    const selectors = ['composer', 'chip', 'lane', 'wrap', 'plate', 'card', 'head', 'body', 'title', 'media'];
    return Object.fromEntries(selectors.map(key => {
      const e = n.querySelector(`[class*="link-unfurl_${key}__"]`);
      if (!e) return [key, null];
      const s = getComputedStyle(e);
      return [key, { rect: e.getBoundingClientRect().toJSON(), font: s.font, color: s.color, background: s.backgroundColor, border: s.border, radius: s.borderRadius, padding: s.padding, gap: s.gap, transform: s.transform, clip: s.clipPath }];
    }));
  });
  await fs.writeFile(`${out}/desktop-measurements.json`, JSON.stringify(await inspect(), null, 2));
  await fs.writeFile(`${out}/open.html`, await root.evaluate(n => n.outerHTML));
  await root.screenshot({ path: `${out}/desktop-open.png` });
  const record = async (name, action) => {
    await page.evaluate(() => {
      window.__unfurlFrames = [];
      const start = performance.now();
      function frame(now) {
        const n = document.querySelector('[class*="link-unfurl_card__"]');
        const plate = document.querySelector('[class*="link-unfurl_plate__"]');
        const wrap = document.querySelector('[class*="link-unfurl_wrap__"]');
        const body = document.querySelector('[class*="link-unfurl_body__"]');
        window.__unfurlFrames.push({ t: now - start, transform: n.style.transform, clip: n.style.clipPath, visibility: n.style.visibility, height: wrap.style.height, plate: plate.getAttribute('style'), body: body.style.opacity });
        if (now - start < 1400) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    await action();
    await page.waitForTimeout(1500);
    await fs.writeFile(`${out}/${name}-frames.json`, JSON.stringify(await page.evaluate(() => window.__unfurlFrames), null, 2));
    await root.screenshot({ path: `${out}/desktop-${name}.png` });
  };
  await record('collapse', () => page.getByRole('button', { name: /^Collapse preview of/ }).click());
  await record('expand', () => page.getByRole('button', { name: 'Show Airbnb preview', exact: true }).click());
  await page.getByRole('button', { name: 'Paste Figma link', exact: true }).click();
  await page.waitForTimeout(1800);
  await root.screenshot({ path: `${out}/desktop-second-link.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await root.scrollIntoViewIfNeeded();
  await fs.writeFile(`${out}/mobile-measurements.json`, JSON.stringify(await inspect(), null, 2));
  await root.screenshot({ path: `${out}/mobile-open.png` });
  console.log('Captured public preview geometry, collapse/expand frames, second link and mobile.');
} finally { await browser.close(); }
