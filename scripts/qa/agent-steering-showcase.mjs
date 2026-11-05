// Browser checks for the homepage Agent Steering showcase (iPhone Duo).
//   node scripts/qa/agent-steering-showcase.mjs [baseUrl=http://localhost:3000]
// Drives the live demo inside the device screen with real pointer and keyboard input and asserts the
// run behaves: queue, pickup into the next step, interrupt, pause/resume timer freeze, remove, Esc,
// Shift+Enter, replay, keyboard focus, a stationary device, wheel passthrough, overlay alignment.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
  }
};

await page.goto(base + "/", { waitUntil: "load" });
const section = page.locator("section:has(.agent-showcase)");
await section.scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, 120));
await page.waitForSelector('.iphone-duo[data-status="ready"], .iphone-duo[data-status="flat"]', { timeout: 60000 });
await page.waitForTimeout(1200);

const screen = page.locator(".iphone-duo .ui-stc").first();
const field = screen.locator("textarea");
const queueChips = screen.locator(".ui-stc__chip");
const stateText = () => screen.locator(".ui-stc__state").innerText();
const activeIndex = () => screen.locator(".ui-stc__step").evaluateAll((els) => els.findIndex((e) => e.dataset.status === "active"));

await check("the device stays still under the pointer", async () => {
  // the screen plane's CSS3D matrix carries the device pose: any rotation or tilt would change it
  const pose = () => page.evaluate(() => document.querySelector(".iphone-duo__screen")?.style.transform);
  const before = await pose();
  const box = await page.locator(".iphone-duo").boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10, { steps: 8 });
  await page.evaluate(() => scrollBy(0, 60));
  await page.waitForTimeout(400);
  await page.evaluate(() => scrollBy(0, -60));
  assert.ok(before, "no CSS3D screen");
  assert.equal(await pose(), before);
});

await check("typing hands control to the visitor and Enter queues a note", async () => {
  await field.click();
  await page.keyboard.type("Add an index on email");
  assert.equal(await field.inputValue(), "Add an index on email");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  assert.equal(await field.inputValue(), "");
  assert.ok((await queueChips.allInnerTexts()).some((t) => t.includes("Add an index on email")));
});

await check("Shift+Enter adds a line, Esc clears the draft", async () => {
  await field.click();
  await page.keyboard.type("line one");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("line two");
  assert.equal(await field.inputValue(), "line one\nline two");
  await page.keyboard.press("Escape");
  assert.equal(await field.inputValue(), "");
});

await check("the queued note is picked up by the next step", async () => {
  const from = await activeIndex();
  await page.waitForFunction((i) => [...document.querySelectorAll(".iphone-duo .ui-stc__step")].findIndex((e) => e.dataset.status === "active") !== i, from, { timeout: 12000 });
  const step = screen.locator(".ui-stc__step").nth(from + 1);
  assert.match(await step.innerText(), /Add an index on email[\s\S]*Picked up/);
  assert.equal(await queueChips.count(), 0);
});

await check("Ctrl+Enter interrupts the active step", async () => {
  const i = await activeIndex();
  await field.click();
  await page.keyboard.type("Use a feature flag");
  await page.keyboard.press("Control+Enter");
  await page.waitForTimeout(400);
  assert.match(await screen.locator(".ui-stc__step").nth(i).innerText(), /Use a feature flag[\s\S]*Interrupted/);
});

await check("pause freezes the run and its timer; resume continues", async () => {
  await screen.getByRole("button", { name: "Pause the run" }).click();
  assert.equal(await stateText(), "Paused");
  const i = await activeIndex();
  await page.waitForTimeout(2500);
  assert.equal(await activeIndex(), i);
  await screen.getByRole("button", { name: "Resume the run" }).click();
  assert.match(await stateText(), /^Running · /);
  const a = await stateText();
  await page.waitForTimeout(1200);
  assert.notEqual(await stateText(), a);
});

await check("a queued note can be removed", async () => {
  await field.click();
  await page.keyboard.type("Temporary note");
  await page.keyboard.press("Enter");
  await screen.getByRole("button", { name: "Remove “Temporary note”" }).click();
  await page.waitForTimeout(300);
  assert.ok(!(await queueChips.allInnerTexts()).some((t) => t.includes("Temporary note")));
});

await check("controls are reachable with the keyboard", async () => {
  await field.focus();
  await page.keyboard.press("Shift+Tab");
  const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);
  assert.ok(label, "nothing focused");
});

await check("wheel over the screen scrolls the page (no zoom, no hijack)", async () => {
  const box = await screen.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(500);
  assert.ok((await page.evaluate(() => scrollY)) > y, "page did not scroll");
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(400);
});

await check("replay resets the run", async () => {
  await page.getByRole("button", { name: "Replay demo" }).click();
  await page.waitForTimeout(600);
  assert.equal(await screen.locator(".ui-stc__note").count(), 0);
  assert.match(await screen.locator(".ui-stc__sub").innerText(), /Step 2 of 5/);
});

await check("the screen stays aligned with the device after a resize", async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(800);
  const device = await page.locator(".iphone-duo").boundingBox();
  const s = await page.locator(".iphone-duo__screen").boundingBox();
  const cx = (a) => a.x + a.width / 2;
  assert.ok(Math.abs(cx(device) - cx(s)) < 2, `screen centre off by ${cx(device) - cx(s)}px`);
  assert.ok(s.width / device.width > 0.9 && s.width / device.width < 0.97, `screen/device ratio ${s.width / device.width}`);
  assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "horizontal overflow");
});

await check("no page errors", async () => assert.deepEqual(errors, []));

console.log(results.join("\n"));
await browser.close();
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
