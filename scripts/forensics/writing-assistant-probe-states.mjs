// Drives the public Writing Assistant preview through its states (welcome, typing, sending, streaming, dictation,
// dark theme, new chat) and records the DOM, timings and screenshots as evidence for a clean-room rebuild.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/writing-assistant";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const card = page.locator(".writing-assistant-demo .ui-wac");
const log = {};
const shot = name => card.screenshot({ path: `${out}/source-${name}.png` });
const box = async () => card.evaluate(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; });

log.box = await box();
log.hasSpeech = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
await shot("welcome");
log.welcomeHtml = await card.evaluate(el => el.outerHTML);

// typing: send button appears
const ta = card.locator("textarea");
await ta.click();
await shot("focus");
await ta.fill("Make this email sound warmer");
await page.waitForTimeout(400);
await shot("typed");
log.typedRow = await card.locator(".ui-wac__row").evaluate(el => el.outerHTML);

// multi-line growth
await ta.fill("one\ntwo\nthree\nfour\nfive\nsix");
await page.waitForTimeout(200);
log.textareaGrowH = await ta.evaluate(el => el.getBoundingClientRect().height);
await shot("multiline");
await ta.fill("Make this email sound warmer");

// send & sample frames
const frames = [];
const t0 = Date.now();
await ta.press("Enter");
for (let i = 0; i < 40; i++) {
  frames.push({ t: Date.now() - t0, text: await card.locator(".ui-wac__messages").innerText().catch(() => ""), chat: await card.evaluate(el => el.hasAttribute("data-chat")) });
  if (i === 2) await shot("writing");
  if (i === 8) await shot("streaming");
  await page.waitForTimeout(120);
}
log.frames = frames;
await page.waitForTimeout(3000);
await shot("done");
log.doneHtml = await card.locator(".ui-wac__body").evaluate(el => el.outerHTML);
log.doneText = await card.locator(".ui-wac__messages").innerText();

// chip, new chat
await card.locator(".ui-wac__new").click();
await page.waitForTimeout(700);
await shot("after-new");
log.afterNewHasChat = await card.evaluate(el => el.hasAttribute("data-chat"));
const chips = await card.locator(".ui-wac__chip").allInnerTexts();
log.chipReplies = {};
for (const chip of chips) {
  await card.locator(".ui-wac__chip", { hasText: chip }).click();
  await page.waitForTimeout(7000);
  log.chipReplies[chip] = await card.locator(".ui-wac__messages").innerText();
  await card.locator(".ui-wac__new").click();
  await page.waitForTimeout(600);
}

// dictation (simulated take in headless)
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(500);
await shot("listening-0");
log.listeningRow = await card.locator(".ui-wac__row").evaluate(el => el.outerHTML);
const dict = [];
const d0 = Date.now();
for (let i = 0; i < 40; i++) {
  dict.push({ t: Date.now() - d0, value: await ta.inputValue(), pressed: await card.locator(".ui-wac__mic").getAttribute("aria-pressed"), label: await card.locator(".ui-wac__mic").getAttribute("aria-label") });
  if (i === 10) await shot("listening-mid");
  await page.waitForTimeout(250);
}
log.dictation = dict;
await shot("after-dictation");
log.afterDictationText = await card.locator(".ui-wac__messages").innerText().catch(() => "");

await fs.writeFile(`${out}/states.json`, JSON.stringify(log, null, 2));

// dark
await page.locator('.stage__theme-btn[aria-label="Dark theme"]').click();
await page.waitForTimeout(600);
await card.locator(".ui-wac__new").click().catch(() => {});
await page.waitForTimeout(600);
await shot("dark-welcome");
await browser.close();
console.log(JSON.stringify({ box: log.box, speech: log.hasSpeech, grow: log.textareaGrowH, chips: Object.keys(log.chipReplies) }, null, 1));
