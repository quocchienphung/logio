// The public Segmented control's selection pill sliding between options (frame by frame), fitted with a spring. Rendered page only.
// Usage: node scripts/forensics/segmented-record.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
const root = page.locator('[class*="agent-orchestrator_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
await page.waitForTimeout(1000);
await page.evaluate(() => {
  window.__s = []; window.__on = false;
  window.__go = () => { window.__s = []; window.__on = true; const t0 = performance.now(); const tick = () => { if (!window.__on) return; const el = document.querySelector('[class*="segmented-control_selection"]'); if (el) { const r = el.getBoundingClientRect(); window.__s.push([+(performance.now() - t0).toFixed(1), +r.left.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2), +(+getComputedStyle(el).opacity).toFixed(2)]); } requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
});
const buttons = root.locator('[class*="segmented-control_button"]');
const out = {};
for (const [name, target] of [['4to2', 1], ['2to1', 0], ['1to4', 3]]) {
  await page.evaluate(() => window.__go()); await page.waitForTimeout(60);
  await buttons.nth(target).click(); await page.waitForTimeout(900);
  out[name] = await page.evaluate(() => { window.__on = false; return window.__s; });
}
await fs.writeFile('docs/research/orchestrator/source/primitives/segmented-frames.json', JSON.stringify(out));
function spring(o, z, t) { if (t <= 0) return 0; if (Math.abs(z - 1) < 1e-6) return 1 - (1 + o * t) * Math.exp(-o * t); if (z < 1) { const wd = o * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * o * t) * (Math.cos(wd * t) + (z * o / wd) * Math.sin(wd * t)); } const s = o * Math.sqrt(z * z - 1), r1 = -z * o + s, r2 = -z * o - s; return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1); }
for (const [name, s] of Object.entries(out)) {
  const a = s[0][1], b = s.at(-1)[1];
  const pts = s.map(f => [f[0] / 1000, (f[1] - a) / (b - a)]);
  const t0 = pts.find(p => p[1] > 0.01)?.[0] ?? 0; let best = { r: 9 };
  for (let o = 5; o <= 80; o += 0.5) for (let z = 0.4; z <= 2.6; z += 0.02) for (let sh = -0.04; sh <= 0.04; sh += 0.005) { let sum = 0; for (const [t, y] of pts) { const d = spring(o, z, t - t0 + sh) - y; sum += d * d; } const r = Math.sqrt(sum / pts.length); if (r < best.r) best = { r, o, z, sh }; }
  console.log(name, 'left', a.toFixed(1), '->', b.toFixed(1), 'width', s[0][2], s.at(-1)[2], 'omega', best.o, 'zeta', best.z.toFixed(2), 'stiffness', (best.o * best.o).toFixed(0), 'damping', (2 * best.z * best.o).toFixed(1), 'rmse', best.r.toFixed(4));
}
await browser.close();
