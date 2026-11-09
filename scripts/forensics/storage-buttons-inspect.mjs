import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered previews only. No registry, source tab, prompts or site API.
const out = 'docs/research/storage/buttons';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const names = ['button', 'action-button', 'split-button', 'button-group', 'floating-button-group', 'expanding-button-group', 'copy-button', 'icon-morph', 'confirm-morph'];
try {
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`https://uiarc.dev/components/${name}`, { waitUntil: 'networkidle' });
    const root = page.locator('#preview-canvas');
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await root.screenshot({ path: `${out}/${name}-1440-initial.png` });
    const read = () => root.evaluate(el => ({ text: el.innerText, elements: [el, ...el.querySelectorAll('*')].map(e => {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      return { tag: e.tagName, class: String(e.className?.baseVal ?? e.className), role: e.getAttribute('role'), label: e.getAttribute('aria-label'), text: e.childElementCount ? undefined : e.textContent, pressed: e.getAttribute('aria-pressed'), expanded: e.getAttribute('aria-expanded'), rect: [b.x,b.y,b.width,b.height], font: s.font, color: s.color, background: s.backgroundColor, radius: s.borderRadius, border: s.border, padding: s.padding, gap: s.gap, shadow: s.boxShadow, transition: s.transition, transform: s.transform };
    }) }));
    const evidence = { url: page.url(), initial: await read(), interactions: [] };
    const buttons = root.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 7); i++) {
      const button = buttons.nth(i);
      if (!(await button.isVisible()) || !(await button.isEnabled())) continue;
      const label = (await button.getAttribute('aria-label')) || (await button.innerText());
      await button.click();
      await page.waitForTimeout(180);
      await root.screenshot({ path: `${out}/${name}-1440-click-${i}.png` });
      const after = await read();
      evidence.interactions.push({ index: i, label, after, menus: await page.locator('[role="menu"], [role="dialog"]').allTextContents() });
      await page.waitForTimeout(1300);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await root.screenshot({ path: `${out}/${name}-390.png` });
    evidence.mobile = await read();
    await fs.writeFile(`${out}/${name}.json`, JSON.stringify(evidence, null, 2));
    console.log(name, evidence.initial.text.replace(/\n/g, ' | '));
    await page.close();
  }
} finally { await browser.close(); }
