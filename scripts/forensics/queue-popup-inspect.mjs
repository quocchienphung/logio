import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const out = 'docs/research/collateral-queue/source-popup';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const name of ['dialog', 'confirm-morph']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.addInitScript(() => {
      window.__animations = [];
      const original = Element.prototype.animate;
      Element.prototype.animate = function(frames, options) {
        window.__animations.push({ t: performance.now(), class: this.className?.baseVal ?? this.className, frames, options });
        return original.call(this, frames, options);
      };
    });
    await page.goto(`https://uiarc.dev/components/${name}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    await fs.writeFile(`${out}/${name}-body.txt`, await page.locator('body').innerText());
    await fs.writeFile(`${out}/${name}-buttons.json`, JSON.stringify(await page.locator('button').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent, label: n.getAttribute('aria-label'), class: n.className }))), null, 2));
    await fs.writeFile(`${out}/${name}-declared.css`, (await page.evaluate(prefix => Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules).filter(rule => rule.cssText.includes(prefix)).map(rule => rule.cssText); } catch { return []; }
    }), name)).join('\n'));
    console.log(name, await page.locator('button').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent?.slice(0, 100), label: n.getAttribute('aria-label'), class: n.className })).filter(n => /dialog|project|delete|hold|undo|cancel/i.test(n.text+' '+n.class+' '+n.label))));
    const inspect = () => page.evaluate(prefix => Array.from(document.querySelectorAll(`[class*="${prefix}_"]`)).map(e => {
      const s = getComputedStyle(e);
      return { tag: e.tagName, class: e.className?.baseVal ?? e.className, text: e.textContent, style: e.getAttribute('style'), state: e.getAttribute('data-state'), rect: e.getBoundingClientRect().toJSON(), opacity: s.opacity, transform: s.transform, font: s.font, radius: s.borderRadius, padding: s.padding, gap: s.gap, background: s.backgroundColor, filter: s.backdropFilter, transition: s.transition };
    }), name);
    const record = async (label, action, duration = 1300) => {
      await page.evaluate(({ prefix, duration }) => {
        window.__frames = [];
        const start = performance.now();
        function sample(now) {
          window.__frames.push({ t: now - start, elements: Array.from(document.querySelectorAll(`[class*="${prefix}_"]`)).filter(e => !['path', 'svg', 'circle'].includes(e.tagName)).map(e => ({ class: e.className, state: e.getAttribute('data-state'), style: e.getAttribute('style'), rect: e.getBoundingClientRect().toJSON(), opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform })) });
          if (now - start < duration) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, { prefix: name, duration });
      await action();
      await page.waitForTimeout(duration + 100);
      await fs.writeFile(`${out}/${name}-${label}-frames.json.gz`, gzipSync(JSON.stringify(await page.evaluate(() => window.__frames)), { level: 9 }));
    };
    await page.evaluate(() => { window.__animations = []; });
    if (name === 'dialog') {
      const trigger = page.getByRole('button', { name: 'Review changes', exact: true });
      await record('open', () => trigger.click());
      await fs.writeFile(`${out}/dialog-desktop.json`, JSON.stringify(await inspect(), null, 2));
      await page.screenshot({ path: `${out}/dialog-desktop.png` });
      await fs.writeFile(`${out}/dialog-open.html`, await page.getByRole('dialog').evaluate(e => e.outerHTML));
      console.log('dialog open', await page.getByRole('dialog').innerText());
      const focusOpen = await page.evaluate(() => ({ label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent }));
      await record('close', () => page.keyboard.press('Escape'), 800);
      const focusClosed = await page.evaluate(() => ({ label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent }));
      await trigger.click();
      await page.getByRole('dialog').waitFor();
      await page.mouse.click(20, 20);
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await fs.writeFile(`${out}/dialog-focus.json`, JSON.stringify({ open: focusOpen, closed: focusClosed, backdropClosed: true }, null, 2));
      await page.setViewportSize({ width: 390, height: 844 });
      await trigger.click();
      await page.waitForTimeout(800);
      await fs.writeFile(`${out}/dialog-mobile.json`, JSON.stringify(await inspect(), null, 2));
      await page.screenshot({ path: `${out}/dialog-mobile.png` });
      await page.keyboard.press('Escape');
    } else {
      const root = page.locator('[class*="confirm-morph_root"]').first();
      await record('question', () => page.getByRole('button', { name: 'Delete project', exact: true }).click());
      await root.screenshot({ path: `${out}/confirm-morph-question.png` });
      await record('delete', () => root.getByRole('button', { name: 'Delete', exact: true }).click(), 2600);
      await fs.writeFile(`${out}/confirm-morph-done.json`, JSON.stringify(await inspect(), null, 2));
      await root.screenshot({ path: `${out}/confirm-morph-done.png` });
      await record('undo', () => root.getByRole('button', { name: 'Undo', exact: true }).click(), 2000);
      await root.screenshot({ path: `${out}/confirm-morph-restored.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Delete project', exact: true }).click();
      await page.waitForTimeout(500);
      await root.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.waitForTimeout(1200);
      await root.screenshot({ path: `${out}/confirm-morph-mobile-done.png` });
    }
    await fs.writeFile(`${out}/${name}-animations.json`, JSON.stringify(await page.evaluate(() => window.__animations), null, 2));
    await page.close();
  }
} finally { await browser.close(); }
