// Browser QA of editing and deleting skills on /skilled: Save changes (Action button) and Delete (Confirm morph, hold) against the real workspace storage.
//   node scripts/qa/skilled-edit-delete.mjs [base-url]          output: docs/research/skilled-edit-delete/qa/
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/skilled-edit-delete/qa';
await fs.mkdir(out, { recursive: true });
const results = [], errors = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(ok ? 'ok  ' : 'FAIL', name, detail); if (!ok) process.exitCode = 1; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function open(browser, { width = 1440, height = 1000, dark = false, reduced = false, touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light', reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error).slice(0, 300)));
  page.on('console', message => { if (message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text())) errors.push(message.text().slice(0, 300)); });
  await page.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
  if (dark) await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  await page.getByRole('region', { name: 'Skilled workspace' }).waitFor({ timeout: 30000 });
  return { context, page };
}
const addSkill = async (page, name, body = 'Check every claim against a source.') => {
  await page.getByLabel('Skill instructions', { exact: true }).fill(body);
  await page.getByLabel('Skill name', { exact: true }).fill(name);
  await page.getByLabel('Description', { exact: true }).fill('Use when facts must be verified.');
  await page.getByRole('button', { name: 'Add skill', exact: true }).click();
  await page.locator('.sk-card', { hasText: name }).first().waitFor();
};
const card = (page, name) => page.locator('.sk-card', { hasText: name }).first();
// the page cannot run Playwright's :has-text, so the card under test is marked and sampled through the mark
const mark = async target => { await target.evaluate(el => { document.querySelectorAll('[data-qa]').forEach(n => n.removeAttribute('data-qa')); el.dataset.qa = 'target'; }); };
const stored = page => page.evaluate(() => { const key = Object.keys(localStorage).find(k => /skill-library/.test(k)); return key ? JSON.parse(localStorage.getItem(key) ?? '[]') : null; });
const names = async page => (await stored(page) ?? []).map(skill => skill.name);
const sha = (page, text) => page.evaluate(async t => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))), b => b.toString(16).padStart(2, '0')).join(''), text);

// samples the Action button / Confirm morph every frame for `ms` and returns [{t, ...}]
async function sample(page, selector, ms, read) {
  await page.evaluate(`((selector, ms) => { window.__s = []; const t0 = performance.now(); const read = ${read}; const tick = () => { const el = document.querySelector(selector); if (el) window.__s.push({ t: performance.now() - t0, ...read(el) }); if (performance.now() - t0 < ms) requestAnimationFrame(tick); }; requestAnimationFrame(tick); })(${JSON.stringify(selector)}, ${ms})`);
}
const collect = page => page.evaluate(() => window.__s);

function fitOmega(series) {
  const v0 = series[0].v, vEnd = series.at(-1).v, total = vEnd - v0;
  const startAt = series.findIndex(p => Math.abs(p.v - v0) > Math.abs(total) * 0.01);
  if (startAt < 0 || Math.abs(total) < 2) return null;
  const start = series[startAt].t / 1000;
  let best = { w: 0, err: Infinity };
  for (let w = 4; w <= 60; w += 0.2) { let err = 0, n = 0; for (const p of series) { const t = p.t / 1000 - start; if (t < 0) continue; err += ((1 - (1 + w * t) * Math.exp(-w * t)) - (p.v - v0) / total) ** 2; n++; } if (n && err / n < best.err) best = { w, err: err / n }; }
  return { omega: best.w, rms: Math.sqrt(best.err) };
}

