// QA of the Writing Assistant card inside the Guide me selector (Agent Chat frame).
// Usage: node scripts/qa/writing-assistant.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/writing-assistant/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], passed = [], external = new Set();
const check = async (name, fn) => { await fn(); passed.push(name); console.log(`PASS ${name}`); };
const url = `${base}/personalize?browse=1&group=agent-chat`;

async function open(context, query = url) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  page.on('request', request => { const u = new URL(request.url()); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && u.protocol.startsWith('http')) external.add(request.url()); });
  await page.goto(query, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(800);
  return page;
}
const card = page => page.locator('.guide-preview__frame[data-live] .wra');
const messages = page => card(page).locator('.wra__messages');
const field = page => card(page).locator('textarea');
const words = text => text.trim().split(/\s+/).length;
const REPLY = {
  polish: /^I fixed two typos, split the long second paragraph/,
  shorter: /^Here's a tighter version/,
  tone: /^I softened the opening/,
  reply: /^Hi Sam, thanks for the update/,
  reminder: /^Hi team, just a friendly nudge/,
  fallback: /^Got it\. Here's a first draft/,
};
const lastReply = async page => (await messages(page).locator('.wra__msg--assistant').last().innerText()).trim();
const idle = page => page.waitForFunction(() => { const c = document.querySelector('.guide-preview__frame[data-live] .wra'); const m = c && c.querySelector('.wra__mic'); return m && !m.disabled; }, null, { timeout: 15000 });

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await open(desktop);

  await check('Agent Chat frame shows the live card (no photo), with the measured welcome copy and four suggestions', async () => {
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /Agent Chat/);
    assert.equal(await card(page).count(), 1);
    assert.equal(await page.locator('.guide-preview__frame[data-live] img').count(), 0);
    assert.equal(await card(page).locator('.wra__name').innerText(), 'Quill');
    assert.equal(await card(page).locator('.wra__tagline').innerText(), 'Your writing companion.');
    assert.equal(await card(page).locator('.wra__greeting').innerText(), 'What should we write?');
    assert.deepEqual(await card(page).locator('.wra__chip').allInnerTexts(), ['Polish my email', 'Make it shorter', 'Fix the tone', 'Draft a reply']);
    assert.equal(await field(page).getAttribute('placeholder'), 'Ask anything…');
    assert.equal(await card(page).locator('.wra__send').count(), 0, 'Send only exists once there is text');
    assert.equal(await card(page).locator('.wra__new').isDisabled(), true, 'New chat hidden until a chat starts');
    await page.screenshot({ path: `${out}/card-welcome.png` });
  });

  await check('A suggestion sends itself: user bubble, shimmering Writing…, then the reply streams word by word without leaving the page', async () => {
    await card(page).locator('.wra__chip', { hasText: 'Polish my email' }).click();
    assert.equal(await messages(page).locator('.wra__msg--user').innerText(), 'Polish my email');
    await page.waitForFunction(() => document.querySelector('.guide-preview__frame[data-live] .wra__shimmer'), null, { timeout: 2000 });
    assert.equal(await card(page).locator('.wra__mic').isDisabled(), true, 'mic is off while a reply is on its way');
    assert.equal(await page.locator('.guide-preview__frame[data-live] .wra[data-chat]').count(), 1);
    assert.equal(await card(page).locator('.wra__new').isEnabled(), true);
    await page.screenshot({ path: `${out}/card-writing.png` });
    const counts = [];
    for (let i = 0; i < 40; i++) {
      const text = await page.locator('.guide-preview__frame[data-live] .wra__msg--assistant').last().innerText().catch(() => '');
      if (text && text !== 'Writing…') counts.push(words(text));
      if (await card(page).locator('.wra__mic').isEnabled()) break;
      await page.waitForTimeout(30);
    }
    await idle(page);
    assert(counts.length >= 3 && counts.some(n => n < 22), `streams in steps: ${counts}`);
    assert(counts.every((n, i) => i === 0 || n >= counts[i - 1]), 'never goes backwards');
    assert.match(await lastReply(page), REPLY.polish);
    assert(new URL(page.url()).searchParams.get('browse') === '1' && !(await page.locator('.crm-page').count()), 'stays on the selector');
    await page.screenshot({ path: `${out}/card-reply.png` });
  });

  await check('New chat returns to the welcome view; every suggestion gets its measured reply', async () => {
    await card(page).locator('.wra__new').click();
    assert.equal(await card(page).locator('.wra__greeting').count(), 1);
    assert.equal(await page.locator('.guide-preview__frame[data-live] .wra[data-chat]').count(), 0);
    for (const [label, expected] of [['Make it shorter', REPLY.shorter], ['Fix the tone', REPLY.tone], ['Draft a reply', REPLY.reply]]) {
      await card(page).locator('.wra__chip', { hasText: label }).click();
      await idle(page);
      assert.match(await lastReply(page), expected, label);
      await card(page).locator('.wra__new').click();
    }
  });

  await check('Typing: Send appears with text, Enter sends, Shift+Enter adds a line, the field grows to four lines then scrolls', async () => {
    const box = await field(page).evaluate(el => el.getBoundingClientRect().height);
    await field(page).click();
    await field(page).fill('Draft an apology');
    assert.equal(await card(page).locator('.wra__send').count(), 1);
    await field(page).fill('');
    assert.equal(await card(page).locator('.wra__send').count(), 0);
    await field(page).fill('   ');
    assert.equal(await card(page).locator('.wra__send').isDisabled(), true, 'blank text cannot be sent');
    await field(page).press('Enter');
    assert.equal(await page.locator('.guide-preview__frame[data-live] .wra[data-chat]').count(), 0, 'Enter on blank sends nothing');
    await field(page).fill('');
    const heights = [];
    for (let i = 0; i < 6; i++) { await field(page).press('Shift+Enter'); await field(page).type('x'); heights.push(await field(page).evaluate(el => el.getBoundingClientRect().height)); }
    const line = heights[1] - heights[0];
    assert(heights[0] > box && Math.abs(line - box * 20 / 28) < 1.5, `grows by one line: ${heights}`);
    assert(Math.abs(heights[5] - box * 88 / 28) < 1.5 && heights[4] === heights[5] || heights[5] <= box * 88 / 28 + 1, 'capped at four lines');
    await field(page).fill('Draft an apology');
    await field(page).press('Enter');
    assert.equal(await messages(page).locator('.wra__msg--user').innerText(), 'Draft an apology');
    assert.equal(await field(page).inputValue(), '');
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'TEXTAREA', 'focus stays in the field');
    await field(page).fill('second');
    assert.equal(await card(page).locator('.wra__send').isDisabled(), true, 'Send is disabled while replying');
    await field(page).press('Enter');
    assert.equal(await field(page).inputValue(), 'second', 'Enter while replying keeps the draft');
    assert.equal(await messages(page).locator('.wra__msg--user').count(), 1);
    await idle(page);
    assert.match(await lastReply(page), REPLY.fallback);
  });

  await check('Many turns keep the list scrolled to the newest message', async () => {
    for (let i = 0; i < 3; i++) { await field(page).fill(`Make it shorter ${i}`); await field(page).press('Enter'); await idle(page); }
    const list = await messages(page).evaluate(el => ({ top: el.scrollTop, ch: el.clientHeight, sh: el.scrollHeight }));
    assert(list.sh > list.ch && Math.abs(list.sh - list.ch - list.top) < 2, JSON.stringify(list));
    await card(page).locator('.wra__new').click();
  });

  await check('Dictation: Dictate shows the listening tile, words appear live, the sentence is sent, the reply streams', async () => {
    const mic = card(page).locator('.wra__mic');
    assert.equal(await mic.getAttribute('aria-label'), 'Dictate');
    await mic.click();
    assert.equal(await mic.getAttribute('aria-label'), 'Stop dictation');
    assert.equal(await mic.getAttribute('aria-pressed'), 'true');
    assert.equal(await field(page).getAttribute('placeholder'), 'Listening…');
    assert.equal(await field(page).evaluate(el => el.readOnly), true);
    assert.equal(await card(page).locator('.wra__wave i').count(), 3);
    await page.waitForFunction(() => document.querySelector('.guide-preview__frame[data-live] textarea').value.split(' ').length >= 3);
    await page.screenshot({ path: `${out}/card-listening.png` });
    await page.waitForFunction(() => document.querySelector('.guide-preview__frame[data-live] .wra__msg--user'), null, { timeout: 8000 });
    assert.equal(await messages(page).locator('.wra__msg--user').innerText(), 'Write a friendly reminder that the report is due on Friday');
    await idle(page);
    assert.match(await lastReply(page), REPLY.reminder);
    assert.equal(await field(page).getAttribute('placeholder'), 'Ask anything…');
    await card(page).locator('.wra__new').click();
  });

  await check('Stopping dictation early sends what was heard; New chat mid-reply cancels cleanly', async () => {
    const mic = card(page).locator('.wra__mic');
    await mic.click();
    await page.waitForFunction(() => document.querySelector('.guide-preview__frame[data-live] textarea').value.split(' ').length >= 3);
    await mic.click();
    const sent = await messages(page).locator('.wra__msg--user').innerText();
    assert(/^Write a friendly/.test(sent) && words(sent) >= 3 && words(sent) < 11, sent);
    assert.equal(await mic.getAttribute('aria-pressed'), 'false');
    await card(page).locator('.wra__new').click();
    assert.equal(await card(page).locator('.wra__greeting').count(), 1);
    await page.waitForTimeout(1800);
    assert.equal(await card(page).locator('.wra__msg').count(), 0, 'nothing arrives after New chat');
    assert.equal(await mic.isEnabled(), true);
  });

  await check('Working in the card is not interrupted by the pointer crossing the list; other rows still select by keyboard and the card keeps its conversation', async () => {
    await card(page).locator('.wra__chip', { hasText: 'Fix the tone' }).click();
    await idle(page);
    await field(page).focus();
    const item = name => page.locator('.guide-item').filter({ hasText: new RegExp(`${name}$`) });
    await item('CRM').hover();
    await page.waitForTimeout(300);
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /Agent Chat/, 'hover ignored while typing');
    await field(page).evaluate(el => el.blur());
    await page.mouse.move(20, 20);
    await item('CRM').hover();
    await page.waitForTimeout(1000);
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /CRM/);
    assert.equal(await page.locator('.guide-preview__frame[data-live]:has(.wra)').getAttribute('inert'), '', 'card is inert while off screen');
    assert.equal(await page.locator('.guide-preview__link').count(), 1, 'photo frames keep their whole-frame link');
    await item('Agent Chat').hover();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('.guide-preview__frame[data-live]:has(.wra)').getAttribute('inert'), null);
    assert.equal(await page.locator('.guide-preview__link').count(), 0, 'the live frame is not a link');
    assert.match(await lastReply(page), REPLY.tone);
  });

  await check('Clicking the card never navigates; the Agent Chat row and Enter still open the page', async () => {
    await card(page).locator('.wra__greeting, .wra__messages').first().click({ force: true }).catch(() => {});
    await page.locator('.guide-preview__frame[data-live]:has(.wra)').click({ position: { x: 4, y: 4 } });
    assert.equal(await page.locator('.guide-page').count(), 1);
    await page.locator('.guide-item').filter({ hasText: /Agent Chat$/ }).click();
    await page.locator('.crm-page').waitFor();
    assert.match(page.url(), /section=new-chat/);
  });

  await check('Nothing leaves localhost', async () => { assert.deepEqual([...external], []); });
  await desktop.close();

  await check('The taller reference proportions and readable text survive landscape and portrait at every size', async () => {
    const sizes = [[1920, 1080], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [1024, 1366], [844, 390], [667, 375], [568, 320], [932, 430], [430, 932], [390, 844], [360, 740], [320, 568], [320, 480]];
    const rows = [];
    for (const [width, height] of sizes) {
      const context = await browser.newContext({ viewport: { width, height } });
      const p = await open(context);
      const m = await p.evaluate(() => {
        const frame = document.querySelector('.guide-preview').getBoundingClientRect();
        const c = document.querySelector('.guide-preview__frame[data-live] .wra').getBoundingClientRect();
        const chips = [...document.querySelectorAll('.guide-preview__frame[data-live] .wra__chip')].map(el => el.getBoundingClientRect());
        const mic = document.querySelector('.guide-preview__frame[data-live] .wra__mic').getBoundingClientRect();
        const heading = document.querySelector('.guide-heading').getBoundingClientRect();
        const font = parseFloat(getComputedStyle(document.querySelector('.guide-preview__frame[data-live] .wra__chip')).fontSize);
        const stacked = document.querySelector('.guide-grid').getBoundingClientRect().height > frame.height * 1.5;
        return { frame: { w: frame.width, h: frame.height }, card: { l: c.left - frame.left, t: c.top - frame.top, r: frame.right - c.right, b: frame.bottom - c.bottom, w: c.width, h: c.height }, chipsInside: chips.every(r => r.left >= c.left - .5 && r.right <= c.right + .5 && r.bottom <= c.bottom), micInside: mic.right <= c.right && mic.bottom <= c.bottom, headingTop: heading.top, overflowX: document.documentElement.scrollWidth > innerWidth, scrollH: document.documentElement.scrollHeight, font, stacked };
      });
      const ratio = m.frame.w / m.frame.h;
      assert(Math.abs(ratio - 380 / 401) < 0.01, `${width}x${height} frame ratio ${ratio}`);
      assert(Math.abs(m.card.l) < 1 && Math.abs(m.card.t) < 1 && Math.abs(m.card.r) < 1 && Math.abs(m.card.b) < 1.5, `${width}x${height} card fills the frame edge to edge ${JSON.stringify(m.card)}`);
      assert(m.chipsInside && m.micInside, `${width}x${height} content inside card`);
      assert(!m.overflowX, `${width}x${height} no horizontal overflow`);
      assert(m.headingTop >= 0, `${width}x${height} heading visible (${m.headingTop})`);
      if (m.scrollH > height + 1) assert(m.stacked || height <= 560, `${width}x${height} vertical scrolling is reserved for stacked or short screens (${m.scrollH})`);
      rows.push({ width, height, orientation: width > height ? 'landscape' : 'portrait', layout: m.stacked ? 'stacked' : 'side-by-side', frame: `${m.frame.w.toFixed(0)}x${m.frame.h.toFixed(0)}`, textPx: +m.font.toFixed(1) });
      if ([[1440, 900], [844, 390], [390, 844], [768, 1024]].some(([w, h]) => w === width && h === height)) await p.screenshot({ path: `${out}/layout-${width}x${height}.png` });
      await context.close();
    }
    console.table(rows);
    assert(rows.every(r => r.textPx >= 13 && r.textPx <= 16.3), 'suggestion text stays between 13 and 16.25px');
    await fs.writeFile(`${out}/layout.json`, JSON.stringify(rows, null, 2));
  });

  await check('Rotating the same page between portrait and landscape re-lays it out without losing the conversation', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await open(context);
    await card(p).locator('.wra__chip', { hasText: 'Draft a reply' }).click();
    await idle(p);
    const stackedBefore = await p.evaluate(() => getComputedStyle(document.querySelector('.guide-grid')).gridTemplateColumns.split(' ').length);
    await p.setViewportSize({ width: 844, height: 390 });
    await p.waitForTimeout(500);
    const sideBySide = await p.evaluate(() => getComputedStyle(document.querySelector('.guide-grid')).gridTemplateColumns.split(' ').length);
    assert.equal(stackedBefore, 1); assert.equal(sideBySide, 2);
    assert.match(await lastReply(p), REPLY.reply, 'conversation survives rotation');
    // The field's pixel height must follow the new scale (28 design px against 13 design px of text).
    const ratio = await p.evaluate(() => { const t = document.querySelector('.guide-preview__frame[data-live] textarea'); const c = document.querySelector('.guide-preview__frame[data-live] .wra__msg--user'); return t.getBoundingClientRect().height / parseFloat(getComputedStyle(c).fontSize); });
    assert(Math.abs(ratio - 28 / 13) < 0.08, `field height follows the scale after rotation (ratio ${ratio})`);
    const frame = await p.locator('.guide-preview').boundingBox();
    assert(Math.abs(frame.width / frame.height - 380 / 401) < .01);
    const bar = await p.evaluate(() => ({ b: document.querySelector('.guide-bar').getBoundingClientRect(), a: document.querySelector('.guide-item[aria-current]').getBoundingClientRect() }));
    assert(Math.abs(bar.b.top - bar.a.top) < 1.5 && Math.abs(bar.b.height - bar.a.height) < 1.5, 'selection bar follows the row after rotation');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(500);
    assert.match(await lastReply(p), REPLY.reply);
    await context.close();
  });

  await check('Touch: tap a suggestion without raising the keyboard; the field is at least 16px so iOS does not zoom; targets are touch-sized', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const p = await open(context);
    await card(p).locator('.wra__chip', { hasText: 'Make it shorter' }).tap();
    await idle(p);
    assert.match(await lastReply(p), REPLY.shorter);
    assert.notEqual(await p.evaluate(() => document.activeElement?.tagName), 'TEXTAREA', 'no keyboard after a chip tap');
    const m = await p.evaluate(() => {
      const t = document.querySelector('.guide-preview__frame[data-live] textarea');
      const b = document.querySelector('.guide-preview__frame[data-live] .wra__mic').getBoundingClientRect();
      return { font: parseFloat(getComputedStyle(t).fontSize), mic: b.width };
    });
    assert(m.font >= 16, `field font ${m.font}`);
    assert(m.mic >= 34, `mic ${m.mic}`);
    await card(p).locator('.wra__new').tap();
    await field(p).tap();
    await field(p).fill('Hello');
    await card(p).locator('.wra__send').tap();
    await idle(p);
    assert.equal(await messages(p).locator('.wra__msg--user').innerText(), 'Hello');
    assert.equal(await p.locator('.guide-page').count(), 1, 'tapping inside the card never opens the page');
    await p.screenshot({ path: `${out}/card-touch.png` });
    await context.close();
  });

  await check('Reduced motion: glow and shimmer stand still and replies appear at once', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const p = await open(context);
    assert.equal(await p.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest('.wra') && Number(a.effect.getTiming().duration) > 1 && !a.effect.target.closest('.gf')).length), 0);
    await card(p).locator('.wra__chip', { hasText: 'Fix the tone' }).click();
    await p.waitForFunction(() => document.querySelector('.guide-preview__frame[data-live] .wra__msg--assistant')?.textContent !== 'Writing…', null, { timeout: 3000 });
    assert.match(await lastReply(p), REPLY.tone);
    assert.equal(await p.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest('.wra') && Number(a.effect.getTiming().duration) > 1 && !a.effect.target.closest('.gf')).length), 0);
    await context.close();
  });

  await check('Keyboard: tab order inside the card and visible focus; list navigation unaffected', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await open(context);
    await field(p).focus();
    await field(p).fill('x');
    const order = [];
    for (let i = 0; i < 2; i++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => document.activeElement.getAttribute('aria-label'))); }
    assert.deepEqual(order, ['Dictate', 'Send']);
    await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Shift+Tab');
    assert.equal(await p.evaluate(() => document.activeElement?.className.includes('wra__chip') || document.activeElement?.className.includes('guide-item')), true);
    assert.equal(await card(p).getAttribute('role'), 'group');
    assert.equal(await card(p).getAttribute('aria-label'), 'Quill');
    assert.equal(await card(p).locator('[role=status]').count(), 1);
    await context.close();
  });

  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors, external: [...external] }, null, 2));
  await browser.close();
}
