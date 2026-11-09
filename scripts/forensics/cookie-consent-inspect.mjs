import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. No API, registry, Code tab, bundle or prompt reads.
// States (bar, preferences, reopen button), DOM, declared CSS of the rendered page, computed styles, and frame-by-frame
// recordings of the surface while it morphs between shapes.
const directory = 'docs/research/cookie-consent/source';
await fs.mkdir(directory, { recursive: true });
const URL = 'https://uiarc.dev/components/cookie-consent';
const browser = await chromium.launch({ channel: 'chrome' });

const RECORDER = () => {
  window.__rec = { frames: [], on: false, t0: 0 };
  const sample = () => {
    if (!window.__rec.on) return;
    const surface = document.querySelector('[class*="cookie-consent_surface"]');
    const layer = document.querySelector('[class*="cookie-consent_layer"]');
    if (surface) {
      const r = surface.getBoundingClientRect(), s = getComputedStyle(surface), l = layer.getBoundingClientRect();
      const faces = [...surface.querySelectorAll('[class*="cookie-consent_face"]')].map(f => { const c = getComputedStyle(f); return { cls: String(f.className).replace(/cookie-consent_|__\w+/g, ''), op: +c.opacity, filter: c.filter, tf: c.transform, vis: c.visibility, pe: c.pointerEvents }; });
      window.__rec.frames.push({ t: +(performance.now() - window.__rec.t0).toFixed(2), x: +(r.x - l.x).toFixed(2), y: +(r.y).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), radius: s.borderRadius, op: +s.opacity, tf: s.transform, faces });
    }
    requestAnimationFrame(sample);
  };
  window.__start = () => { window.__rec.frames = []; window.__rec.on = true; window.__rec.t0 = performance.now(); requestAnimationFrame(sample); };
  window.__stop = () => { window.__rec.on = false; return window.__rec.frames; };
};

async function open(width = 1440, height = 1000, dark = false) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  await page.addInitScript(RECORDER);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[class*="cookie-consent_stage"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  return { context, page };
}
const save = (name, data) => fs.writeFile(`${directory}/${name}`, typeof data === 'string' ? data : JSON.stringify(data));
const surfaceHtml = page => page.locator('[class*="cookie-consent_surface"]').evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, m => m.length > 400 ? '<svg…/>' : m));
const stage = page => page.locator('[class*="cookie-consent_stage"]');
const askAgain = page => page.getByText('Ask again', { exact: true }).evaluate(n => { n.scrollIntoView({ block: 'center' }); n.click(); });
const record = async (page, action, ms = 1300) => {
  await page.evaluate(() => window.__start());
  await page.waitForTimeout(40);
  await action();
  await page.waitForTimeout(ms);
  return page.evaluate(() => window.__stop());
};

