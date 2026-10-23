// Drives the model picker in the New chat composer: open/close, hover fill and rolling figures, keyboard,
// thinking + effort, Web search shared with the Plugins menu, what is sent to the chat API, flipping above the
// trigger in chat mode, touch size, dark theme, reduced motion, and that nothing leaves localhost.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const origin = new URL(base).origin;
const out = "docs/research/model-picker/qa";
await fs.mkdir(out, { recursive: true });
const SESSION = "affectui:acme:assistant-session";
const browser = await chromium.launch({ channel: "chrome" });
const errors = [], results = [], outside = [];
const check = async (name, fn) => { await fn(); results.push(name); console.log(`PASS ${name}`); };

async function newPage({ viewport = { width: 1440, height: 940 }, touch = false, api = null, reduced = false, storage = null } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, reducedMotion: reduced ? "reduce" : "no-preference" });
  if (storage) await context.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, storage);
  if (api) {
    await context.addInitScript(() => { window.__workspaceBackendConfig = { baseUrl: "/mock-api", debounceMs: 100 }; });
    await context.route("**/mock-api/**", route => {
      const request = route.request(), url = new URL(request.url());
      const reply = (status, body) => route.fulfill({ status, contentType: "application/json", body: body === undefined ? "" : JSON.stringify(body) });
      if (url.pathname.endsWith("/assistant/threads")) return reply(200, { data: [] });
      if (url.pathname.endsWith("/assistant/messages")) { api.sent.push(JSON.parse(request.postData())); const now = new Date().toISOString(); return reply(200, { data: { requestId: "r1", thread: { id: "t1", title: "Hello", updatedAt: now, messages: [{ id: "m1", role: "user", content: api.sent.at(-1).text, createdAt: now }, { id: "m2", role: "assistant", content: "A real server response", createdAt: now }] } } }); }
      return reply(404, {});
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /Encountered two children|Cannot update|hydration|Invalid DOM|unique.*key|Warning:/i.test(message.text())) errors.push(message.text()); });
  page.on("request", request => { const url = request.url(); if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) outside.push(url); });
  await page.goto(`${base}/personalize?section=new-chat`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.locator(".mp__trigger").waitFor();
  return { context, page };
}
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), SESSION);
const caption = page => page.locator(".mp__caption").innerText();
const opt = (page, id) => page.locator(`.mp__option[data-id="${id}"]`);
const isOpen = page => page.locator(".mp").evaluate(el => el.hasAttribute("data-open"));
const focused = page => page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.className);
const sample = (page, selector, ms) => page.evaluate(([sel, duration]) => new Promise(resolve => { const log = []; const t0 = performance.now(); const tick = () => { log.push([Math.round(performance.now() - t0), document.querySelector(sel).innerText.replace(/\n/g, "|")]); if (performance.now() - t0 < duration) requestAnimationFrame(tick); else resolve(log); }; tick(); }), [selector, ms]);

