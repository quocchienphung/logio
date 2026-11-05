// Captures the selector mid-transition (animations paused at the clip's timing) for side-by-side with video frames.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/guide-navigation/comparison';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 716, height: 574 } })).newPage();
// [start group, hovered item, video frame to compare, video frame of the transition start (first moving frame)]
for (const [from, to, frame, first] of [['agent-chat', 'CRM', 18, 13], ['crm', 'Agent Chat', 45, 40], ['agent-chat', 'Sales', 66, 63]]) {
  await page.goto(`${base}/personalize?browse=1&group=${from}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.mouse.move(700, 560); await page.waitForTimeout(900);
  await page.locator('.guide-item').filter({ hasText: new RegExp(`${to}$`) }).hover();
  await page.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), (frame - first + 2.25) / 30 * 1000);
  await page.mouse.move(700, 560, { steps: 1 }).catch(() => {});
  await page.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), (frame - first + 2.25) / 30 * 1000);
  await page.screenshot({ path: `${out}/local-mid-f${String(frame).padStart(3, '0')}.png` });
}
await browser.close();
