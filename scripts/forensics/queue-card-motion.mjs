// Records the public UIArc Card preview's quick-look morph from the rendered page: rAF samples of the card, panel, overlay and details, plus Element.animate calls.
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const out = 'docs/research/collateral-queue/source-card';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => {
    window.__animations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      window.__animations.push({ t: performance.now(), class: String(this.className?.baseVal ?? this.className), frames, options });
      return original.call(this, frames, options);
    };
  });
  await page.goto('https://uiarc.dev/components/card', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const trigger = page.locator('[class*="card_trigger"]').first();
  console.log('trigger', await trigger.count(), (await trigger.textContent())?.trim());
  const sample = duration => page.evaluate(duration => new Promise(resolve => {
    const frames = [], start = performance.now();
    const pick = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { x: r.x, y: r.y, w: r.width, h: r.height, o: s.opacity, t: s.transform, f: s.fontSize, r: s.borderRadius, b: s.backdropFilter, f2: s.filter }; };
    const step = now => {
      frames.push({ t: now - start, panel: pick('[class*="card_panel"]'), overlay: pick('[class*="card_overlay"]'), details: pick('[class*="card_details"]'), title: pick('[class*="card_panel"] [class*="card_title"]'), media: pick('[class*="card_panel"] [class*="card_media"]'), close: pick('[class*="card_close_"]'), card: pick('[class*="card_card__hb0xM"]') });
      if (now - start < duration) requestAnimationFrame(step); else resolve(frames);
    };
    requestAnimationFrame(step);
  }), duration);
  const rest = await page.evaluate(() => { const e = document.querySelector('[class*="card_card__hb0xM"]'); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await fs.writeFile(`${out}/card-rest-rect.json`, JSON.stringify(rest));
  await page.evaluate(() => { window.__animations = []; });
  const opening = sample(1400); await trigger.click(); const openFrames = await opening;
  await fs.writeFile(`${out}/card-open-frames.json.gz`, gzipSync(JSON.stringify(openFrames), { level: 9 }));
  await fs.writeFile(`${out}/card-open-animations.json`, JSON.stringify(await page.evaluate(() => window.__animations), null, 2));
  await page.screenshot({ path: `${out}/card-open.png` });
  const panel = page.locator('[class*="card_panel"]').first();
  await fs.writeFile(`${out}/card-open.html`, await panel.evaluate(e => e.outerHTML));
  await fs.writeFile(`${out}/card-open-text.txt`, await panel.innerText());
  await fs.writeFile(`${out}/card-open-nodes.json`, JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[class*="card_panel"], [class*="card_panel"] *')).map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, class: String(e.className?.baseVal ?? e.className), text: (e.children.length ? '' : e.textContent || '').slice(0, 160), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, radius: s.borderRadius, padding: s.padding, margin: s.margin, gap: s.gap, bg: s.backgroundColor, border: s.borderTop, shadow: s.boxShadow, font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.letterSpacing}`, color: s.color }; })), null, 2));
  await page.evaluate(() => { window.__animations = []; });
  const closing = sample(1200); await page.keyboard.press('Escape'); const closeFrames = await closing;
  await fs.writeFile(`${out}/card-close-frames.json.gz`, gzipSync(JSON.stringify(closeFrames), { level: 9 }));
  await fs.writeFile(`${out}/card-close-animations.json`, JSON.stringify(await page.evaluate(() => window.__animations), null, 2));
  await fs.writeFile(`${out}/card-focus-after-close.json`, JSON.stringify(await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim() }))));
  // dark + reduced motion + phone
  await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(600);
  await trigger.click(); await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/card-open-dark.png` }); await page.keyboard.press('Escape'); await page.waitForTimeout(900);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  await trigger.scrollIntoViewIfNeeded(); await trigger.click(); await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/card-open-mobile.png` });
  console.log('open frames', openFrames.length, 'close frames', closeFrames.length);
} finally { await browser.close(); }
