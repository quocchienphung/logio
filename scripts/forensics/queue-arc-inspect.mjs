import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

// Public rendered preview only. Never reads bundles, registry or gated Code tabs.
const out = 'docs/research/collateral-queue/source';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const name of ['hold-to-confirm', 'prompt-cache']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.addInitScript(() => {
      window.__animations = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        window.__animations.push({ time: performance.now(), class: this.className?.baseVal ?? this.className, frames, options });
        return animate.call(this, frames, options);
      };
    });
    await page.goto(`https://uiarc.dev/components/${name}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const root = page.locator(name === 'hold-to-confirm' ? '[class*="hold-to-confirm_shell"]' : '[class*="prompt-cache_root"]');
    console.log('ROOTS', name, await root.count());
    const scope = await root.count() ? root.first() : name === 'hold-to-confirm' ? page.locator('[class*="hold-to-confirm_button"]').locator('..') : page.locator('[class*="prompt-cache_"]').first();
    const screenshot = path => scope.screenshot({ path, style: `body * { visibility: hidden !important; } [class*="${name}_${name === 'hold-to-confirm' ? 'hold__' : 'root__'}"], [class*="${name}_${name === 'hold-to-confirm' ? 'hold__' : 'root__'}"] * { visibility: visible !important; }` });
    await scope.scrollIntoViewIfNeeded();
    await fs.writeFile(`${out}/${name}-preview.html`, await scope.evaluate(n => n.outerHTML));
    const measurements = () => scope.evaluate(n => [n, ...n.querySelectorAll('*')].map(e => {
      const s = getComputedStyle(e);
      return { tag: e.tagName, class: e.className?.baseVal ?? e.className, text: e.childNodes.length === 1 && e.firstChild?.nodeType === 3 ? e.textContent : '', rect: e.getBoundingClientRect().toJSON(), font: s.font, color: s.color, background: s.backgroundColor, border: s.border, radius: s.borderRadius, padding: s.padding, gap: s.gap, grid: s.gridTemplateColumns, transition: s.transition, animation: s.animation, transform: s.transform, clip: s.clipPath };
    }));
    await fs.writeFile(`${out}/${name}-desktop.json`, JSON.stringify(await measurements(), null, 2));
    await screenshot(`${out}/${name}-desktop.png`);
    const css = await page.evaluate(prefix => Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules).filter(rule => rule.cssText.includes(prefix)).map(rule => rule.cssText); } catch { return []; }
    }), name);
    await fs.writeFile(`${out}/${name}-declared.css`, css.join('\n'));
    await fs.writeFile(`${out}/${name}-body.txt`, await page.locator('body').innerText());
    await fs.writeFile(`${out}/${name}-preview-candidates.json`, JSON.stringify(await page.locator('button').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent, label: n.getAttribute('aria-label'), class: n.className }))), null, 2));
    await page.screenshot({ path: `${out}/${name}-page.png`, fullPage: true });
    console.log(name, await page.locator('button').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent?.slice(0, 100), label: n.getAttribute('aria-label'), class: n.className })).filter(n => /hold|cache|run|clear|reset|prefix|demo/i.test(n.text+' '+n.class+' '+n.label))));
    await page.evaluate(() => { window.__animations = []; });
    const record = async (label, action, duration = 1800) => {
      await scope.evaluate((n, ms) => {
        window.__frames = [];
        const start = performance.now();
        function frame(now) {
          window.__frames.push({ t: now - start, elements: [n, ...n.querySelectorAll('*')].filter(e => !['path', 'line', 'polyline', 'rect'].includes(e.tagName)).map(e => ({ class: e.className?.baseVal ?? e.className, style: e.getAttribute('style'), rect: e.getBoundingClientRect().toJSON(), opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform, clip: getComputedStyle(e).clipPath, text: e.childNodes.length === 1 && e.firstChild?.nodeType === 3 ? e.textContent : '' })) });
          if (now - start < ms) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }, duration);
      await action();
      await page.waitForTimeout(duration + 100);
      await fs.writeFile(`${out}/${name}-${label}-frames.json.gz`, gzipSync(JSON.stringify(await page.evaluate(() => window.__frames)), { level: 9 }));
      await screenshot(`${out}/${name}-${label}.png`);
    };
    if (name === 'hold-to-confirm') {
      const button = page.getByRole('button', { name: 'Hold to delete', exact: true });
      await record('release', async () => { await button.hover(); await page.mouse.down(); await page.waitForTimeout(540); await page.mouse.up(); });
      await record('complete', async () => { await button.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1300); await page.keyboard.up('Space'); }, 2600);
    } else {
      const pause = scope.getByRole('button', { name: 'Pause', exact: true });
      if (await pause.count()) await pause.click();
      await scope.getByRole('button', { name: 'Reset', exact: true }).click();
      const again = scope.getByRole('button', { name: 'Pause', exact: true });
      if (await again.count()) await again.click();
      await record('request', () => scope.getByRole('button', { name: 'Send the next request', exact: true }).click(), 4500);
      await record('hit', () => scope.getByRole('button', { name: 'Send the next request', exact: true }).click(), 4000);
      await scope.getByRole('button', { name: 'Change the system prompt', exact: true }).click();
      await record('partial', () => scope.getByRole('button', { name: 'Send the next request', exact: true }).click(), 4000);
    }
    await fs.writeFile(`${out}/${name}-animations.json`, JSON.stringify(await page.evaluate(() => window.__animations), null, 2));
    await page.setViewportSize({ width: 390, height: 844 });
    await scope.scrollIntoViewIfNeeded();
    await fs.writeFile(`${out}/${name}-mobile.json`, JSON.stringify(await measurements(), null, 2));
    await screenshot(`${out}/${name}-mobile.png`);
    await page.setViewportSize({ width: 1920, height: 1100 });
    await scope.scrollIntoViewIfNeeded();
    await fs.writeFile(`${out}/${name}-wide.json`, JSON.stringify(await measurements(), null, 2));
    await screenshot(`${out}/${name}-wide.png`);
    await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    await page.waitForTimeout(600);
    await screenshot(`${out}/${name}-dark.png`);
    await fs.writeFile(`${out}/${name}-tokens.json`, JSON.stringify(await scope.evaluate(n => {
      const s = getComputedStyle(n);
      return Object.fromEntries(['--ease-standard', '--ease-enter', '--ease-exit', '--ease-in-out', '--duration-fast', '--duration-standard', '--duration-slow', '--radius-control', '--radius-surface', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--foreground', '--background', '--surface', '--text-muted', '--danger', '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'].map(key => [key, s.getPropertyValue(key)]));
    }), null, 2));
    await page.close();
  }
} finally { await browser.close(); }