{
  const { context, page } = await open();
  await save('01-bar.html', await surfaceHtml(page));
  await stage(page).screenshot({ path: `${directory}/01-bar.png` });
  await page.screenshot({ path: `${directory}/01-bar-page.png` });
  // declared CSS of the rendered page for the component's classes
  const css = await page.evaluate(() => {
    const out = [];
    const walk = (rules, prefix) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk([...r.cssRules], `@${r.conditionText ?? r.name ?? ''} `); else if (r.selectorText && /cookie-consent/.test(r.selectorText)) out.push(prefix + r.cssText); } };
    for (const sheet of document.styleSheets) { try { walk([...sheet.cssRules], ''); } catch {} }
    return out;
  });
  await save('declared-styles.css', css.join('\n\n'));
  // computed styles of the bar's parts
  const styles = await page.locator('[class*="cookie-consent_layer"], [class*="cookie-consent_layer"] *').evaluateAll(nodes => nodes.map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { tag: n.tagName, cls: String(n.className?.baseVal ?? n.className).slice(0, 80), text: (n.children.length ? '' : n.textContent).slice(0, 50), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), color: s.color, bg: s.backgroundColor, font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily.split(',')[0]}`, ls: s.letterSpacing, border: s.border, radius: s.borderRadius, shadow: s.boxShadow, pad: s.padding, gap: s.gap, backdrop: s.backdropFilter }; }));
  await save('01-bar-styles.json', styles);
  const vars = await page.locator('[class*="cookie-consent_demo"]').evaluate(n => { const s = getComputedStyle(n); return Object.fromEntries(['--background', '--surface', '--surface-raised', '--surface-muted', '--border', '--border-subtle', '--foreground', '--text-secondary', '--text-muted', '--accent', '--radius-pill', '--radius-lg', '--shadow-md', '--shadow-lg', '--duration-fast', '--ease-standard', '--font-body', '--text-sm', '--text-xs'].map(k => [k, s.getPropertyValue(k).trim()])); });
  await save('tokens.json', vars);

  // bar -> preferences
  const toPrefs = await record(page, () => page.getByRole('button', { name: 'Customize', exact: true }).click());
  await save('motion-bar-to-prefs.json', toPrefs);
  await save('02-prefs.html', await surfaceHtml(page));
  await stage(page).screenshot({ path: `${directory}/02-prefs.png` });
  await save('02-prefs-styles.json', await page.locator('[class*="cookie-consent_layer"] *').evaluateAll(nodes => nodes.map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { tag: n.tagName, cls: String(n.className?.baseVal ?? n.className).slice(0, 80), text: (n.children.length ? '' : n.textContent).slice(0, 60), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), color: s.color, bg: s.backgroundColor, font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight}`, radius: s.borderRadius, border: s.border, shadow: s.boxShadow, pad: s.padding, gap: s.gap }; })));
  console.log('focus after open:', await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));

  // a switch toggled
  const switches = page.getByRole('switch');
  console.log('switches:', await switches.count());
  const flipped = await record(page, async () => { await switches.nth(0).click(); }, 700);
  await save('motion-switch.json', flipped);
  await stage(page).screenshot({ path: `${directory}/03-prefs-switched.png` });
  await save('03-prefs-switched.html', await surfaceHtml(page));
  console.log('save label:', await page.locator('[class*="cookie-consent_surface"] button').allInnerTexts());

  // Escape closes without saving
  const escaped = await record(page, () => page.keyboard.press('Escape'));
  await save('motion-escape.json', escaped);
  console.log('after Escape:', await page.locator('[class*="cookie-consent_surface"]').innerText().then(t => t.slice(0, 60)), '| focus:', await page.evaluate(() => document.activeElement?.textContent?.slice(0, 30)));

  // prefs -> save -> reopen button
  await page.getByRole('button', { name: 'Customize', exact: true }).click(); await page.waitForTimeout(900);
  await page.getByRole('switch').nth(0).click(); await page.waitForTimeout(300);
  const saveButton = page.locator('[class*="cookie-consent_surface"] button', { hasText: /^Save/ }).first();
  const toReopen = await record(page, () => saveButton.click());
  await save('motion-prefs-to-reopen.json', toReopen);
  await save('04-reopen.html', await surfaceHtml(page));
  await stage(page).screenshot({ path: `${directory}/04-reopen.png` });
  console.log('stored:', await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => /consent|cookie/i.test(k))))));
  console.log('focus after save:', await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 200)));
  await save('status-text.txt', await page.locator('[class*="cookie-consent_statusText"]').innerText());

  // reopen -> prefs
  const reopenToPrefs = await record(page, () => page.locator('[class*="cookie-consent_surface"] button[aria-haspopup="dialog"]').click());
  await save('motion-reopen-to-prefs.json', reopenToPrefs);
  await stage(page).screenshot({ path: `${directory}/05-reopened-prefs.png` });
  const prefsToReopenAgain = await record(page, () => page.keyboard.press('Escape'));
  await save('motion-prefs-escape-to-reopen.json', prefsToReopenAgain);

  // ask again -> bar
  const reset = await record(page, () => askAgain(page));
  await save('motion-reset-to-bar.json', reset);
  await save('status-text-after-reset.txt', await page.locator('[class*="cookie-consent_statusText"]').innerText());

  // accept all -> reopen
  const accept = await record(page, () => page.getByRole('button', { name: 'Accept all', exact: true }).click());
  await save('motion-accept-to-reopen.json', accept);
  await save('status-text-accepted.txt', await page.locator('[class*="cookie-consent_statusText"]').innerText());
  await stage(page).screenshot({ path: `${directory}/06-accepted.png` });
  await askAgain(page); await page.waitForTimeout(1200);
  const reject = await record(page, () => page.getByRole('button', { name: 'Reject all', exact: true }).click());
  await save('motion-reject-to-reopen.json', reject);
  await save('status-text-rejected.txt', await page.locator('[class*="cookie-consent_statusText"]').innerText());

  // hover / focus on the buttons of the bar
  await askAgain(page); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Accept all', exact: true }).hover(); await page.waitForTimeout(300);
  await stage(page).screenshot({ path: `${directory}/07-hover-accept.png` });
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await stage(page).screenshot({ path: `${directory}/08-focus.png` });
  await context.close();
}

{ // entrance: record from the first frame after a reload with the choice cleared
  const { context, page } = await open();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => window.__start());
  await page.waitForTimeout(1600);
  await save('motion-entrance.json', await page.evaluate(() => window.__stop()));
  await context.close();
}

{ // phone and dark
  const { context, page } = await open(390, 844);
  await stage(page).screenshot({ path: `${directory}/09-phone-bar.png` });
  await save('09-phone-bar-styles.json', await page.locator('[class*="cookie-consent_layer"] *').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { cls: String(n.className?.baseVal ?? n.className).slice(0, 60), text: (n.children.length ? '' : n.textContent).slice(0, 30), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)) }; })));
  await page.getByRole('button', { name: 'Customize', exact: true }).click(); await page.waitForTimeout(1000);
  await stage(page).screenshot({ path: `${directory}/10-phone-prefs.png` });
  await context.close();
}
{
  const { context, page } = await open(1440, 1000, true);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click().catch(() => {});
  await page.waitForTimeout(500);
  await stage(page).screenshot({ path: `${directory}/11-dark-bar.png` });
  await page.getByRole('button', { name: 'Customize', exact: true }).click(); await page.waitForTimeout(1000);
  await stage(page).screenshot({ path: `${directory}/12-dark-prefs.png` });
  await context.close();
}
await browser.close();
