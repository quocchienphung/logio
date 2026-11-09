import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'docs/research/process-agent-run';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/blocks/agent-run', { waitUntil: 'domcontentloaded' });
const root = page.locator('[class*="agent-run_root"]').first();
await root.waitFor();
await page.waitForTimeout(1200);
await root.scrollIntoViewIfNeeded();
async function capture(name) {
  await root.screenshot({ path: `${out}/source-${name}.png` });
  await fs.writeFile(`${out}/source-${name}.txt`, await root.innerText());
}
await capture('initial');
await root.getByRole('button', { name: 'Approve', exact: true }).waitFor({ timeout: 20000 });
await capture('waiting');
await root.getByRole('button', { name: /Planned the change/ }).click();
await page.waitForTimeout(350);
await capture('disclosed');
await fs.writeFile(`${out}/source-styles.json`, JSON.stringify(await root.evaluate(el => [el, ...el.querySelectorAll('*')].filter(e => e.getAttribute('class')?.includes('agent-run_')).map(e => {
  const s = getComputedStyle(e), r = e.getBoundingClientRect();
  return { tag: e.tagName, cls: e.getAttribute('class'), text: e.children.length ? null : e.textContent, rect: [r.x, r.y, r.width, r.height], font: s.font, color: s.color, background: s.backgroundColor, border: s.border, radius: s.borderRadius, padding: s.padding, gap: s.gap, transition: s.transition };
})), null, 2));
await root.getByRole('button', { name: 'Reject', exact: true }).click();
await capture('reject');
console.log('Reject controls:', await root.locator('input,textarea').evaluateAll(es => es.map(e => ({ tag: e.tagName, placeholder: e.getAttribute('placeholder') }))));
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 390, height: 844 });
await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await capture('mobile-waiting');
await page.setViewportSize({ width: 1440, height: 1000 }); await root.scrollIntoViewIfNeeded();
await root.getByRole('button', { name: 'Approve', exact: true }).click();
await page.waitForTimeout(1500); await capture('working');
await page.waitForTimeout(10000); await capture('done');
console.log('Done:', await root.innerText());
await page.setViewportSize({ width: 390, height: 844 });
await root.scrollIntoViewIfNeeded(); await capture('mobile');
await browser.close();
