// Pauses the selector's CSS transitions at fixed times after a hover and compares the active bar's travel
// with the reference clip (bar top y per frame, measured from frames 13-25 of the 30 fps video).
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const videoBarTop = [312, 323, 331, 337, 342, 346, 350, 352, 354, 356, 357, 358, 359]; // frames 13..25, row 2 -> row 3
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 716, height: 574 } })).newPage();
await page.goto(`${base}/personalize?browse=1&group=agent-chat`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
await page.mouse.move(700, 560); await page.waitForTimeout(1000);
await page.getByRole('link', { name: /CRM/ }).hover();
const rows = [];
for (let k = 13; k <= 25; k++) {
  const t = (k - 13 + 2.25) / 30 * 1000; // the fit puts the clip's first moving frame ~2.25 frames into the transition
  rows.push(await page.evaluate(ms => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
    const bar = document.querySelector('.guide-bar').getBoundingClientRect();
    const strip = document.querySelector('.guide-preview__strip').getBoundingClientRect();
    return { top: +bar.top.toFixed(1), height: +bar.height.toFixed(1), stripY: +strip.top.toFixed(1) };
  }, t));
}
// Row 2 -> 3 in local px: rows are 41.5 tall with a 27 gap, so travel = 68.5 against the video's 77 (its row 2 is two lines).
const travel = 68.5;
console.log('frame videoProgress localProgress');
rows.forEach((r, i) => {
  const vp = (videoBarTop[i] - 282) / 77, lp = (r.top - (rows[rows.length - 1].top - travel)) / travel;
  console.log(13 + i, vp.toFixed(2), lp.toFixed(2), JSON.stringify(r));
});
await browser.close();
