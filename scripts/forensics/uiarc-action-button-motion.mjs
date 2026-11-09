import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Records, frame by frame, what the public Action button preview paints (state, width, label letters, icon phases, press scale) while real input drives it.
// Rendered output only: no API, registry, CLI, install command or Pro source. Raw traces go to UIARC_TRACES (outside the repository).
const traces = process.env.UIARC_TRACES;
if (!traces) throw new Error('Set UIARC_TRACES to a folder outside the repository.');
await fs.mkdir(traces, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

const install = () => {
  window.__frames = []; window.__rec = false; window.__t0 = 0; window.__anims = {};
  const read = () => {
    const btn = document.querySelector('[class*="action-button_button"]'), rect = btn.getBoundingClientRect(), cs = getComputedStyle(btn);
    const morph = btn.querySelector('[class*="action-button_morph"]'), slot = btn.querySelector('[class*="action-button_iconSlot"]');
    const kids = el => [...el.children].map(k => { const s = getComputedStyle(k); return { cls: String(k.className).replace(/_[A-Za-z0-9_-]{5}$/, '').slice(0, 28), text: k.children.length ? undefined : k.textContent.slice(0, 14), opacity: s.opacity, filter: s.filter, transform: s.transform, width: Math.round(k.getBoundingClientRect().width * 10) / 10 }; });
    const label = morph.querySelector('[class*="action-button_label"]'), phases = [...slot.querySelectorAll('[class*="action-button_phase"]')];
    return {
      state: btn.dataset.state, busy: btn.getAttribute('aria-busy'), width: Math.round(rect.width * 100) / 100, height: rect.height, transform: cs.transform, shadow: cs.boxShadow, bg: cs.backgroundColor,
      morphWidth: Math.round(morph.getBoundingClientRect().width * 100) / 100, labelKids: label ? kids(label) : [], morphKids: kids(morph).map(k => ({ ...k })),
      phases: phases.map(ph => { const s = getComputedStyle(ph), svg = ph.querySelector('svg'), path = svg?.querySelector('path'); return { svg: svg ? String(svg.getAttribute('class')).replace(/\S*lucide\S*\s*/g, '').replace(/_[A-Za-z0-9_-]{5}/g, '').slice(0, 30) : null, opacity: s.opacity, filter: s.filter, transform: s.transform, dash: path ? getComputedStyle(path).strokeDasharray : null, pathTf: path ? getComputedStyle(path).transform : null, svgTf: svg ? getComputedStyle(svg).transform : null }; }),
      status: btn.querySelector('[role="status"]')?.textContent, hasFocus: document.activeElement === btn,
    };
  };
  const tick = t => { if (window.__rec) window.__frames.push({ t: Math.round((t - window.__t0) * 100) / 100, ...read() }); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__mark = () => { window.__t0 = performance.now(); window.__frames = []; window.__rec = true; };
};

const only = process.env.ONLY?.split(',');
async function scenario(name, act, ms = 6000) {
  if (only && !only.includes(name)) return;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/action-button', { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: `(${install})()` });
  const button = page.locator('[class*="action-button_button"]').first();
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__mark());
  await page.waitForTimeout(150);
  const now = () => page.evaluate(() => performance.now() - window.__t0);
  const marks = await act(page, button, now);
  await page.waitForTimeout(ms);
  const frames = await page.evaluate(() => { window.__rec = false; return window.__frames; });
  await fs.writeFile(`${traces}/action-${name}.json`, JSON.stringify({ marks: marks ?? {}, frames }));
  console.log(name, frames.length, 'frames');
  await page.close();
}

try {
  // the whole cycle: press, pending, success, back to idle
  await scenario('cycle', async (p, b, now) => { const box = await b.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(400); const m = { down: await now() }; await p.mouse.down(); await p.waitForTimeout(90); m.up = await now(); await p.mouse.up(); return m; }, 7000);
  // keyboard
  await scenario('keyboard', async (p, b, now) => { await b.focus(); await p.waitForTimeout(300); const m = { down: await now() }; await p.keyboard.press('Enter'); return m; }, 6000);
  // the press alone: hold the pointer down, slide off and release outside so nothing fires
  await scenario('press-hold', async (p, b, now) => { const box = await b.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(500); const m = { down: await now() }; await p.mouse.down(); await p.waitForTimeout(900); m.leave = await now(); await p.mouse.move(box.x + box.width / 2, box.y - 120, { steps: 3 }); await p.waitForTimeout(100); await p.mouse.up(); return m; }, 1500);
  // hover in and out
  await scenario('hover', async (p, b, now) => { const box = await b.boundingBox(); await p.mouse.move(5, 5); await p.waitForTimeout(300); const m = { in: await now() }; await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 }); await p.waitForTimeout(900); m.out = await now(); await p.mouse.move(5, 5, { steps: 4 }); return m; }, 1200);
  // a second press while pending and while success shows
  await scenario('double', async (p, b, now) => { const box = await b.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); const m = { first: await now() }; await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(120); m.second = await now(); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); return m; }, 6000);
} finally { await browser.close(); }
