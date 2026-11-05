import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'docs/research/morph-nav'; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/morph-nav', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1400);
const root = page.locator('[class*="morph-nav_root"]').first(); await root.scrollIntoViewIfNeeded();
await root.screenshot({ path: `${out}/source-idle.png` });
async function record(name, action) {
  await root.evaluate(el => {
    window.__morphFrames = []; window.__morphStart = performance.now();
    const frame = now => {
      const surface = el.querySelector('[class*="morph-nav_surface"]'), panel = el.querySelector('[class*="morph-nav_face"]');
      const box = e => { if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { x: r.x, y: r.y, width: r.width, height: r.height, opacity: s.opacity, transform: s.transform, transition: s.transition }; };
      window.__morphFrames.push({ t: now - window.__morphStart, surface: box(surface), panel: box(panel), expanded: [...el.querySelectorAll('button[aria-expanded=true]')].map(e => e.textContent.trim()), animations: [...el.getAnimations({ subtree: true })].map(a => ({ time: a.currentTime, frames: a.effect.getKeyframes(), timing: a.effect.getTiming() })) });
      if (now - window.__morphStart < 1100) requestAnimationFrame(frame);
    }; requestAnimationFrame(frame);
  });
  await action(); await page.waitForTimeout(1200);
  await fs.writeFile(`${out}/source-${name}-frames.json`, JSON.stringify(await page.evaluate(() => window.__morphFrames), null, 2));
  await root.locator('[class*="morph-nav_surface"]').screenshot({ path: `${out}/source-${name}.png` });
}
await record('product', () => root.getByRole('button', { name: 'Product', exact: true }).hover());
await fs.writeFile(`${out}/source-open-styles.json`, JSON.stringify(await root.evaluate(el => [el, ...el.querySelectorAll('*')].filter(e => typeof e.className === 'string' && e.className.includes('morph-nav_')).map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, cls: e.className, text: e.children.length ? null : e.textContent, rect: [r.x, r.y, r.width, r.height], transition: s.transition, transform: s.transform, opacity: s.opacity, willChange: s.willChange }; })), null, 2));
console.log('open classes', await root.locator('*').evaluateAll(es => [...new Set(es.map(e => typeof e.className === 'string' ? e.className : 'svg'))].filter(c => c.includes('morph-nav'))));
await record('solutions', () => root.getByRole('button', { name: 'Solutions', exact: true }).hover());
await record('resources', () => root.getByRole('button', { name: 'Resources', exact: true }).hover());
await record('close', () => page.mouse.move(1300, 900));
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400); await root.scrollIntoViewIfNeeded(); await root.screenshot({ path: `${out}/source-mobile.png` });
console.log('mobile buttons', await root.getByRole('button').allTextContents());
await browser.close();
