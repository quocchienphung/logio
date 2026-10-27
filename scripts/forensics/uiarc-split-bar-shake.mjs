import { chromium } from 'playwright';

// Where does the "refusal shake" of the last visible legend item live? Samples every element of the legend for transforms and Web Animations. Rendered output only.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/split-bar', { waitUntil: 'networkidle' });
const figure = page.locator('figure').first();
await figure.scrollIntoViewIfNeeded();
await page.waitForTimeout(2000);
const items = figure.locator('[class*="legendItem"]');
for (let i = 1; i < 6; i++) { await items.nth(i).click(); await page.waitForTimeout(250); }
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__s = [];
  const li = document.querySelector('figure [class*="legendItem"]');
  const t0 = performance.now();
  const tick = () => {
    const els = [li, ...li.querySelectorAll('*')];
    window.__s.push({ t: Math.round(performance.now() - t0), items: els.map(e => `${e.className?.baseVal ?? e.className}`.slice(0, 24) + ' ' + (e.style.transform || '') + ' ' + getComputedStyle(e).transform), anims: li.getAnimations({ subtree: true }).map(a => ({ id: a.id, timing: a.effect?.getTiming(), kf: a.effect?.getKeyframes() })) });
    if (performance.now() - t0 < 900) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await items.nth(0).click();
await page.waitForTimeout(1200);
const s = await page.evaluate(() => window.__s);
const changed = s.filter((x, i) => i === 0 || JSON.stringify(x.items) !== JSON.stringify(s[i - 1].items));
console.log('frames', s.length, 'distinct', changed.length);
console.log(changed.slice(0, 30).map(x => x.t + 'ms ' + x.items.filter(v => !/ none none$| $/.test(v) && !/matrix\(1, 0, 0, 1, 0, 0\)$/.test(v)).join(' || ')).join('\n'));
console.log(JSON.stringify(s.find(x => x.anims.length)?.anims ?? 'no WAAPI animations'));
await browser.close();
