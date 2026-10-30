// The primitives the previews are built from (Text shimmer, Segmented control, Button, Copy button, shared tokens): declared CSS of their class families and
// resolved tokens, light and dark. Rendered pages only. Usage: node scripts/forensics/orchestrator-primitives.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/primitives';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const families = ['text-shimmer_', 'segmented-control_', 'button_', 'copy-button_'];
const css = await page.evaluate(families => {
  const out = [];
  const walk = (rules, prefix) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk([...r.cssRules], `${prefix}@${r.conditionText ?? r.name ?? ''} `); else if (r.selectorText && families.some(f => r.selectorText.includes(f))) out.push(`${prefix}${r.cssText}`); else if (r.name && families.some(f => r.name.includes(f.replace('_', '')))) out.push(`${prefix}${r.cssText}`); } };
  for (const sheet of document.styleSheets) { try { walk([...sheet.cssRules], ''); } catch { /* cross-origin */ } }
  return out;
}, families);
await fs.writeFile(`${directory}/declared.css`, css.join('\n\n'));
const used = css.join(String.fromCharCode(10)).match(/var\(--[a-z0-9-]+/gi)?.map(v => v.slice(4)) ?? [];
const names = [...new Set([...used, '--series-1', '--series-2', '--series-3', '--series-4', '--focus-ring', '--radius-control', '--radius-panel', '--surface-muted', '--border', '--border-strong'])];
const el = page.locator('[class*="agent-orchestrator_root"]').first();
const resolve = () => el.evaluate((n, names) => Object.fromEntries(names.map(k => [k, getComputedStyle(n).getPropertyValue(k).trim()])), names);
await fs.writeFile(`${directory}/tokens-light.json`, JSON.stringify(await resolve(), null, 1));
await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
await page.waitForTimeout(600);
await fs.writeFile(`${directory}/tokens-dark.json`, JSON.stringify(await resolve(), null, 1));
// text shimmer variables on the label and its running animation
const shimmer = page.locator('[class*="text-shimmer_shimmer"]').first();
const vars = await shimmer.evaluate(n => { const cs = getComputedStyle(n); const out = {}; for (const k of ['--ts-base', '--ts-highlight', '--ts-speed', '--ts-width', '--ts-spread']) out[k] = cs.getPropertyValue(k); const l = n.querySelector('[class*="label"]'); const ls = getComputedStyle(l); return { vars: out, bg: ls.backgroundImage.slice(0, 200), clip: ls.backgroundClip, color: ls.color, fill: ls.webkitTextFillColor, size: ls.backgroundSize, pos: ls.backgroundPosition }; });
console.log(css.length, 'rules', names.length, 'tokens'); console.log(JSON.stringify(vars, null, 1));
await browser.close();
