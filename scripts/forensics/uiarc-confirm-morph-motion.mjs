import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Records, frame by frame, what the public Confirm morph preview paints (pill width, faces, parts, hold fill, check, state) while real input drives it.
// Rendered output only: no API, registry, CLI, install command or Pro source. Raw traces go to UIARC_TRACES (outside the repository).
const traces = process.env.UIARC_TRACES;
if (!traces) throw new Error('Set UIARC_TRACES to a folder outside the repository.');
await fs.mkdir(traces, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

const install = () => {
  window.__frames = []; window.__rec = false; window.__t0 = 0;
  const num = value => (value === '' || value == null ? null : Number(value));
  const read = () => {
    const root = document.querySelector('[class*="confirm-morph_root"]'), surface = root.querySelector('[class*="confirm-morph_surface"]');
    const faces = [...surface.querySelectorAll('[class*="confirm-morph_face"]')].map(face => ({
      face: face.dataset.face, opacity: getComputedStyle(face).opacity, transform: getComputedStyle(face).transform,
      parts: [...face.querySelectorAll('[class*="confirm-morph_part"]')].map(part => {
        const s = getComputedStyle(part), text = part.textContent.trim().slice(0, 24);
        // the first time a part is seen, what its Web Animations are (when motion drives it that way)
        if (!(window.__anims ??= {})[face.dataset.face + ':' + text]) window.__anims[face.dataset.face + ':' + text] = part.getAnimations().map(a => ({ timing: a.effect?.getTiming(), kf: a.effect?.getKeyframes() }));
        return { text, opacity: s.opacity, filter: s.filter, transform: s.transform };
      }),
    }));
    const fill = root.querySelector('[class*="confirm-morph_fill"]'), check = root.querySelector('[class*="confirm-morph_check"]');
    const m = /inset\(([\d.e-]+)(?:px|%)? ([\d.e-]+)%/.exec(fill?.style.clipPath ?? '');
    const path = check?.querySelector('path, circle');
    return {
      state: root.dataset.state, face: root.dataset.face, width: Math.round(surface.getBoundingClientRect().width * 100) / 100, height: Math.round(surface.getBoundingClientRect().height * 100) / 100,
      faces, fillRight: m ? num(m[2]) : null, fillRaw: fill?.style.clipPath ?? null,
      check: check ? { transform: getComputedStyle(check).transform, opacity: getComputedStyle(check).opacity, dash: path ? getComputedStyle(path).strokeDashoffset : null, kids: [...check.children].map(k => `${k.tagName} ${k.getAttribute('style') ?? ''} ${getComputedStyle(k).strokeDashoffset}`) } : null,
      live: root.querySelector('[role="status"]')?.textContent, focus: document.activeElement?.className?.toString().replace(/_[A-Za-z0-9_-]{5}$/, '').slice(0, 40), srcFocusText: document.activeElement?.textContent?.trim().slice(0, 12),
    };
  };
  const tick = t => { if (window.__rec) window.__frames.push({ t: Math.round((t - window.__t0) * 100) / 100, ...read() }); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__mark = () => { window.__t0 = performance.now(); window.__frames = []; window.__rec = true; };
};

const only = process.env.ONLY?.split(',');
async function scenario(name, setup, act, ms = 3000) {
  if (only && !only.includes(name)) return;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/confirm-morph', { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: `(${install})()` });
  await page.locator('[class*="preview-shell_shell"]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  if (setup) await setup(page);
  await page.evaluate(() => window.__mark());
  await page.waitForTimeout(120);
  const input = await page.evaluate(() => performance.now() - window.__t0);
  const marks = await act(page);
  await page.waitForTimeout(ms);
  const frames = await page.evaluate(() => { window.__rec = false; return window.__frames; });
  const anims = await page.evaluate(() => window.__anims ?? {});
  await fs.writeFile(`${traces}/confirm-${name}.json`, JSON.stringify({ input, marks: marks ?? {}, anims, frames }));
  console.log(name, frames.length, 'frames');
  await page.close();
}
const trigger = p => p.locator('[class*="confirm-morph_trigger"]').first();
const confirmButton = p => p.locator('[class*="confirm-morph_confirm"]').first();
const mode = name => p => p.getByRole('button', { name, exact: true }).click().then(() => p.waitForTimeout(500));
const now = p => p.evaluate(() => performance.now() - window.__t0);
const holdCenter = async p => { const b = await confirmButton(p).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const toConfirming = async p => { await trigger(p).click(); await p.waitForTimeout(1200); };

try {
  // opening the question, and cancelling it
  await scenario('open-hold', mode('Hold'), async p => { const m = { click: await now(p) }; await trigger(p).click(); return m; }, 2000);
  await scenario('cancel', async p => { await mode('Hold')(p); await toConfirming(p); }, async p => { const m = { click: await now(p) }; await p.locator('[class*="confirm-morph_secondary"]').first().click(); return m; }, 2000);
  // holding all the way, in the succeeding and failing demos
  for (const outcome of ['Succeeds', 'Fails']) {
    await scenario(`hold-full-${outcome.toLowerCase()}`, async p => { await mode('Hold')(p); await mode(outcome)(p); await toConfirming(p); }, async p => {
      const c = await holdCenter(p); await p.mouse.move(c.x, c.y); const m = { down: await now(p) }; await p.mouse.down(); await p.waitForTimeout(3500); m.up = await now(p); await p.mouse.up(); return m;
    }, 4500);
  }
  // letting go early, at several moments: the fill drains back
  for (const hold of [250, 600, 1000]) {
    await scenario(`hold-release-${hold}`, async p => { await mode('Hold')(p); await toConfirming(p); }, async p => {
      const c = await holdCenter(p); await p.mouse.move(c.x, c.y); const m = { down: await now(p) }; await p.mouse.down(); await p.waitForTimeout(hold); m.up = await now(p); await p.mouse.up(); return m;
    }, 2000);
  }
  // keyboard hold on Confirm (Enter held)
  await scenario('hold-keyboard', async p => { await mode('Hold')(p); await toConfirming(p); }, async p => {
    const m = { down: await now(p) }; await p.keyboard.down('Enter'); await p.waitForTimeout(3500); m.up = await now(p); await p.keyboard.up('Enter'); return m;
  }, 3000);
  // the result: Undo, then restoring
  await scenario('undo', async p => { await mode('Hold')(p); await mode('Succeeds')(p); await toConfirming(p); const c = await holdCenter(p); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.waitForTimeout(3000); await p.mouse.up(); await p.waitForTimeout(800); }, async p => {
    const m = { click: await now(p) }; await p.locator('[class*="confirm-morph_secondary"]').first().click(); return m;
  }, 3500);
  // the failure face and Retry
  await scenario('retry', async p => { await mode('Hold')(p); await mode('Fails')(p); await toConfirming(p); const c = await holdCenter(p); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.waitForTimeout(3000); await p.mouse.up(); await p.waitForTimeout(800); }, async p => {
    const m = { click: await now(p) }; await p.locator('[class*="confirm-morph_face"] button').last().click(); return m;
  }, 4500);
  // how long an unanswered question stays, and how long a result stays (no input, no hover on the control)
  await scenario('question-timeout', mode('Hold'), async p => { const m = { click: await now(p) }; await trigger(p).click(); await p.mouse.move(5, 5); return m; }, 14000);
  await scenario('result-timeout', async p => { await mode('Hold')(p); await mode('Succeeds')(p); await toConfirming(p); const c = await holdCenter(p); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.waitForTimeout(3000); await p.mouse.up(); await p.mouse.move(5, 5); }, async () => ({}), 14000);
} finally { await browser.close(); }
