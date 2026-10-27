import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Computed style (size, type, colour, radius, shadow, transitions, focus ring) of the Action button and of every face of Confirm morph (hold mode) in the
// public previews, at rest and hovered, in light and dark. Rendered output only. Output: docs/research/uiarc-action-button/styles.json and uiarc-confirm-morph/styles.json
const browser = await chromium.launch({ channel: 'chrome' });
const describe = (selector, index = 0) => {
  const el = [...document.querySelectorAll(selector)][index];
  if (!el) return null;
  const s = getComputedStyle(el), b = el.getBoundingClientRect(), before = getComputedStyle(el, '::before'), after = getComputedStyle(el, '::after');
  return {
    selector, text: el.children.length ? undefined : el.textContent.trim().slice(0, 30), rect: [b.width, b.height].map(v => Math.round(v * 100) / 100),
    font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight}`, ls: s.letterSpacing, color: s.color, bg: s.backgroundColor, bgImage: s.backgroundImage === 'none' ? undefined : s.backgroundImage.slice(0, 120),
    border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, radius: s.borderRadius, padding: s.padding, gap: s.gap, display: s.display, align: s.alignItems,
    shadow: s.boxShadow, transition: s.transition.slice(0, 220), cursor: s.cursor, outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor} offset ${s.outlineOffset}`, opacity: s.opacity,
    before: before.content !== 'none' ? { bg: before.backgroundColor, w: before.width, h: before.height } : undefined, after: after.content !== 'none' ? { bg: after.backgroundColor, w: after.width, h: after.height } : undefined,
  };
};
async function measure(page, selectors) { return page.evaluate(`((describe, selectors) => Object.fromEntries(selectors.map(([name, sel, i]) => [name, describe(sel, i ?? 0)])))(${describe.toString()}, ${JSON.stringify(selectors)})`); }

try {
  // ---------------------------------------------------------------- action button
  {
    const result = {};
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
      const page = await context.newPage();
      await page.goto('https://uiarc.dev/components/action-button', { waitUntil: 'networkidle' });
      if (scheme === 'dark') { await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; }); }
      await page.waitForTimeout(1200);
      const btn = page.locator('[class*="action-button_button"]').first();
      await btn.scrollIntoViewIfNeeded();
      const sel = [['button', '[class*="action-button_button"]'], ['content', '[class*="action-button_content"]'], ['label', '[class*="action-button_label"]'], ['iconSlot', '[class*="action-button_iconSlot"]'], ['arrowSvg', '[class*="action-button_arrow"]'], ['surface', '[class*="previews-actions-inputs_surface"]'], ['preview', '[class*="preview-shell_shell"]']];
      result[scheme] = { rest: await measure(page, sel) };
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(600);
      result[scheme].hover = await measure(page, sel.slice(0, 1));
      await page.mouse.move(5, 5); await btn.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(400);
      result[scheme].focusVisible = await measure(page, sel.slice(0, 1));
      await context.close();
    }
    await fs.writeFile('docs/research/uiarc-action-button/styles.json', JSON.stringify(result, null, 2));
  }
  // ---------------------------------------------------------------- confirm morph (hold)
  {
    const result = {};
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
      const page = await context.newPage();
      await page.goto('https://uiarc.dev/components/confirm-morph', { waitUntil: 'networkidle' });
      if (scheme === 'dark') { await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; }); }
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: 'Hold', exact: true }).click(); await page.waitForTimeout(500);
      const root = [['root', '[class*="confirm-morph_root"]'], ['surface', '[class*="confirm-morph_surface"]'], ['face', '[class*="confirm-morph_face"]']];
      const trigger = page.locator('[class*="confirm-morph_trigger"]').first(), tb = await trigger.boundingBox();
      result[scheme] = { idle: await measure(page, [...root, ['trigger', '[class*="confirm-morph_trigger"]'], ['icon', '[class*="confirm-morph_icon"]'], ['row', '[class*="previews-confirm"], [class*="confirm-morph_row"]']]) };
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await page.waitForTimeout(500);
      result[scheme].idleHover = await measure(page, [['trigger', '[class*="confirm-morph_trigger"]'], ['surface', '[class*="confirm-morph_surface"]']]);
      await trigger.click(); await page.mouse.move(5, 5); await page.waitForTimeout(1200);
      result[scheme].confirming = await measure(page, [...root, ['prompt', '[class*="confirm-morph_prompt"]'], ['cancel', '[class*="confirm-morph_secondary"]'], ['confirm', '[class*="confirm-morph_confirm"]'], ['fill', '[class*="confirm-morph_fill"]'], ['fillLabel', '[class*="confirm-morph_fill"] span']]);
      const cancel = page.locator('[class*="confirm-morph_secondary"]').first(), cb = await cancel.boundingBox();
      await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.waitForTimeout(500);
      result[scheme].cancelHover = await measure(page, [['cancel', '[class*="confirm-morph_secondary"]']]);
      const confirm = page.locator('[class*="confirm-morph_confirm"]').first(), kb = await confirm.boundingBox();
      await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2); await page.waitForTimeout(500);
      result[scheme].confirmHover = await measure(page, [['confirm', '[class*="confirm-morph_confirm"]']]);
      await page.mouse.down(); await page.waitForTimeout(400);
      result[scheme].holding = await measure(page, [['confirm', '[class*="confirm-morph_confirm"]'], ['fill', '[class*="confirm-morph_fill"]'], ['fillLabel', '[class*="confirm-morph_fill"] span']]);
      await page.waitForTimeout(700);
      result[scheme].pending = await measure(page, [...root, ['status', '[class*="confirm-morph_status"]'], ['spinner', '[class*="confirm-morph_spinner"], [class*="confirm-morph_face"] svg']]);
      await page.waitForTimeout(1800); await page.mouse.up();
      result[scheme].done = await measure(page, [...root, ['status', '[class*="confirm-morph_status"]'], ['statusText', '[class*="confirm-morph_statusText"]'], ['check', '[class*="confirm-morph_check"]'], ['undo', '[class*="confirm-morph_secondary"]']]);
      await context.close();
    }
    await fs.writeFile('docs/research/uiarc-confirm-morph/styles.json', JSON.stringify(result, null, 2));
  }
} finally { await browser.close(); }
