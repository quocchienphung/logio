// The finished transcripts of the public Agent orchestrator preview (opened lane by lane) and the summary, for two consecutive runs (is the run deterministic?).
// Rendered page only. Usage: node scripts/forensics/orchestrator-transcripts.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/agent-orchestrator';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
const root = page.locator('[class*="agent-orchestrator_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
const run = root.locator('header button[class*="run"]');
const done = async () => { for (let i = 0; i < 80; i += 1) { if ((await run.innerText()).trim() === 'Run again') return; await page.waitForTimeout(500); } };
const out = [];
for (let pass = 0; pass < 2; pass += 1) {
  await done(); await page.waitForTimeout(800);
  const lanes = root.locator('[class*="agent-orchestrator_lane__"]');
  const n = await lanes.count();
  const result = { pass, lanes: [] };
  for (let i = 0; i < n; i += 1) {
    const lane = lanes.nth(i);
    await lane.locator('button[class*="laneButton"]').click(); await page.waitForTimeout(700);
    result.lanes.push(await lane.evaluate(el => {
      const t = e => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
      return { head: t(el.querySelector('[class*="laneHead"]')), title: t(el.querySelector('[class*="laneTitle"]')), out: t(el.querySelector('[class*="output"]')), foot: t(el.querySelector('[class*="laneFoot"]')),
        rows: [...el.querySelectorAll('[class*="logRow"]')].map(r => ({ tone: r.dataset.tone, title: t(r.querySelector('[class*="logTitle"]')), target: t(r.querySelector('[class*="logTarget"]')), detail: t(r.querySelector('[class*="logDetail"]')), time: t(r.querySelector('[class*="logTime"]')) })) };
    }));
  }
  result.summary = await root.locator('section[aria-label="Summary"]').evaluate(el => ({ html: el.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/ class="[^"]*"/g, '').replace(/ style="[^"]*"/g, ''), text: el.textContent.replace(/\s+/g, ' ').trim() }));
  out.push(result);
  await root.screenshot({ path: `${directory}/transcripts-pass${pass}.png` });
  if (pass === 0) {
    for (let i = 0; i < n; i += 1) await root.locator('[class*="agent-orchestrator_lane__"]').nth(i).locator('button[class*="laneButton"]').click();
    await page.waitForTimeout(500);
    await run.click();
  }
}
await fs.writeFile(`${directory}/transcripts.json`, JSON.stringify(out, null, 1));
for (const result of out) { console.log('PASS', result.pass); for (const lane of result.lanes) { console.log(' ', lane.head, '|', lane.title, '|', lane.foot); for (const row of lane.rows) console.log('     ', row.tone ?? '', row.title, '·', row.target, '·', row.detail, '·', row.time); } console.log('  SUMMARY:', result.summary.text); }
await browser.close();
