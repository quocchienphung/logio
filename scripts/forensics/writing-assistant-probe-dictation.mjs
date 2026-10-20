// Third pass over the public Writing Assistant preview: manual stop of dictation, typed text before dictation,
// blank-text send button and Enter with only whitespace.
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const fresh = async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  return page;
};
const snap = async (page, label) => {
  const card = page.locator(".writing-assistant-demo .ui-wac");
  const ta = card.locator("textarea");
  console.log(label, JSON.stringify({
    value: await ta.inputValue(), ph: await ta.getAttribute("placeholder"), ro: await ta.evaluate(e => e.readOnly),
    pressed: await card.locator(".ui-wac__mic").getAttribute("aria-pressed"),
    micDisabled: await card.locator(".ui-wac__mic").isDisabled(),
    send: await card.locator(".ui-wac__send").count(),
    msgs: await card.locator(".ui-wac__messages").innerText().catch(() => "(none)"),
  }));
};

// 1. manual stop after ~1.2s
let page = await fresh();
let card = page.locator(".writing-assistant-demo .ui-wac");
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(1200); await snap(page, "listening 1.2s");
await card.locator(".ui-wac__mic").click();
for (const ms of [100, 400, 900, 1800]) { await page.waitForTimeout(ms); await snap(page, `after stop +${ms}`); }
await page.close();

// 2. typed text then mic
page = await fresh(); card = page.locator(".writing-assistant-demo .ui-wac");
await card.locator("textarea").fill("Draft an apology");
await snap(page, "typed");
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(100); await snap(page, "mic+100");
await page.waitForTimeout(700); await snap(page, "mic+800");
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(300); await snap(page, "stopped");
await page.close();

// 3. blank
page = await fresh(); card = page.locator(".writing-assistant-demo .ui-wac");
await card.locator("textarea").fill("   ");
console.log("blank send disabled:", await card.locator(".ui-wac__send").isDisabled());
await card.locator("textarea").press("Enter");
await page.waitForTimeout(400); await snap(page, "blank+enter");
// 4. send button during busy with new text typed; Enter while busy
await card.locator("textarea").fill("hello");
await card.locator("textarea").press("Enter");
await page.waitForTimeout(150);
await card.locator("textarea").fill("second");
console.log("send while busy:", await card.locator(".ui-wac__send").count(), "disabled", await card.locator(".ui-wac__send").isDisabled().catch(() => null));
await card.locator("textarea").press("Enter");
await page.waitForTimeout(200); await snap(page, "enter while busy");
await page.waitForTimeout(2500); await snap(page, "later");
// 5. chip while busy
await card.locator(".ui-wac__new").click();
await page.waitForTimeout(500);
// 6. escape and tab order
await card.locator("textarea").fill("tab test");
const order = [];
await card.locator("textarea").focus();
for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); order.push(await page.evaluate(() => document.activeElement.getAttribute("aria-label") || document.activeElement.className)); }
console.log("tab order from textarea:", order);
await browser.close();
