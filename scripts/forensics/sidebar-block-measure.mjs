import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. Captures the declared CSS and the geometry/motion of the nested folder in the App rail and Docs variants.
const directory = 'docs/research/uiarc-sidebar-block/source';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/blocks/sidebar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const css = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).filter(text => /sidebar-rail_|library-sidebar_/.test(text)); } catch { return []; } }));
  await fs.writeFile(`${directory}/declared-styles.css`, css.join('\n\n'));
  const rail = page.locator('[class*="sidebar-rail_shell"]').first();
  await rail.scrollIntoViewIfNeeded();
  await fs.writeFile(`${directory}/rail-initial.html`, await rail.evaluate(n => n.outerHTML.replace(/src="[^"]+"/g, 'src="…"').slice(0, 14000)));
  await rail.screenshot({ path: `${directory}/rail-initial.png` });
  // Open a nested group (the one with a chevron) and sample its motion.
  const toggles = page.locator('[class*="sidebar-rail_item"][aria-expanded]');
  console.log('expandable items', await toggles.count());
  const first = toggles.first();
  const label = await first.innerText();
  console.log('first expandable:', label.replace(/\n/g, ' | '));
  const children = () => page.locator('[class*="sidebar-rail_children"]').first();
  const sample = async name => ({ name, state: await first.getAttribute('aria-expanded'), children: await children().evaluate(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return { h: Math.round(r.height * 10) / 10, opacity: s.opacity, transition: s.transition.slice(0, 140), gridRows: s.gridTemplateRows }; }).catch(() => null) });
  const frames = [await sample('before')];
  await first.click();
  for (const delay of [16, 50, 100, 180, 300, 600]) { await page.waitForTimeout(delay); frames.push(await sample(`+${delay}ms`)); }
  await rail.screenshot({ path: `${directory}/rail-open.png` });
  await fs.writeFile(`${directory}/folder-motion.json`, JSON.stringify(frames, null, 2));
  console.log(JSON.stringify(frames.map(f => [f.name, f.state, f.children?.h, f.children?.opacity])));
  await fs.writeFile(`${directory}/rail-open.html`, await rail.evaluate(n => n.outerHTML.replace(/src="[^"]+"/g, 'src="…"').slice(0, 14000)));
  // The rail toggle (folds into an icon rail) and the keyboard behaviour.
  const toggle = page.locator('[class*="sidebar-rail_railToggle"]').first();
  if (await toggle.count()) { await toggle.click(); await page.waitForTimeout(700); await rail.screenshot({ path: `${directory}/rail-folded.png` }); }
  // Docs variant
  const tab = page.getByRole('tab', { name: /Docs/ }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(700); await page.locator('[class*="library-sidebar_aside"]').first().screenshot({ path: `${directory}/docs-tree.png` }).catch(() => {}); }
  await page.screenshot({ path: `${directory}/desktop-after.png`, fullPage: false });
} finally { await browser.close(); }
