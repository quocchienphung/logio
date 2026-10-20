import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/invoice/qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1536, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [], results = [], outbound = [];
const watch = target => {
  target.on("pageerror", error => errors.push(error.message));
  target.on("request", request => { const url = new URL(request.url()); if (!["localhost", "127.0.0.1"].includes(url.hostname) && !url.protocol.startsWith("data")) outbound.push(request.url()); });
};
watch(page);
const KEY = "affectui:acme:invoice";
async function run(name, callback) { await callback(); results.push({ name, pass: true }); console.log(`PASS ${name}`); }
const input = label => page.getByLabel(label, { exact: true });
const text = selector => page.locator(selector).first().innerText();
const total = () => page.locator(".inv-totalLine output").innerText();
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), KEY);
async function open(url = `${base}/personalize?section=invoice`, target = page) { await target.goto(url, { waitUntil: "networkidle" }); await target.locator(".inv-sheet").waitFor(); await target.waitForTimeout(700); }
async function blur() { await page.locator(".inv-heading h2").click({ position: { x: 5, y: 5 } }); await page.waitForTimeout(400); }
try {
  await page.goto(`${base}/personalize?section=invoice`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await open();
  await run("Invoice is the only page of the Sales group and starts with generic content and the right totals", async () => {
    assert.deepEqual(await page.locator(".ui-as-side__nav .workspace-nav-label").allInnerTexts(), ["Invoice"]);
    assert.equal(await page.getByRole("button", { name: "Invoice", exact: true }).getAttribute("aria-current"), "page");
    const body = await page.locator(".inv-sheet").innerText() + await page.locator(".inv-sheet").evaluate(el => [...el.querySelectorAll("input,textarea")].map(field => field.value).join(" "));
    for (const copied of ["Northstar", "Acme Product", "Discovery", "Hudson", "Spring Street"]) assert.ok(!body.includes(copied), copied);
    assert.equal(await total(), "$2,646.00");
    assert.equal(await text(".inv-totals > div:nth-child(1) .inv-moneySlot"), "$2,450.00");
    assert.equal(await text(".inv-totals > div:nth-child(2) .inv-moneySlot"), "$196.00");
    assert.equal(await stored(), null);
    await page.screenshot({ path: `${out}/desktop.png` });
  });
  await run("totals follow every edit and roll: the new figure slides in from below when it grows and from above when it shrinks", async () => {
    await input("Line 1 quantity").fill("3");
    const grow = await page.evaluate(async () => { const spans = () => [...document.querySelectorAll(".inv-totalLine output .inv-roll > span")].map(span => { const style = getComputedStyle(span); return [span.textContent, +style.opacity, style.filter, new DOMMatrixReadOnly(style.transform).m42]; }); const seen = []; for (let i = 0; i < 14; i++) { seen.push(spans()); await new Promise(resolve => requestAnimationFrame(resolve)); } return seen; });
    await page.waitForTimeout(500);
    assert.equal(await total(), "$4,590.00");
    assert.equal(await text("[aria-label='Line 1 amount']"), "$2,700.00");
    assert.equal(await text(".inv-totals > div:nth-child(1) .inv-moneySlot"), "$4,250.00");
    const overlap = grow.find(frame => frame.length === 2);
    if (overlap) { assert.ok(overlap[0][3] <= 0.01 && overlap[1][3] >= -0.01, `old moves up, new comes from below: ${JSON.stringify(overlap)}`); assert.ok(overlap.some(([, , filter]) => filter.startsWith("blur"))); }
    await input("Line 1 quantity").fill("1"); await page.waitForTimeout(500);
    assert.equal(await total(), "$2,646.00");
    await page.screenshot({ path: `${out}/after-edit.png` });
  });
  await run("number fields count what is typed and tidy up on blur: clamps, whole quantities, cents", async () => {
    const qty = input("Line 2 quantity"), rate = input("Line 2 rate in dollars"), amount = "[aria-label='Line 2 amount']";
    await qty.fill("5"); await page.waitForTimeout(450); assert.equal(await text(amount), "$3,250.00");
    for (const [typed, settled, shown] of [["0", "1", "$650.00"], ["5000", "999", "$649,350.00"], ["-3", "1", "$650.00"], ["2.7", "2", "$1,300.00"]]) { await qty.fill(typed); await blur(); assert.equal(await qty.inputValue(), settled, `qty ${typed}`); assert.equal(await text(amount), shown); }
    await qty.fill(""); await page.waitForTimeout(450); assert.equal(await text(amount), "$0.00", "empty counts as zero while typing");
    await blur(); assert.equal(await qty.inputValue(), "1");
    await rate.fill("1234.5"); await page.waitForTimeout(450); assert.equal(await text(amount), "$1,234.50"); await blur(); assert.equal(await rate.inputValue(), "1234.50");
    for (const [typed, settled] of [["12.3456", "12.35"], ["-5", "0.00"], ["99999999", "1000000.00"]]) { await rate.fill(typed); await blur(); assert.equal(await rate.inputValue(), settled, `rate ${typed}`); }
    await qty.fill("2"); await rate.fill("650"); await blur();
    assert.equal(await total(), "$2,646.00");
  });
  await run("add line: height eases open, focus goes to the new description, defaults are 1 × 0.00; remove: focus goes to Add line item and lines renumber", async () => {
    await page.evaluate(() => { window.__heights = []; const start = performance.now(); const tick = () => { const slots = document.querySelectorAll(".inv-slot"); if (slots.length > 3) window.__heights.push(slots[slots.length - 1].getBoundingClientRect().height); if (performance.now() - start < 700) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await page.getByRole("button", { name: "Add line item", exact: true }).click(); await page.waitForTimeout(800);
    assert.equal(await page.locator(".inv-slot").count(), 4);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Line 4 description");
    assert.equal(await input("Line 4 description").getAttribute("placeholder"), "Describe the work");
    assert.deepEqual([await input("Line 4 quantity").inputValue(), await input("Line 4 rate in dollars").inputValue()], ["1", "0.00"]);
    const heights = await page.evaluate(() => window.__heights);
    assert.ok(heights.some(height => height > 2 && height < 45), `intermediate heights ${heights.slice(0, 8)}`); assert.ok(Math.abs(heights.at(-1) - 49) < 1);
    await page.screenshot({ path: `${out}/added-line.png` });
    await page.getByRole("button", { name: "Remove line 2", exact: true }).click(); await page.waitForTimeout(700);
    assert.equal(await page.locator(".inv-slot").count(), 3);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Add line item");
    assert.equal(await input("Line 2 description").inputValue(), "Line item 3");
    assert.equal(await total(), "$1,242.00", "1 x 900 + 1 x 250 + 1 x 0, plus 8% tax");
    await page.getByRole("button", { name: "Remove line 3", exact: true }).click(); await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Remove line 2", exact: true }).click(); await page.waitForTimeout(600);
    assert.equal(await page.locator(".inv-slot").count(), 1);
    assert.equal(await page.getByRole("button", { name: "Remove line 1", exact: true }).isDisabled(), true, "the last line cannot be removed");
  });
  await run("saving needs a description on every line: the message is announced and focus goes to the empty one", async () => {
    await page.getByRole("button", { name: "Add line item", exact: true }).click(); await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Save draft", exact: true }).click(); await page.waitForTimeout(300);
    assert.equal(await page.locator("[role=status]").innerText(), "Describe each line before saving.");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Line 2 description");
    assert.equal(await stored(), null);
    assert.equal(await page.locator(".inv-save").getAttribute("aria-busy"), null);
  });
  await run("save draft: busy spinner, then Saved with a check; the draft is stored; editing returns the button to Save draft", async () => {
    await input("Line 2 description").fill("Extra scope"); await input("Line 2 rate in dollars").fill("50"); await blur();
    await page.getByRole("button", { name: "Save draft", exact: true }).click(); await page.waitForTimeout(120);
    assert.equal(await page.locator(".inv-save").getAttribute("aria-busy"), "true");
    assert.equal(await page.locator("[role=status]").innerText(), "Saving draft…");
    assert.equal(await page.locator(".inv-save .inv-spin").count(), 1);
    await page.screenshot({ path: `${out}/saving.png`, clip: { x: 800, y: 600, width: 500, height: 200 } });
    await page.waitForTimeout(900);
    assert.equal(await page.locator(".inv-save").getAttribute("data-phase"), "saved");
    assert.equal(await page.locator(".inv-save").innerText(), "Saved");
    assert.equal(await page.locator("[role=status]").innerText(), "Draft saved.");
    const saved = await stored(); assert.equal(saved.lines.length, 2); assert.equal(saved.lines[1].description, "Extra scope");
    await page.screenshot({ path: `${out}/saved.png`, clip: { x: 800, y: 600, width: 500, height: 200 } });
    await input("Line 2 quantity").fill("3"); await blur();
    assert.equal(await page.locator(".inv-save").innerText(), "Save draft");
    await input("Line 2 quantity").fill("1"); await blur();
  });
  await run("the saved draft comes back after a reload; unsaved edits do not", async () => {
    await input("Company name").fill("Unsaved Co"); await blur();
    await page.reload({ waitUntil: "networkidle" }); await page.locator(".inv-sheet").waitFor(); await page.waitForTimeout(500);
    assert.equal(await input("Company name").inputValue(), "Your company");
    assert.equal(await input("Line 2 description").inputValue(), "Extra scope");
    assert.equal(await page.locator(".inv-slot").count(), 2);
  });
  await run("header, parties, dates, note and tax are editable and stay in sync", async () => {
    await input("Company name").fill("Studio North"); await input("Invoice number").fill("2026-042");
    await input("Issue date").fill("2027-01-05"); await input("Due date").fill("2027-02-04");
    await input("From address").fill("1 Main Road\nTown"); await input("Bill to name").fill("Client Ltd"); await input("Bill to address").fill("2 Side Road\nCity");
    await input("Note").fill("Net 30."); await blur();
    assert.equal(await input("From name").inputValue(), "Studio North", "the company name is the From name");
    assert.match(await text(".inv-meta"), /Issued 5 Jan 2027[\s\S]*Due 4 Feb 2027/);
    await input("Tax rate in percent").fill("10"); await blur();
    const subtotal = Number((await text(".inv-totals > div:nth-child(1) .inv-moneySlot")).replace(/[$,]/g, ""));
    assert.equal(await text(".inv-totals > div:nth-child(2) .inv-moneySlot"), `$${(subtotal * 0.1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);
    await page.getByRole("button", { name: "Save draft", exact: true }).click(); await page.waitForTimeout(1000);
    const saved = await stored();
    assert.deepEqual([saved.from.name, saved.number, saved.issued, saved.due, saved.billTo.name, saved.taxRate, saved.note], ["Studio North", "2026-042", "2027-01-05", "2027-02-04", "Client Ltd", 10, "Net 30."]);
  });
  await run("keyboard: Tab walks description, quantity, rate and remove; Enter in a field does not add or submit", async () => {
    await input("Line 1 description").focus();
    const order = []; for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); order.push(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))); }
    assert.deepEqual(order, ["Line 1 quantity", "Line 1 rate in dollars", "Remove line 1", "Line 2 description"]);
    const lines = await page.locator(".inv-slot").count();
    await page.keyboard.press("Enter"); await page.waitForTimeout(300);
    assert.equal(await page.locator(".inv-slot").count(), lines);
  });
  await run("responsive: wide, narrow and phone layouts follow the width of the panel; no horizontal overflow", async () => {
    const seen = new Set();
    for (const width of [1536, 1000, 820, 700, 560, 390, 340]) {
      await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(450);
      const now = await page.evaluate(() => { const frame = document.querySelector(".inv-frame").getBoundingClientRect().width, header = getComputedStyle(document.querySelector(".inv-linesHeader")), line = getComputedStyle(document.querySelector(".inv-line")), label = getComputedStyle(document.querySelector(".inv-mobileLabel")), parties = getComputedStyle(document.querySelector(".inv-parties")), heading = getComputedStyle(document.querySelector(".inv-heading")); return { frame, header: header.display, columns: line.gridTemplateColumns.split(" ").length, gap: line.columnGap, label: label.display, partyColumns: parties.gridTemplateColumns.split(" ").length, heading: heading.flexDirection, overflow: document.documentElement.scrollWidth > innerWidth }; });
      const mode = now.frame > 760 ? "wide" : now.frame > 620 ? "narrow" : "phone";
      seen.add(mode);
      assert.equal(now.overflow, false, `${width}px overflows`);
      if (mode === "wide") assert.deepEqual([now.header, now.columns, now.gap, now.label, now.heading], ["grid", 5, "12px", "none", "row"], `${width}px wide`);
      if (mode === "narrow") assert.deepEqual([now.header, now.columns, now.gap, now.label, now.heading], ["grid", 5, "5px", "none", "column"], `${width}px narrow`);
      if (mode === "phone") assert.deepEqual([now.header, now.columns, now.label], ["none", 3, "block"], `${width}px phone`);
      assert.equal(now.partyColumns, now.frame <= 380 ? 1 : 2, `${width}px parties`);
      if (width === 700 || width === 390) await page.screenshot({ path: `${out}/${mode}-${width}.png`, fullPage: true });
    }
    assert.deepEqual([...seen].sort(), ["narrow", "phone", "wide"]);
    await page.setViewportSize({ width: 1536, height: 1000 }); await page.waitForTimeout(400);
  });
  await run("dark theme uses the dark palette", async () => {
    await page.evaluate(() => document.querySelector(".crm-page").setAttribute("data-theme", "dark")); await page.waitForTimeout(400);
    const colors = await page.evaluate(() => { const style = selector => getComputedStyle(document.querySelector(selector)); return { page: style(".inv-page").backgroundColor, sheet: style(".inv-sheet").backgroundColor, text: style(".inv-heading h2").color, save: style(".inv-save").backgroundColor }; });
    const lightness = value => { const match = /(?:lab|oklch|oklab)\(([\d.]+)(%?)/.exec(value); assert.ok(match, value); const number = Number(match[1]); return match[2] || number > 1 ? number / 100 : number; };
    const [page_, sheet_, text_, save_] = [colors.page, colors.sheet, colors.text, colors.save].map(lightness);
    assert.ok(page_ < .12 && sheet_ < .16 && page_ < sheet_, `dark canvas darker than the dark sheet: ${colors.page} ${colors.sheet}`);
    assert.ok(text_ > .85 && save_ > .85, "light text and a light primary button");
    await page.screenshot({ path: `${out}/dark.png` });
    await page.evaluate(() => document.querySelector(".crm-page").setAttribute("data-theme", "light"));
  });
  await run("reduced motion: lines and figures swap without lingering copies", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" }); await open();
    await input("Line 1 quantity").fill("4"); await page.waitForTimeout(60);
    assert.equal(await page.locator(".inv-totalLine output .inv-roll > span").count(), 1);
    await page.getByRole("button", { name: "Add line item", exact: true }).click(); await page.waitForTimeout(80);
    assert.ok(await page.locator(".inv-slot").last().evaluate(el => el.getBoundingClientRect().height) > 45);
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
  await run("touch: add, edit and save work on a phone", async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const touch = await mobile.newPage(); watch(touch);
    await touch.goto(`${base}/personalize?section=invoice`, { waitUntil: "networkidle" }); await touch.locator(".inv-sheet").waitFor(); await touch.waitForTimeout(600);
    await touch.getByRole("button", { name: "Add line item", exact: true }).tap(); await touch.waitForTimeout(700);
    await touch.getByLabel("Line 4 description", { exact: true }).fill("Phone work"); await touch.getByLabel("Line 4 rate in dollars", { exact: true }).fill("20");
    await touch.getByRole("button", { name: "Save draft", exact: true }).tap(); await touch.waitForTimeout(1100);
    assert.equal(await touch.locator(".inv-save").getAttribute("data-phase"), "saved");
    await mobile.close();
  });
  await run("nothing leaves localhost and the source has no remote calls", async () => {
    assert.deepEqual(outbound, []);
    for (const name of await fs.readdir("src/components/sites/invoice")) { const code = await fs.readFile(`src/components/sites/invoice/${name}`, "utf8"); assert.doesNotMatch(code, /uiarc|fetch\(|XMLHttpRequest|WebSocket|sendBeacon/i, name); }
  });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors, outbound }, null, 2));
  await browser.close();
}
