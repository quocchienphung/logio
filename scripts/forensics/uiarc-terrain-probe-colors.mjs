import { chromium } from 'playwright';
// What does the browser's canvas make of the oklab/oklch colours the preview uses? (Nominal tones at t = 0, 0.5, 1.)
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.setContent('<canvas id=c width=1 height=1></canvas>');
  const out = await page.evaluate(() => {
    const ctx = document.getElementById('c').getContext('2d', { willReadFrequently: true });
    const px = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)); };
    const rows = {};
    for (const [name, c] of Object.entries({ lightLow: 'oklab(0.899 0 0)', lightTone: 'oklch(0.33 0 0)', lightMid: 'color-mix(in oklab, oklch(0.33 0 0) 50%, oklab(0.899 0 0))', danger: 'oklch(0.54 0.21 25)', dangerMix50: 'color-mix(in oklab, oklch(0.54 0.21 25) 50%, oklab(0.899 0 0))', darkLow: 'oklab(0.33 0 0)', darkTone: 'oklch(0.8 0 0)', darkDanger: 'oklch(0.76 0.2 25)', platform: 'oklch(0.978 0 0)', darkPlatform: 'oklch(0.215 0 0)', textMuted: 'oklch(0.59 0 0)', darkMuted: 'oklch(0.64 0 0)', fg: 'oklch(0.15 0 0)' })) rows[name] = px(c);
    return rows;
  });
  console.log(JSON.stringify(out));
} finally { await browser.close(); }