const chrome = await chromium.launch({ channel: 'chrome' });
try {
  // ================================================================== light desktop, the whole flow
  {
    const { context, page } = await open(chrome);
    await addSkill(page, 'claim-checker');
    await addSkill(page, 'second-skill');
    await page.mouse.move(5, 5);
    const first = card(page, 'claim-checker');
    check('A skill card offers Deliver, Edit, Archive and Delete', await first.getByRole('button', { name: 'Deliver', exact: true }).count() === 1 && await first.getByRole('button', { name: 'Edit claim-checker' }).count() === 1 && await first.getByRole('button', { name: 'Archive claim-checker' }).count() === 1 && await first.getByRole('button', { name: 'Delete claim-checker' }).count() === 1);
    await page.screenshot({ path: `${out}/01-card-actions.png`, clip: await page.locator('.sk-cards').boundingBox() });

    // ---------------------------------------------------------------- edit
    await first.getByRole('button', { name: 'Edit claim-checker' }).click();
    await sleep(700);
    const area = first.locator('.sk-editor__text'), save = first.locator('.sk-editor .ab');
    check('Edit opens the card on the stored SKILL.md', await area.inputValue().then(v => v.startsWith('---\nname: claim-checker')));
    check('Save changes starts disabled (nothing changed) and says everything is saved', await save.getAttribute('aria-disabled') === 'true' && (await first.locator('.sk-editor__dirty').innerText()).includes('Everything is saved'));
    await area.click(); await page.keyboard.press('Control+End'); await page.keyboard.type('\nAlso list what you could not verify.');
    check('Typing marks the draft unsaved and enables Save changes', await save.getAttribute('aria-disabled') === null && (await first.locator('.sk-editor__dirty').innerText()).includes('Unsaved'));
    check('The header is read live: name, size and the checksum note', (await first.locator('.sk-editor__status').innerText()).includes('claim-checker') && (await first.locator('.sk-editor__status').innerText()).includes('checksum'));
    await page.screenshot({ path: `${out}/02-editor.png`, clip: await first.boundingBox() });

    // a broken header is explained and cannot be saved
    const good = await area.inputValue();
    await area.fill(good.replace('name: claim-checker', 'name: Bad Name'));
    check('A broken header says why and keeps Save changes off', (await first.locator('.sk-editor__status').innerText()).toLowerCase().includes('lowercase') && await save.getAttribute('aria-disabled') === 'true' && await area.getAttribute('aria-invalid') === 'true');
    await area.fill(good);

    // the save itself: pending, then Saved, and the workspace really holds the new text with a new checksum
    await page.evaluate(() => { document.__abStates = []; const el = document.querySelector('.sk-editor .ab'); new MutationObserver(() => document.__abStates.push(el.dataset.state + '|' + el.getAttribute('aria-busy'))).observe(el, { attributes: true, attributeFilter: ['data-state', 'aria-busy'] }); });
    await sample(page, '.sk-editor .ab', 4800, '(el) => ({ v: el.getBoundingClientRect().width, state: el.dataset.state, label: el.querySelector(".ab__label")?.textContent })');
    const before = (await stored(page)).find(s => s.name === 'claim-checker');
    await save.click();
    await sleep(900);
    check('The button shows Saved with a drawn check on the button itself', await save.getAttribute('data-state') === 'success' && (await save.innerText()).includes('Saved'));
    await page.screenshot({ path: `${out}/03-saved.png`, clip: await first.boundingBox() });
    const after = (await stored(page)).find(s => s.name === 'claim-checker');
    check('The workspace holds the edited text', after.instructions.includes('Also list what you could not verify.') && after.instructions !== before.instructions);
    check('The checksum and size were recalculated to match', after.sha256 === await sha(page, after.instructions) && after.sha256 !== before.sha256 && after.bytes === (await page.evaluate(t => new TextEncoder().encode(t).length, after.instructions)));
    check('Identity and provenance are kept (id, date added, target)', after.id === before.id && after.importedAt === before.importedAt && after.target === before.target);
    check('The draft is clean again after saving', (await first.locator('.sk-editor__dirty').innerText()).includes('Everything is saved') && await save.getAttribute('aria-disabled') === 'true');
    await sleep(3600);
    const frames = await collect(page);
    const states = await page.evaluate(() => document.__abStates);
    check('The button went pending -> success -> idle, kept focus semantics (aria-busy, not disabled)', states.some(s => s === 'pending|true') && states.some(s => s.startsWith('success')) && states.at(-1)?.startsWith('idle'), states.join(' > '));
    const successAt = frames.find(f => f.state === 'success')?.t, idleAt = frames.find(f => f.t > (successAt ?? 1e9) && f.state === 'idle')?.t;
    check('Success stays about 2.4 s before the button returns to idle (measured 2.40 s)', successAt !== undefined && idleAt !== undefined && Math.abs((idleAt - successAt) - 2400) < 250, `${Math.round(idleAt - successAt)} ms`);
    const grow = frames.filter(f => f.t >= idleAt - 50 && f.t < idleAt + 700).map(f => ({ t: f.t - idleAt, v: f.v }));
    const fit = fitOmega(grow);
    check('The width springs back on the measured spring (critical, about 27 rad/s)', fit && fit.omega > 15 && fit.omega < 45 && fit.rms < 0.06, fit ? `omega ${fit.omega.toFixed(1)}, rms ${fit.rms.toFixed(3)}, ${grow.length} frames, ${Math.round(grow[0]?.v)} -> ${Math.round(grow.at(-1)?.v)} px: ${grow.filter((_, i) => i % 4 === 0).map(p => Math.round(p.t) + ':' + Math.round(p.v)).join(' ')}` : 'no motion');

    // Ctrl+S saves too, and a rename follows the header
    await area.click(); await page.keyboard.press('Control+End'); await page.keyboard.type('\nSecond edit.');
    await page.keyboard.press('Control+s'); await sleep(900);
    check('Ctrl+S saves', (await stored(page)).find(s => s.name === 'claim-checker').instructions.includes('Second edit.'));
    await area.fill((await area.inputValue()).replace('name: claim-checker', 'name: claim-checker-v2'));
    await save.click(); await sleep(900);
    check('Changing the name in the header renames the skill everywhere', (await names(page)).includes('claim-checker-v2') && !(await names(page)).includes('claim-checker') && await page.locator('.sk-card-title button span', { hasText: 'claim-checker-v2' }).count() === 1);

    // a name another active skill uses is refused, in words, and the button returns to idle
    await area.fill((await area.inputValue()).replace('name: claim-checker-v2', 'name: second-skill'));
    await save.click(); await sleep(700);
    check('A clashing name is refused with the reason, and the button is idle again', (await first.locator('.sk-editor__error').innerText()).includes('already named second-skill') && await save.getAttribute('data-state') === 'idle');
    check('Nothing was stored for the refused edit', (await names(page)).filter(n => n === 'second-skill').length === 1 && (await names(page)).includes('claim-checker-v2'));
    await area.fill((await area.inputValue()).replace('name: second-skill', 'name: claim-checker-v2'));
    await first.getByRole('button', { name: 'Done' }).click(); await sleep(500);
    check('Done closes the editor', await first.locator('.sk-editor').count() === 0);
    await context.close();
  }

  // ================================================================== delete (hold), light desktop
  {
    const { context, page } = await open(chrome);
    await addSkill(page, 'alpha-skill'); await addSkill(page, 'beta-skill'); await addSkill(page, 'gamma-skill');
    await page.mouse.move(5, 5);
    const order = await names(page);
    const target = card(page, 'beta-skill'), trigger = target.getByRole('button', { name: 'Delete beta-skill' });
    await mark(target);
    await trigger.click(); await sleep(900);
    check('Delete morphs into an inline question with Cancel and a hold-to-confirm button', await target.locator('.cm[data-state="confirming"]').count() === 1 && (await target.locator('.cm__prompt').innerText()).includes('Delete this skill?') && await target.locator('.cm__confirm').getAttribute('aria-describedby') !== null && (await target.locator('.cm .cm__sr').first().innerText()).includes('Press and hold'));
    check('Confirm takes focus (so Enter answers) and the control is a labelled group', await target.locator('.cm__confirm').evaluate(el => el === document.activeElement) && await target.locator('.cm__face[role="group"]').count() === 1);
    await page.screenshot({ path: `${out}/04-delete-question.png`, clip: await target.boundingBox() });
    await page.keyboard.press('Escape'); await sleep(800);
    check('Escape cancels the question and focus returns to the button', await target.locator('.cm[data-state="idle"]').count() === 1 && await trigger.evaluate(el => el === document.activeElement) && (await names(page)).includes('beta-skill'));
    await trigger.click(); await sleep(900); await page.mouse.click(5, 5); await sleep(700);
    check('A press outside cancels the question', await target.locator('.cm[data-state="idle"]').count() === 1);

    // a quick click does nothing in hold mode
    await trigger.click(); await sleep(700);
    await target.locator('.cm__confirm').click({ delay: 60 }); await sleep(500);
    check('A quick click does not delete in hold mode', (await names(page)).includes('beta-skill') && await target.locator('.cm[data-state="confirming"]').count() === 1);

    // the fill is a straight line over one second; released early it drains back
    const box = await target.locator('.cm__confirm').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await sample(page, '[data-qa="target"] .cm__fill', 1800, '(el) => ({ v: 100 - parseFloat((/inset\\([^ ]+ ([\\d.e-]+)%/.exec(el.style.clipPath) || [])[1] ?? 100) })');
    await sleep(60); await page.mouse.down(); await sleep(420); await page.mouse.up(); await sleep(900);
    const early = await collect(page);
    const peak = Math.max(...early.map(p => p.v));
    check('Letting go early deletes nothing, and the fill drains back to empty', (await names(page)).includes('beta-skill') && early.at(-1).v < 0.5 && peak > 25 && peak < 60, `peak ${peak.toFixed(1)} %, end ${early.at(-1).v.toFixed(2)} %`);
    await sleep(300);
    await sample(page, '[data-qa="target"] .cm__fill', 2600, '(el) => ({ v: 100 - parseFloat((/inset\\([^ ]+ ([\\d.e-]+)%/.exec(el.style.clipPath) || [])[1] ?? 100) })');
    await sleep(60); await page.mouse.down(); await sleep(1500);
    await page.mouse.up();
    const full = await collect(page);
    const rise = full.filter(p => p.v > 4 && p.v < 96), t0 = rise[0].t;
    const slope = (rise.at(-1).v - rise[0].v) / (rise.at(-1).t - rise[0].t);
    const mid = full.filter(p => p.v > 20 && p.v < 80), lin = Math.sqrt(mid.reduce((a, p) => a + (p.v - (rise[0].v + slope * (p.t - t0))) ** 2, 0) / mid.length);
    check('The hold fill is a straight line that takes one second (measured 0.1 %/ms)', slope > 0.085 && slope < 0.115 && lin < 2.5, `${(slope * 1000).toFixed(0)} %/s, deviation ${lin.toFixed(2)} %`);
    await sleep(500);
    check('Holding the full second deletes the skill from the workspace at once', !(await names(page)).includes('beta-skill') && (await names(page)).join() === order.filter(n => n !== 'beta-skill').join());
    const ghost = page.locator('.sk-card[data-deleted]');
    check('The card stays in place showing Deleted and Undo', await ghost.count() === 1 && (await ghost.locator('.cm__statusText').innerText()) === 'Deleted' && await ghost.getByRole('button', { name: 'Undo' }).count() === 1 && (await page.locator('.sk-card-title button span').allInnerTexts()).join() === order.join());
    await page.screenshot({ path: `${out}/05-deleted-undo.png`, clip: await page.locator('.sk-cards').boundingBox() });
    check('Undo is focused so a keyboard user can take it back', await ghost.getByRole('button', { name: 'Undo' }).evaluate(el => el === document.activeElement));

    // undo restores it to its old place, in storage
    await ghost.getByRole('button', { name: 'Undo' }).click(); await sleep(1500);
    check('Undo puts the skill back in its old place, in the workspace', (await names(page)).join() === order.join() && await page.locator('.sk-card[data-deleted]').count() === 0);
    check('The restored card is a normal card again with its delete button at rest', await card(page, 'beta-skill').locator('.cm[data-state="idle"]').count() === 1 && await card(page, 'beta-skill').getByRole('button', { name: 'Edit beta-skill' }).count() === 1);

    // delete again with the keyboard (Enter held), then let the result settle
    const trigger2 = card(page, 'beta-skill').getByRole('button', { name: 'Delete beta-skill' });
    await trigger2.focus(); await page.keyboard.press('Enter'); await sleep(900);
    check('Enter on the button opens the question with Confirm focused', await card(page, 'beta-skill').locator('.cm__confirm').evaluate(el => el === document.activeElement));
    await page.keyboard.down('Enter'); await sleep(450); await page.keyboard.up('Enter'); await sleep(800);
    check('Letting go of Enter early does not delete', (await names(page)).includes('beta-skill'));
    await page.keyboard.down('Enter'); await sleep(1400); await page.keyboard.up('Enter'); await sleep(600);
    check('Holding Enter for a second deletes', !(await names(page)).includes('beta-skill'));
    await page.mouse.move(5, 5);
    await sleep(8800);
    check('After the result has been shown for a while the card leaves, and the skill stays deleted', await page.locator('.sk-card', { hasText: 'beta-skill' }).count() === 0 && !(await names(page)).includes('beta-skill'));
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('region', { name: 'Skilled workspace' }).waitFor();
    check('A deletion survives a reload', await page.locator('.sk-card', { hasText: 'beta-skill' }).count() === 0 && await page.locator('.sk-card', { hasText: 'alpha-skill' }).count() === 1);
    await context.close();
  }

  // ================================================================== the pill's springs against the measured ones
  {
    const { context, page } = await open(chrome);
    await addSkill(page, 'spring-skill'); await page.mouse.move(5, 5);
    const target = card(page, 'spring-skill');
    await mark(target);
    await sample(page, '[data-qa="target"] .cm__surface', 1500, '(el) => ({ v: el.getBoundingClientRect().width })');
    await sleep(150); await target.getByRole('button', { name: 'Delete spring-skill' }).click(); await sleep(1300);
    const grow = await collect(page), growStart = grow.findIndex(p => Math.abs(p.v - grow[0].v) > 1);
    const fit = fitOmega(grow.slice(Math.max(0, growStart - 1)).map((p, _, a) => ({ t: p.t - a[0].t, v: p.v })));
    check('The pill grows on the slower measured spring (critical, about 12.6 rad/s)', fit && fit.omega > 9 && fit.omega < 17 && fit.rms < 0.05, fit ? `omega ${fit.omega.toFixed(1)}, rms ${fit.rms.toFixed(3)}, ${Math.round(grow[0].v)} -> ${Math.round(grow.at(-1).v)} px` : 'no motion');
    await sample(page, '[data-qa="target"] .cm__surface', 1500, '(el) => ({ v: el.getBoundingClientRect().width })');
    await sleep(150); await target.getByRole('button', { name: 'Cancel' }).click(); await sleep(1300);
    const shrink = await collect(page), shrinkStart = shrink.findIndex(p => Math.abs(p.v - shrink[0].v) > 1);
    const fit2 = fitOmega(shrink.slice(Math.max(0, shrinkStart - 1)).map((p, _, a) => ({ t: p.t - a[0].t, v: p.v })));
    check('...and shrinks on the faster one (critical, about 16 rad/s)', fit2 && fit2.omega > 11 && fit2.omega < 23 && fit2.rms < 0.05, fit2 ? `omega ${fit2.omega.toFixed(1)}, rms ${fit2.rms.toFixed(3)}` : 'no motion');
    check('The pill is 32 px tall in a card row', Math.round((await target.locator('.cm__surface').boundingBox()).height) === 32);
    await context.close();
  }

  // ================================================================== a failing save shows on the button
  {
    const { context, page } = await open(chrome);
    await addSkill(page, 'failing-skill'); await page.mouse.move(5, 5);
    const first = card(page, 'failing-skill');
    await first.getByRole('button', { name: 'Edit failing-skill' }).click(); await sleep(700);
    const area = first.locator('.sk-editor__text'); await area.click(); await page.keyboard.press('Control+End'); await page.keyboard.type('\nx');
    // the browser store rejects the write (quota): the button must not claim Saved
    await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (/skill-library/.test(key)) throw new DOMException('quota', 'QuotaExceededError'); return original.call(this, key, value); }; });
    await first.locator('.sk-editor .ab').click(); await sleep(4000);
    const state = await first.locator('.sk-editor .ab').getAttribute('data-state');
    check('If the workspace cannot store the change the button does not say Saved', state !== 'success', `state ${state}`);
    await context.close();
  }

  // ================================================================== dark, phone, reduced motion
  {
    const { context, page } = await open(chrome, { dark: true });
    await addSkill(page, 'dark-skill'); await page.mouse.move(5, 5);
    const target = card(page, 'dark-skill');
    await target.getByRole('button', { name: 'Edit dark-skill' }).click(); await sleep(700);
    await page.screenshot({ path: `${out}/06-dark-editor.png`, clip: await target.boundingBox() });
    await target.getByRole('button', { name: 'Done' }).click(); await sleep(500);
    await target.getByRole('button', { name: 'Delete dark-skill' }).click(); await sleep(900);
    const box = await target.locator('.cm__confirm').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await sleep(560);
    const fill = await target.locator('.cm__fill').evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }));
    await page.screenshot({ path: `${out}/07-dark-hold.png`, clip: await target.boundingBox() });
    const lightness = css => Number((/lab\(([\d.]+)/.exec(css) ?? /oklch\(([\d.]+)/.exec(css) ?? [])[1]) / (css.startsWith('oklch') ? 1 : 100);
    check('Dark theme: the fill is the light danger colour with dark text', Math.abs(lightness(fill.bg) - 0.7) < 0.1 && lightness(fill.fg) < 0.15, JSON.stringify(fill));
    await page.mouse.up(); await context.close();
  }
  {
    const { context, page } = await open(chrome, { width: 390, height: 844, touch: true });
    await addSkill(page, 'phone-skill'); const target = card(page, 'phone-skill');
    await target.getByRole('button', { name: 'Edit phone-skill' }).tap(); await sleep(700);
    check('Phone: the editor fits without horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/08-phone-editor.png`, clip: await target.boundingBox() });
    await target.getByRole('button', { name: 'Done' }).tap(); await sleep(500);
    await target.getByRole('button', { name: 'Delete phone-skill' }).tap(); await sleep(900);
    check('Phone: the question fits without horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/09-phone-question.png`, clip: await target.boundingBox() });
    const confirm = await target.locator('.cm__confirm').boundingBox();
    // a touch hold: the page must not select text or open a menu, and one second deletes
    const client = await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: confirm.x + confirm.width / 2, y: confirm.y + confirm.height / 2 }] });
    await sleep(1300);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(800);
    check('Phone: holding the confirm button with a finger for a second deletes', await page.locator('.sk-card[data-deleted]').count() === 1);
    await context.close();
  }
  {
    const { context, page } = await open(chrome, { reduced: true });
    await addSkill(page, 'calm-skill'); await page.mouse.move(5, 5);
    const target = card(page, 'calm-skill');
    await mark(target);
    await sample(page, '[data-qa="target"] .cm__surface', 900, '(el) => ({ v: el.getBoundingClientRect().width })');
    await sleep(150); await target.getByRole('button', { name: 'Delete calm-skill' }).click(); await sleep(700);
    const frames = await collect(page), w0 = frames[0].v, wEnd = frames.at(-1).v, moving = frames.filter(p => p.v > w0 + 1 && p.v < wEnd - 1).length;
    check('Reduced motion: the pill lands in one step', wEnd > w0 + 30 && moving <= 1, `${Math.round(w0)} -> ${Math.round(wEnd)} px, ${moving} frames in between`);
    const box = await target.locator('.cm__confirm').boundingBox();
    await sleep(400); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await sleep(520);
    const part = await target.locator('.cm__fill').evaluate(el => el.style.clipPath);
    check('Reduced motion: the hold fill still shows progress', /inset\(0px ([1-9]\d?\.?\d*)%/.test(part) && !part.includes('100%'), part);
    await page.mouse.up(); await context.close();
  }
  check('No console errors', errors.length === 0, errors.join(' | '));
} finally {
  await chrome.close();
  await fs.writeFile(`${out}/qa-results.json`, JSON.stringify({ ran: new Date().toISOString(), base, results }, null, 2));
  console.log(`${results.filter(r => r.ok).length}/${results.length} checks passed`);
}
