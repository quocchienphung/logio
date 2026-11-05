// Renders the Guide me selector at the reference clip's 716 × 574 viewport in the three settled states and
// writes screenshots for comparison against docs/research/guide-navigation/video-frames (f000 / f096 / f174).
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/guide-navigation/comparison';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 716, height: 574 } })).newPage();
for (const [group, name] of [['agent-chat', 'f000'], ['sales', 'f096'], ['crm', 'f174']]) {
  await page.goto(`${base}/personalize?browse=1&group=${group}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.mouse.move(700, 560);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/local-${name}.png` });
  console.log('saved', name);
}
await browser.close();
