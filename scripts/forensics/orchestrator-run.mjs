// Frame-by-frame recording of the public Agent orchestrator preview's sample run: plan streaming, dispatch pulses, lane states, tool labels, streamed output,
// token/cost counters, retries, summary and totals. Rendered page only. Usage: node scripts/forensics/orchestrator-run.mjs [concurrency]
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const concurrency = process.argv[2] || '';
const directory = 'docs/research/orchestrator/source/agent-orchestrator';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  window.__frames = []; window.__on = false;
  window.__go = () => {
    window.__frames = []; window.__on = true; const t0 = performance.now();
    const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const tick = () => {
      if (!window.__on) return;
      const root = document.querySelector('[class*="agent-orchestrator_root"]');
      if (root) {
        const q = (el, s) => el.querySelector(`[class*="agent-orchestrator_${s}"]`);
        const qa = (el, s) => [...el.querySelectorAll(`[class*="agent-orchestrator_${s}"]`)];
        const lead = root.querySelector('section[aria-label="Lead agent"]');
        const summary = root.querySelector('section[aria-label="Summary"]');
        const plan = qa(lead, 'planItem').map(li => { const cs = getComputedStyle(li); return [+(+cs.opacity).toFixed(2), Math.round(li.getBoundingClientRect().height), txt(li).length]; });
        const lanes = qa(root, 'lane').filter(l => l.matches('[class*="agent-orchestrator_lane__"]')).map(lane => {
          const cs = k => getComputedStyle(k);
          const rect = lane.getBoundingClientRect(), r0 = root.getBoundingClientRect();
          const out = q(lane, 'output');
          return { ph: lane.dataset.phase, y: Math.round(rect.top - r0.top), h: Math.round(rect.height), time: txt(q(lane, 'laneTime')), title: txt(q(lane, 'laneTitleText')), act: txt(q(lane, 'activityLabel')), actIcon: q(lane, 'activityIcon')?.firstElementChild?.getAttribute('class')?.replace(/agent-orchestrator_|__[A-Za-z0-9_-]{5}/g, '') ?? q(lane, 'activityIcon')?.firstElementChild?.getAttribute('class')?.split(' ').pop(), out: txt(out), outTone: out?.dataset.tone, outShift: !!q(lane, 'ticker')?.dataset.shifted, settled: !!q(lane, 'ticker')?.dataset.settled, chunks: qa(lane, 'chunk').length, met: txt(q(lane, 'laneMetrics')), metHidden: q(lane, 'laneMetrics')?.hasAttribute('data-hidden'), timeHidden: q(lane, 'laneTime')?.hasAttribute('data-hidden'), border: cs(lane).borderTopColor, open: lane.querySelector('button')?.getAttribute('aria-expanded'), log: qa(lane, 'logRow').length, mutedTitle: q(lane, 'laneTitle')?.hasAttribute('data-muted'), bg: cs(lane).backgroundColor };
        });
        const wires = root.querySelector('svg[class*="wires"]');
        const branches = wires ? [...wires.querySelectorAll('[class*="branch"]')].map(b => b.hasAttribute('data-on') ? 1 : 0) : [];
        const ports = wires ? [...wires.querySelectorAll('[class*="port"]')].map(b => b.hasAttribute('data-on') ? 1 : 0) : [];
        const pulses = wires ? [...wires.querySelectorAll('[class*="pulse"]')].map(p => { const cs = getComputedStyle(p); const b = p.getBoundingClientRect(); return [p.getAttribute('stroke') || cs.stroke, +(+cs.strokeDashoffset || 0).toFixed(1), cs.strokeDasharray, Math.round(b.left - root.getBoundingClientRect().left), Math.round(b.top - root.getBoundingClientRect().top), Math.round(b.width), Math.round(b.height), +(+cs.opacity).toFixed(2)]; }) : [];
        const totals = q(root, 'totalsWrap');
        window.__frames.push({
          t: +(performance.now() - t0).toFixed(1),
          leadStatus: txt(q(lead, 'nodeStatus')), leadTime: txt(q(lead, 'nodeTime')), plan,
          lanes, branches, ports, pulses,
          sumStatus: txt(q(summary, 'nodeStatus')), sumHint: txt(q(summary, 'hint')), sumText: txt(q(summary, 'summaryText')).length, sumLines: qa(summary, 'chunk').length,
          totals: totals ? [Math.round(totals.getBoundingClientRect().height), txt(totals)] : null,
          run: txt(root.querySelector('header button[class*="run"]')), seg: [...root.querySelectorAll('[class*="segmented-control_button"]')].map(b => b.getAttribute('aria-pressed') === 'true' ? 1 : 0).join(''),
          live: txt(root.querySelector('[role="status"]')), rootH: Math.round(root.getBoundingClientRect().height),
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
});
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// the run starts when the block scrolls into view; it has probably already started, so use the Run button for a clean recording
const root = page.locator('[class*="agent-orchestrator_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
const runButton = root.locator('header button[class*="run"]');
for (let i = 0; i < 80 && (await runButton.innerText()).trim() === 'Stop'; i += 1) await page.waitForTimeout(500);
await page.waitForTimeout(600);
if (concurrency) await root.getByRole('button', { name: concurrency, exact: true }).click();
await page.waitForTimeout(500);
await page.evaluate(() => window.__go());
await page.waitForTimeout(30);
await runButton.click();
const started = Date.now();
for (let i = 0; i < 240; i += 1) {
  await page.waitForTimeout(500);
  const label = (await runButton.innerText()).trim();
  if (label !== 'Stop' && Date.now() - started > 3000) break;
}
await page.waitForTimeout(1500);
const frames = await page.evaluate(() => { window.__on = false; return window.__frames; });
await fs.writeFile(`${directory}/run-c${concurrency || 'default'}.json`, JSON.stringify(frames));
await root.screenshot({ path: `${directory}/run-end.png` });
console.log('frames', frames.length, 'duration', frames.at(-1)?.t, 'last run label', frames.at(-1)?.run);
await browser.close();
