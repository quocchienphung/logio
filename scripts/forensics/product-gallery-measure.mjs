import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only: declared CSS, geometry of the stage/lens/rail, hover lens and fullscreen viewer frames.
const directory = 'docs/research/product-gallery/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/product-gallery', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const css = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).filter(text => /product-gallery_/.test(text)); } catch { return []; } }));
  await fs.writeFile(`${directory}/declared-styles.css`, css.join('\n\n'));
  const root = page.locator('[class*="product-gallery_root"]').first();
  await root.scrollIntoViewIfNeeded();
  await fs.writeFile(`${directory}/initial.html`, await root.evaluate(n => n.outerHTML.replace(/src="[^"]+"/g, 'src="…"')));
  const geometry = async label => fs.writeFile(`${directory}/${label}.json`, JSON.stringify(await page.locator('[class*="product-gallery_"]').evaluateAll(nodes => nodes.slice(0, 80).map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { class: n.getAttribute('class'), tag: n.tagName, role: n.getAttribute('role'), aria: n.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, radius: s.borderRadius, transform: s.transform, opacity: s.opacity, transition: s.transition.slice(0, 160), cursor: s.cursor }; })), null, 2));
  await geometry('geometry-initial');
  const stage = page.locator('[class*="product-gallery_stage"]').first();
  const box = await stage.boundingBox();
  await root.screenshot({ path: `${directory}/desktop-root.png` });
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4, { steps: 6 });
  await page.waitForTimeout(700);
  await root.screenshot({ path: `${directory}/desktop-hover-lens.png` });
  await geometry('geometry-hover');
  const samples = [];
  for (const [fx, fy] of [[0.2, 0.2], [0.8, 0.7]]) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 2 });
    for (const delay of [16, 60, 140, 320, 700]) { await page.waitForTimeout(delay); samples.push({ target: [fx, fy], delay, lens: await page.locator('[class*="product-gallery_lens"]').first().evaluate(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return { x: Math.round(r.x), y: Math.round(r.y), w: r.width, h: r.height, transform: s.transform, opacity: s.opacity, radius: s.borderRadius, bg: s.backgroundSize + ' ' + s.backgroundPosition, shadow: s.boxShadow.slice(0, 120) }; }).catch(() => null) }); }
  }
  await fs.writeFile(`${directory}/lens-samples.json`, JSON.stringify({ stage: box, samples }, null, 2));
  // Thumbnail rail + keyboard stepping
  const slides = await page.locator('[class*="product-gallery_thumb"]').count();
  console.log('thumbs', slides);
  await page.mouse.move(5, 5);
  await stage.focus().catch(() => {});
  await page.locator('[class*="product-gallery_stage"] button, [class*="product-gallery_slide"]').first().focus().catch(() => {});
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
  await root.screenshot({ path: `${directory}/desktop-next-photo.png` });
  // Open fullscreen viewer, sample the growth from the photo's rectangle
  await page.keyboard.press('Enter');
  const frames = [];
  for (const delay of [0, 40, 80, 120, 200, 320, 600]) { await page.waitForTimeout(delay === 0 ? 10 : 40); frames.push({ t: delay, dialog: await page.locator('[role="dialog"]').first().evaluate(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), opacity: s.opacity, transform: s.transform }; }).catch(() => null), frame: await page.locator('[role="dialog"] [class*="frame"], [role="dialog"] [class*="viewer"]').first().evaluate(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius, transform: s.transform }; }).catch(() => null) }); }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${directory}/desktop-viewer.png` });
  await fs.writeFile(`${directory}/viewer-frames.json`, JSON.stringify(frames, null, 2));
  await fs.writeFile(`${directory}/viewer.html`, await page.locator('[role="dialog"]').first().evaluate(n => n.outerHTML.replace(/src="[^"]+"/g, 'src="…"').slice(0, 6000)).catch(() => ''));
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  await page.setViewportSize({ width: 390, height: 844 });
  await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await root.screenshot({ path: `${directory}/mobile-root.png` });
  console.log('saved');
} finally { await browser.close(); }
