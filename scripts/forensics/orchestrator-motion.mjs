// Frame-by-frame height/opacity of the motions the public previews are built from: an orchestrator lane's transcript (open and close), the tool call group
// (header toggle: rows stagger in) and a tool call row's Input/Output panel, and the Retry flow. Rendered pages only. Usage: node scripts/forensics/orchestrator-motion.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source';
const browser = await chromium.launch({ channel: 'chrome' });
const SAMPLER = () => {
  window.__samples = []; window.__sampling = false;
  window.__sample = (selector, all = false) => {
    window.__samples = []; window.__sampling = true; const t0 = performance.now();
    const tick = () => {
      if (!window.__sampling) return;
      const els = all ? [...document.querySelectorAll(selector)] : [document.querySelector(selector)];
      window.__samples.push({ t: +(performance.now() - t0).toFixed(1), els: els.map(el => { if (!el) return null; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return [+r.height.toFixed(2), +r.top.toFixed(2), +(+cs.opacity).toFixed(3), cs.transform === 'none' ? 0 : +cs.transform.split(',')[5]?.replace(')', '') || 0, cs.display === 'none' || cs.visibility === 'hidden' ? 1 : 0]; }) });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.__stopSample = () => { window.__sampling = false; return window.__samples; };
};
const save = (name, data) => fs.writeFile(`${directory}/${name}`, JSON.stringify(data));

// ---------- orchestrator lane transcript
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  await context.addInitScript(SAMPLER);
  const page = await context.newPage();
  await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
  const root = page.locator('[class*="agent-orchestrator_root"]').first();
  await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const run = root.locator('header button[class*="run"]');
  for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) await page.waitForTimeout(500);
  await page.waitForTimeout(900);
  const lane = root.locator('[class*="agent-orchestrator_lane__"]').first();
  const sel = '[class*="agent-orchestrator_lane__"]:first-of-type [class*="agent-orchestrator_collapse"]';
  await page.evaluate(s => window.__sample(s), sel);
  await page.waitForTimeout(60);
  await lane.locator('button[class*="laneButton"]').click(); await page.waitForTimeout(1200);
  const open = await page.evaluate(() => window.__stopSample());
  await page.evaluate(s => window.__sample(s), sel);
  await page.waitForTimeout(60);
  await lane.locator('button[class*="laneButton"]').click(); await page.waitForTimeout(1200);
  const close = await page.evaluate(() => window.__stopSample());
  await save('motion-orch-lane.json', { open, close });
  console.log('lane transcript: open frames', open.length, 'final', open.at(-1).els[0], '| close', close.length, close.at(-1).els[0]);
  // Run again: totals appear, summary text streams
  await context.close();
}

// ---------- tool call
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(SAMPLER);
  const page = await context.newPage();
  await page.goto('https://uiarc.dev/components/tool-call', { waitUntil: 'networkidle' });
  const demo = page.locator('[class*="tool-call_demo"]').first();
  await demo.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(2500);
  const toggle = demo.locator('button[class*="groupToggle"]');
  console.log('group toggle expanded:', await toggle.getAttribute('aria-expanded'));
  const rows = demo.locator('[class*="tool-call_row"], [class*="tool-call_item"], [class*="tool-call_call"]');
  console.log('row-ish classes:', await demo.evaluate(n => [...new Set([...n.querySelectorAll('*')].flatMap(e => [...e.classList]).map(c => c.replace(/_[A-Za-z0-9_-]{5}$/, '')))].join(' ')));
  // fold the group
  const listSel = '[class*="tool-call_group"] [class*="tool-call_list"], [class*="tool-call_groupBody"], [class*="tool-call_groupList"]';
  const sampleTargets = await demo.evaluate(n => { const g = n.querySelector('[class*="tool-call_group__"]'); return g ? [...g.children].map(c => c.className.replace(/_[A-Za-z0-9_-]{5}/g, '')) : []; });
  console.log('group children:', sampleTargets);
  await page.evaluate(() => window.__sample('[class*="tool-call_group__"]'));
  await toggle.click(); await page.waitForTimeout(1400);
  const fold = await page.evaluate(() => window.__stopSample());
  await page.evaluate(() => window.__sample('[class*="tool-call_group__"]'));
  await toggle.click(); await page.waitForTimeout(1400);
  const unfold = await page.evaluate(() => window.__stopSample());
  await save('motion-toolcall-group.json', { fold, unfold });
  console.log('group height: fold', fold[0].els[0][0], '->', fold.at(-1).els[0][0], '| unfold', unfold[0].els[0][0], '->', unfold.at(-1).els[0][0]);
  await page.screenshot({ path: `${directory}/tool-call/group-open.png`, clip: { x: 300, y: 300, width: 800, height: 520 } });
  await context.close();
}
await browser.close();