try {
  const { context, page } = await newPage();

  await check("the composer has the model picker instead of the old dropdown", async () => {
    assert.equal(await page.locator(".ui-as-ghost--model").count(), 0);
    const trigger = page.locator(".mp__trigger");
    assert.equal(await trigger.getAttribute("aria-label"), "Model: Auto");
    assert.equal(await trigger.getAttribute("aria-haspopup"), "dialog");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal((await trigger.boundingBox()).height, 28);
    assert.equal(await page.locator(".mp__pop").evaluate(el => el.matches(":popover-open")), false, "the menu is not in the page while closed");
    await page.screenshot({ path: `${out}/closed.png` });
  });

  await check("click opens a dialog with the nine models in order, bars, switches and a footer; the list takes focus", async () => {
    await page.locator(".mp__trigger").click(); await page.waitForTimeout(700);
    assert.equal(await isOpen(page), true);
    assert.equal(await page.locator(".mp__trigger").getAttribute("aria-expanded"), "true");
    assert.deepEqual(await page.locator(".mp__option .mp__title-name").allInnerTexts(), ["Fable 5.1", "Opus 5.5", "Sonnet 5.5", "Haiku 5.5", "GPT-6 Astra", "GPT-6.1 Sol", "GPT-6 Luna", "Gemini", "Auto"]);
    assert.equal(await page.getByRole("dialog", { name: "Model settings" }).count(), 1);
    assert.equal(await page.getByRole("listbox", { name: "Model" }).count(), 1);
    assert.deepEqual((await page.locator(".mp__head").innerText()).split(/\s+/), ["MODEL", "SPEED", "QUALITY", "COST"]);
    assert.equal(await page.locator('.mp__option[data-id="auto"] .mp__varies').innerText(), "Varies");
    assert.equal(await page.locator(".mp__option").first().locator(".mp__seg[data-on]").count(), 2 + 5 + 5, "Fable: speed 2, quality 5, cost 5");
    assert.equal(await page.getByRole("switch").count(), 2);
    assert.equal(await focused(page), "Model", "focus moves to the model list");
    const geometry = await page.evaluate(() => { const r = selector => document.querySelector(selector).getBoundingClientRect(); return { pop: r(".mp__pop").width, head: r(".mp__head").height, row: r(".mp__option").height, toggle: r(".mp__toggle").height, foot: r(".mp__foot").height, bars: r(".mp__bars").width, switch: [r(".mp__switch").width, r(".mp__switch").height] }; });
    assert.deepEqual([geometry.pop, geometry.head, geometry.row, geometry.toggle, geometry.foot, geometry.bars, geometry.switch], [320, 28, 48, 32, 36, 136, [26, 16]]);
    await page.screenshot({ path: `${out}/open.png` });
  });

  await check("pointing at a row dims the others, fills its bars one after another and rolls the footer figures", async () => {
    await page.mouse.move(5, 5); await page.waitForTimeout(500);
    const bars = page.evaluate(() => new Promise(resolve => { const segs = [...document.querySelectorAll('.mp__option[data-id="claude-opus-5-5"] .mp__seg[data-on]')]; const log = []; const t0 = performance.now(); const tick = () => { log.push([Math.round(performance.now() - t0), segs.map(seg => getComputedStyle(seg).backgroundColor.match(/[\d.]+/g).slice(0, 3).join(",") === "0,0,0" ? "g" : "B").join("")]); if (performance.now() - t0 < 900) requestAnimationFrame(tick); else resolve(log); }; tick(); }));
    const figures = sample(page, ".mp__caption", 900);
    await opt(page, "claude-opus-5-5").hover();
    const [barLog, figureLog] = await Promise.all([bars, figures]);
    const steps = [...new Set(barLog.map(entry => entry[1]))];
    assert.ok(steps.length >= 8, `segments light up one by one: ${steps.join(" ")}`);
    assert.equal(steps.at(-1), "B".repeat(12));
    assert.ok(steps[0].startsWith("g"), "they start unlit");
    assert.equal(await page.locator(".mp__list").getAttribute("data-pointing"), "");
    assert.equal(await opt(page, "claude-haiku-5-5").evaluate(el => getComputedStyle(el).opacity), "0.55", "other rows step back");
    assert.equal(await opt(page, "claude-opus-5-5").evaluate(el => getComputedStyle(el).opacity), "1");
    const seconds = figureLog.map(entry => Number(entry[1].match(/~([\d.]+)s/)?.[1])).filter(Number.isFinite);
    assert.equal(seconds.at(-1), 1.5); assert.ok(seconds.length > 8 && seconds.every((value, index) => index === 0 || value >= seconds[index - 1]), `the first-token time rolls: ${seconds.join(" ")}`);
    assert.equal(await caption(page), "~1.5s first token · $20 / M tokens");
    await page.mouse.move(5, 5); await page.waitForTimeout(700);
    assert.equal(await page.locator(".mp__list").getAttribute("data-pointing"), null, "leaving the list stops pointing");
    assert.equal(await caption(page), "Picks per message", "the footer goes back to the chosen model (Auto)");
    await opt(page, "auto").hover(); await page.waitForTimeout(700);
    assert.equal(await caption(page), "Picks per message", "a router has no figures: the footer says what it does");
    await page.screenshot({ path: `${out}/hover-auto.png` });
  });

  await check("a click picks the model, closes the menu, returns focus, swaps the name and is remembered", async () => {
    const copies = page.evaluate(() => new Promise(resolve => { let most = 0; const t0 = performance.now(); const tick = () => { most = Math.max(most, document.querySelectorAll(".mp__name .mp__swap-item").length); if (performance.now() - t0 < 700) requestAnimationFrame(tick); else resolve(most); }; tick(); }));
    await opt(page, "claude-haiku-5-5").click();
    assert.equal(await isOpen(page), false);
    assert.equal(await focused(page), "Model: Haiku 5.5");
    assert.equal(await copies, 2, "old and new names crossfade");
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".mp__name .mp__swap-item").count(), 1);
    assert.equal(await page.locator(".mp__name").innerText(), "Haiku 5.5");
    assert.equal((await stored(page)).model, "claude-haiku-5-5");
    await page.reload({ waitUntil: "networkidle" }); await page.locator(".mp__trigger").waitFor();
    assert.equal(await page.locator(".mp__trigger").getAttribute("aria-label"), "Model: Haiku 5.5");
    await page.locator(".mp__trigger").click(); await page.waitForTimeout(500);
    assert.equal(await page.locator('.mp__option[aria-selected="true"] .mp__title-name').innerText(), "Haiku 5.5");
    assert.equal(await page.locator('.mp__option[aria-selected="true"] .mp__check').count(), 1);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  });

  await check("keyboard: Enter opens, arrows wrap, Home/End jump, Enter picks, Esc returns to the trigger, Tab leaves", async () => {
    await page.locator(".mp__trigger").focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    assert.equal(await isOpen(page), true); assert.equal(await focused(page), "Model");
    const active = () => page.locator(".mp__list").evaluate(el => el.getAttribute("aria-activedescendant")?.split("-opt-").pop());
    assert.equal(await active(), "claude-haiku-5-5", "starts on the chosen model");
    await page.keyboard.press("ArrowDown"); assert.equal(await active(), "gpt-6-astra");
    await page.keyboard.press("End"); assert.equal(await active(), "auto");
    await page.keyboard.press("ArrowDown"); assert.equal(await active(), "claude-fable-5-1", "wraps to the top");
    await page.keyboard.press("ArrowUp"); assert.equal(await active(), "auto", "and back to the bottom");
    await page.keyboard.press("Home"); assert.equal(await active(), "claude-fable-5-1");
    assert.equal(await page.locator(".mp__list").getAttribute("data-pointing"), "", "keys light the row as the pointer does");
    await page.waitForTimeout(700);
    assert.equal(await caption(page), "~2.4s first token · $50 / M tokens");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    assert.equal(await isOpen(page), false); assert.equal(await focused(page), "Model: Haiku 5.5");
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(400); assert.equal(await isOpen(page), true, "ArrowDown on the trigger opens it too");
    await page.keyboard.press("ArrowDown"); await page.keyboard.press(" "); await page.waitForTimeout(500);
    assert.equal(await page.locator(".mp__trigger").getAttribute("aria-label"), "Model: GPT-6 Astra");
    assert.equal((await stored(page)).model, "gpt-6-astra");
    await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    await page.keyboard.press("Tab"); assert.equal(await focused(page), "mp__toggle");
    await page.keyboard.press("Tab"); assert.equal(await page.evaluate(() => document.activeElement.textContent), "Web search", "the effort row is skipped while thinking is off");
    await page.keyboard.press("Tab"); await page.waitForTimeout(500);
    assert.equal(await isOpen(page), false, "tabbing out of the menu closes it");
  });

  await check("extended thinking unfolds the effort row, lights the bulb, scales the first-token time and is remembered", async () => {
    await page.locator(".mp__trigger").click(); await page.waitForTimeout(500);
    await opt(page, "claude-sonnet-5-5").click(); await page.waitForTimeout(500);
    await page.locator(".mp__trigger").click(); await page.waitForTimeout(500);
    assert.equal(await page.locator(".mp__fold").evaluate(el => el.hasAttribute("inert")), true, "effort is inert while thinking is off");
    const folded = () => page.locator(".mp__fold").evaluate(el => el.getBoundingClientRect().height);
    const before = await folded();
    await page.getByRole("switch", { name: "Extended thinking" }).click(); await page.waitForTimeout(800);
    const after = await folded();
    assert.ok(before < 1 && after >= 24, `the effort row unfolds (${before} to ${after})`);
    const pop = await page.locator(".mp__pop").boundingBox();
    assert.ok(pop.y >= 0 && pop.y + pop.height <= 940, "the menu still fits the window (the list gives up room)");
    assert.equal(await page.locator(".mp__flag").evaluate(el => el.hasAttribute("data-on")), true);
    assert.equal(await page.locator(".mp__trigger").getAttribute("aria-label"), "Model: Sonnet 5.5, extended thinking");
    assert.equal(await page.locator(".mp__fold").evaluate(el => el.hasAttribute("inert")), false);
    assert.equal(await page.getByRole("radio", { checked: true }).innerText(), "Medium");
    assert.equal(await caption(page), "~2.3s first token · $10 / M tokens", "0.9 s x 2.5");
    const thumb = await page.locator(".mp__thumb").evaluate(el => { const box = el.getBoundingClientRect(), active = document.querySelector('.mp__seg-btn[aria-checked="true"]').getBoundingClientRect(); return [Math.abs(Math.round(box.x - active.x)), Math.abs(Math.round(box.width - active.width))]; });
    assert.deepEqual(thumb, [0, 0], "the highlight sits under the chosen level");
    await page.getByRole("radio", { name: "High" }).click(); await page.waitForTimeout(700);
    assert.equal(await caption(page), "~3.6s first token · $10 / M tokens");
    await page.getByRole("radio", { name: "Low" }).click(); await page.waitForTimeout(700);
    assert.equal(await caption(page), "~1.4s first token · $10 / M tokens");
    await page.getByRole("radio", { name: "Low" }).focus(); await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(500);
    assert.equal(await page.getByRole("radio", { checked: true }).innerText(), "High", "arrows wrap in the effort group");
    assert.equal(await page.getByRole("radio", { checked: true }).evaluate(el => el === document.activeElement), true, "and move focus with the choice");
    assert.deepEqual(await page.getByRole("radio").evaluateAll(list => list.map(el => el.tabIndex)), [-1, -1, 0], "one tab stop");
    assert.deepEqual([(await stored(page)).thinking, (await stored(page)).effort], [true, "high"]);
    await page.screenshot({ path: `${out}/thinking.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.reload({ waitUntil: "networkidle" }); await page.locator(".mp__trigger").waitFor();
    assert.equal(await page.locator(".mp__trigger").getAttribute("aria-label"), "Model: Sonnet 5.5, extended thinking");
  });

  await check("the Web search switch is the same setting as the Web search plugin, and hovering it shows what it does", async () => {
    await page.locator(".mp__trigger").click(); await page.waitForTimeout(500);
    const web = page.getByRole("switch", { name: "Web search" });
    assert.equal(await web.getAttribute("aria-checked"), "false");
    await web.hover(); await page.waitForTimeout(600);
    assert.equal(await caption(page), "Answers from what it already knows");
    await web.click(); await page.waitForTimeout(500);
    assert.equal(await caption(page), "Looks things up on the web when it helps");
    assert.deepEqual((await stored(page)).plugins, ["web-search"]);
    assert.equal(await isOpen(page), true, "a switch does not close the menu");
    await page.mouse.move(5, 5); await page.waitForTimeout(500);
    await page.mouse.click(5, 5); await page.waitForTimeout(500);
    assert.equal(await isOpen(page), false, "an outside press closes it");
    await page.getByRole("button", { name: "Plugins" }).click(); await page.waitForTimeout(400);
    assert.equal(await page.getByRole("menuitemcheckbox", { name: /Web search/ }).getAttribute("aria-checked"), "true");
    await page.getByRole("menuitemcheckbox", { name: /Web search/ }).click(); await page.waitForTimeout(300);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.locator(".mp__trigger").click(); await page.waitForTimeout(500);
    assert.equal(await page.getByRole("switch", { name: "Web search" }).getAttribute("aria-checked"), "false", "turning it off in Plugins turns it off here");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  });

  await check("a saved provider id from the old dropdown becomes a real model", async () => {
    const legacy = await newPage({ storage: [SESSION, JSON.stringify({ draft: "", model: "claude", plugins: [] })] });
    assert.equal(await legacy.page.locator(".mp__trigger").getAttribute("aria-label"), "Model: Sonnet 5.5");
    await legacy.context.close();
    const unknown = await newPage({ storage: [SESSION, JSON.stringify({ draft: "", model: "does-not-exist", plugins: [] })] });
    assert.equal(await unknown.page.locator(".mp__trigger").getAttribute("aria-label"), "Model: Auto");
    await unknown.context.close();
  });
  await context.close();

  const sent = { sent: [] };
  const chat = await newPage({ api: sent });
  await check("the chat API gets the chosen model, plugins, thinking and effort; the menu then opens above the trigger in chat mode", async () => {
    const page2 = chat.page;
    await page2.locator(".mp__trigger").click(); await page2.waitForTimeout(500);
    assert.equal(await page2.locator(".mp").getAttribute("data-side"), "bottom", "on the home screen the menu opens below");
    await opt(page2, "claude-opus-5-5").click(); await page2.waitForTimeout(400);
    await page2.locator(".mp__trigger").click(); await page2.waitForTimeout(500);
    await page2.getByRole("switch", { name: "Extended thinking" }).click(); await page2.waitForTimeout(500);
    await page2.getByRole("radio", { name: "High" }).click(); await page2.waitForTimeout(300);
    await page2.getByRole("switch", { name: "Web search" }).click(); await page2.waitForTimeout(300);
    await page2.keyboard.press("Escape"); await page2.waitForTimeout(400);
    await page2.getByLabel("Message", { exact: true }).fill("Hello"); await page2.getByRole("button", { name: "Send", exact: true }).click(); await page2.waitForTimeout(1500);
    assert.equal(sent.sent.length, 1);
    assert.deepEqual([sent.sent[0].model, sent.sent[0].plugins, sent.sent[0].thinking, sent.sent[0].effort], ["claude-opus-5-5", ["web-search"], true, "high"]);
    await page2.locator(".mp__trigger").click(); await page2.waitForTimeout(600);
    assert.equal(await page2.locator(".mp").getAttribute("data-side"), "top", "the composer is at the bottom, so the menu opens upward");
    const box = await page2.locator(".mp__pop").boundingBox(), trigger = await page2.locator(".mp__trigger").boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 940, "inside the window");
    assert.ok(box.y + box.height <= trigger.y, "above the trigger");
    await page2.screenshot({ path: `${out}/chat-top.png` });
    await page2.getByRole("switch", { name: "Extended thinking" }).click(); await page2.waitForTimeout(500);
    const grown = await page2.locator(".mp__pop").boundingBox();
    assert.equal(await page2.locator(".mp").getAttribute("data-side"), "top", "unfolding does not flip the side");
    assert.ok(Math.abs((grown.y + grown.height) - (box.y + box.height)) < 2, "the bottom edge stays beside the trigger while it grows upward");
    await page2.keyboard.press("Escape"); await page2.waitForTimeout(300);
    await page2.getByLabel("Message", { exact: true }).fill("Again"); await page2.getByRole("button", { name: "Send", exact: true }).click(); await page2.waitForTimeout(1200);
    assert.equal(sent.sent.length, 2); assert.equal(sent.sent[1].thinking, undefined, "thinking off: nothing extra is sent"); assert.equal(sent.sent[1].effort, undefined);
  });
  await chat.context.close();

  await check("a tall list scrolls inside the menu, fades at the edge, and the chosen model is scrolled into view", async () => {
    const small = await newPage({ viewport: { width: 1280, height: 640 }, storage: [SESSION, JSON.stringify({ draft: "", model: "auto", plugins: [] })] });
    await small.page.locator(".mp__trigger").click(); await small.page.waitForTimeout(700);
    const list = small.page.locator(".mp__list");
    const info = await list.evaluate(el => ({ scrolls: el.scrollHeight > el.clientHeight, below: el.hasAttribute("data-more-below"), above: el.hasAttribute("data-more-above"), top: el.scrollTop }));
    assert.equal(info.scrolls, true);
    assert.equal(await small.page.locator('.mp__option[data-id="auto"]').evaluate(el => { const row = el.getBoundingClientRect(), box = el.parentElement.getBoundingClientRect(); return row.top >= box.top - 1 && row.bottom <= box.bottom + 1; }), true, "Auto (chosen) is visible");
    assert.equal(info.above, true); assert.equal(info.below, false);
    const pop = await small.page.locator(".mp__pop").boundingBox();
    assert.ok(pop.y >= 0 && pop.y + pop.height <= 640, "the whole menu fits the window");
    await list.hover(); await small.page.mouse.wheel(0, -600); await small.page.waitForTimeout(400);
    assert.equal(await list.evaluate(el => el.hasAttribute("data-more-below") && !el.hasAttribute("data-more-above")), true);
    await small.page.screenshot({ path: `${out}/short-window.png` });
    await small.context.close();
  });

  await check("touch: a taller trigger and rows, no key hints, and the menu fits a phone", async () => {
    const phone = await newPage({ viewport: { width: 390, height: 844 }, touch: true });
    const trigger = phone.page.locator(".mp__trigger");
    assert.equal((await trigger.boundingBox()).height, 34);
    await trigger.tap(); await phone.page.waitForTimeout(700);
    const box = await phone.page.locator(".mp__pop").boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.width <= 358, `fits the width: ${JSON.stringify(box)}`);
    assert.ok(box.y >= 0 && box.y + box.height <= 844);
    assert.equal(await phone.page.locator(".mp__option").first().evaluate(el => el.getBoundingClientRect().height), 52);
    assert.equal(await phone.page.locator(".mp__keys").isVisible(), false);
    await phone.page.locator('.mp__option[data-id="claude-haiku-5-5"]').tap(); await phone.page.waitForTimeout(500);
    assert.equal(await trigger.getAttribute("aria-label"), "Model: Haiku 5.5");
    await phone.page.screenshot({ path: `${out}/phone.png` });
    await phone.context.close();
  });

  await check("dark theme uses the dark palette", async () => {
    const dark = await newPage();
    await dark.page.evaluate(() => { document.querySelector(".crm-page")?.setAttribute("data-theme", "dark"); });
    await dark.page.locator(".mp__trigger").click(); await dark.page.waitForTimeout(600);
    const colors = await dark.page.evaluate(() => { const style = getComputedStyle(document.querySelector(".mp__pop")); return [style.backgroundColor, getComputedStyle(document.querySelector(".mp")).getPropertyValue("--mp-accent").trim()]; });
    assert.deepEqual(colors, ["rgb(28, 28, 30)", "#4d8dff"]);
    await dark.page.screenshot({ path: `${out}/dark.png` });
    await dark.context.close();
  });

  await check("reduced motion: nothing animates and the figures change at once", async () => {
    const calm = await newPage({ reduced: true });
    await calm.page.locator(".mp__trigger").click(); await calm.page.waitForTimeout(150);
    assert.equal(await calm.page.evaluate(() => document.getAnimations().filter(animation => animation.effect?.target instanceof Element && animation.effect.target.closest(".mp")).length), 0, "no animation or transition of the picker is running");
    await calm.page.locator('.mp__option[data-id="claude-opus-5-5"]').hover(); await calm.page.waitForTimeout(60);
    assert.equal(await caption(calm.page), "~1.5s first token · $20 / M tokens");
    await calm.context.close();
  });

  await check("nothing leaves localhost and the page logs no errors", async () => {
    assert.deepEqual(outside, []);
    assert.deepEqual(errors, []);
  });
  console.log(`\n${results.length} checks passed`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
