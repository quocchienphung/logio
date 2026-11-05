import fs from 'node:fs/promises';
import { chromium } from 'playwright';
// Public rendered preview only. Entrance recorded from the first frame; switch, button and focus states.
const directory = 'docs/research/cookie-consent/source';
const URL = 'https://uiarc.dev/components/cookie-consent';
const browser = await chromium.launch({ channel: 'chrome' });
const save = (n, d) => fs.writeFile(`${directory}/${n}`, typeof d === 'string' ? d : JSON.stringify(d));
const FRAME = `(() => {
  const surface = document.querySelector('[class*="cookie-consent_surface"]'); if (!surface) return null;
  const r = surface.getBoundingClientRect(), s = getComputedStyle(surface), layer = document.querySelector('[class*="cookie-consent_layer"]').getBoundingClientRect();
  const faces = [...surface.querySelectorAll('[class*="cookie-consent_face"]')].map(f => { const c = getComputedStyle(f); return { op: +c.opacity, filter: c.filter }; });
  return { y: r.y - layer.y, h: r.height, w: r.width, op: +s.opacity, tf: s.transform, faces };
})()`;
{ // entrance: stored choice cleared, recording starts before the first paint
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.addInitScript(`window.__f = []; const t0 = performance.now(); const tick = () => { try { const r = ${FRAME}; if (r) window.__f.push({ t: +(performance.now() - t0).toFixed(1), ...r }); } catch {} requestAnimationFrame(tick); }; requestAnimationFrame(tick);`);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => localStorage.clear());
  const frames = await page.evaluate(() => window.__f);
  await save('motion-entrance-first-load.json', frames);
  console.log('first-load frames with a surface:', frames.length, frames.slice(0, 3).map(f => `${f.t}: op ${f.op} tf ${f.tf}`));
  await context.close();
}
{ // switch + button states
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  await page.locator('[class*="cookie-consent_stage"]').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Customize', exact: true }).click(); await page.waitForTimeout(1200);
  const sw = page.getByRole('switch').nth(0);
  await page.evaluate(() => { window.__sw = []; window.__swOn = true; const sw = document.querySelectorAll('[role=switch]')[0]; const t0 = performance.now(); const tick = () => { const tr = sw.querySelector('[class*="switch_track"]'), th = sw.querySelector('[class*="switch_thumb"]'); window.__sw.push({ t: +(performance.now() - t0).toFixed(1), track: getComputedStyle(tr).backgroundColor, thumb: getComputedStyle(th).transform, w: getComputedStyle(th).width, checked: sw.getAttribute('aria-checked') }); if (window.__swOn) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  await page.waitForTimeout(60); await sw.click(); await page.waitForTimeout(700);
  await save('motion-switch-element.json', await page.evaluate(() => { window.__swOn = false; return window.__sw; }));
  await page.evaluate(() => { window.__sw = []; window.__swOn = true; const sw = document.querySelectorAll('[role=switch]')[0]; const t0 = performance.now(); const tick = () => { const tr = sw.querySelector('[class*="switch_track"]'), th = sw.querySelector('[class*="switch_thumb"]'); window.__sw.push({ t: +(performance.now() - t0).toFixed(1), track: getComputedStyle(tr).backgroundColor, thumb: getComputedStyle(th).transform, w: getComputedStyle(th).width }); if (window.__swOn) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(40); await page.mouse.move(0, 0);
  const states = {};
  const buttons = { save: page.locator('[class*="cookie-consent_surface"] button', { hasText: /^Save/ }).first(), reject: page.locator('[class*="cookie-consent_panelActions"] button').nth(0), accept: page.locator('[class*="cookie-consent_panelActions"] button').nth(1) };
  const read = el => el.evaluate(n => { const s = getComputedStyle(n); return { bg: s.backgroundColor, color: s.color, border: s.borderColor, shadow: s.boxShadow, transform: s.transform, scale: s.scale, transition: s.transition.slice(0, 200), outline: s.outline }; });
  for (const [name, el] of Object.entries(buttons)) {
    states[name] = { rest: await read(el) };
    await el.hover(); await page.waitForTimeout(400); states[name].hover = await read(el);
    await page.mouse.down(); await page.waitForTimeout(250); states[name].active = await read(el); await page.mouse.move(2, 2); await page.mouse.up(); await page.waitForTimeout(150);
  }
  const sw2 = await page.getByRole('switch').nth(0).evaluate(n => { const s = getComputedStyle(n.querySelector('[class*="switch_track"]')), t = getComputedStyle(n.querySelector('[class*="switch_thumb"]')); return { checked: n.getAttribute('aria-checked'), trackBg: s.backgroundColor, trackTransition: s.transition.slice(0, 200), thumbTransform: t.transform, thumbTransition: t.transition.slice(0, 200), thumbW: t.width }; });
  states.switch = sw2;
  await save('button-states.json', states);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  states.focusSwitch = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); const tr = getComputedStyle(a.querySelector('[class*="switch_track"]') ?? a); return { tag: a.className, outline: s.outline, offset: s.outlineOffset, shadow: s.boxShadow, trackShadow: tr.boxShadow, trackOutline: tr.outline }; });
  await save('button-states.json', states);
  console.log(JSON.stringify(states, null, 1).slice(0, 3800));
  await context.close();
}
await browser.close();
