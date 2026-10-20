import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { goToSection } from "./lib/nav.mjs";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/combobox/qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1536, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [], results = [];
page.on("pageerror", error => errors.push(error.message));
async function run(name, callback) { await callback(); results.push({ name, pass: true }); console.log(`PASS ${name}`); }
const nav = name => goToSection(page, name, 700);
const box = name => page.getByRole("combobox", { name, exact: true });
const options = () => page.locator(".cbx__pop [role=option]");
const noSelects = async where => assert.equal(await page.locator("select").count(), 0, `native <select> left on ${where}`);
const popCount = () => page.locator(".cbx__pop").count();
const reset = async () => { await page.goto(`${base}/personalize`, { waitUntil: "networkidle" }); await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle" }); };
try {
  await reset();
  await run("single choice: click opens, arrows + Enter pick, Esc and Tab close, type-ahead jumps", async () => {
    await nav("Contacts"); await noSelects("Contacts");
    const sort = box("Sort contacts");
    await sort.click(); await page.locator(".cbx__pop").waitFor();
    assert.equal(await sort.getAttribute("aria-expanded"), "true");
    assert.equal(await options().count(), 2);
    assert.equal(await page.locator('.cbx__pop [aria-selected="true"]').innerText(), "Name A–Z");
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    assert.equal(await sort.inputValue(), "Most companies"); assert.equal(await popCount(), 0);
    await sort.press("Escape"); assert.equal(await popCount(), 0);
    await sort.press("ArrowDown"); await page.locator(".cbx__pop").waitFor(); assert.equal(await page.locator(".cbx__pop [data-active]").innerText(), "Most companies");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400); assert.equal(await popCount(), 0);
    await sort.press("n"); await page.locator(".cbx__pop").waitFor();
    assert.equal(await page.locator(".cbx__pop [data-active]").innerText(), "Name A–Z");
    await page.keyboard.press("Tab"); await page.waitForTimeout(400); assert.equal(await popCount(), 0);
    assert.notEqual(await sort.evaluate(el => el === document.activeElement), true);
  });
  await run("filter by owner narrows the board; the board card stage picker moves a deal", async () => {
    await nav("Deals"); await noSelects("Deals");
    await box("Filter deals by owner").click(); await page.getByRole("option", { name: "Lea Braun", exact: true }).click(); await page.waitForTimeout(500);
    assert.equal(await page.locator(".ui-as-board__card").count(), 3);
    await box("Filter deals by owner").click(); await page.getByRole("option", { name: "All owners", exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Open Notion", exact: true }).focus(); await page.keyboard.press("Tab");
    const stage = box("Move Notion to stage");
    assert.equal(await stage.inputValue(), "Negotiation");
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/board-stage.png` });
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(900);
    assert.equal(await box("Move Notion to stage").inputValue(), "Won");
  });
  await run("searchable list: accent-insensitive filter, highlighted matches, empty state, first match active", async () => {
    await nav("Mapping");
    await page.locator(".mapping-stage").waitFor(); await page.waitForTimeout(1800);
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.locator(".mapping-stage").focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await page.waitForTimeout(1800);
    await noSelects("Mapping team");
    const lead = box("Lead");
    assert.equal(await lead.inputValue(), "User 1");
    await lead.click(); await page.locator(".cbx__pop").waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".cbx__pop [data-active]").innerText().then(text => text.includes("User 1")), true, "opens on the selected row");
    await page.keyboard.type("user 1"); await page.waitForTimeout(450);
    assert.equal(await page.locator(".cbx__pop mark").first().isVisible(), true);
    assert.ok(await options().count() >= 11);
    assert.match(await page.locator(".cbx__pop [data-active]").innerText(), /User 1\b/);
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    assert.equal(await lead.inputValue(), "User 10");
    await lead.click(); await page.keyboard.type("zzzz"); await page.waitForTimeout(400);
    assert.match(await page.locator(".cbx__empty").innerText(), /No results for “zzzz”/);
    await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    assert.equal(await lead.inputValue(), "User 10", "Esc leaves the value alone");
    await page.waitForTimeout(600);
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("affectui:acme:mapping-data")));
    assert.equal(saved.teams[0].leadId, "person-10");
  });
  await run("multiple choice: chips, +N, backspace removes, footer count, form value", async () => {
    const members = box("Members");
    await members.click(); await page.locator(".cbx__pop").waitFor();
    assert.equal(await page.locator(".cbx__foot .cbx__count").innerText().then(t => /5 selected/.test(t.replace(/\s+/g, " "))), true);
    for (const name of ["User 6", "User 7", "User 8", "User 9"]) { await page.getByRole("option", { name: new RegExp(`^${name}`) }).click(); await page.waitForTimeout(120); }
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.cbx__pop [aria-selected="true"]').count(), 9);
    assert.equal(await page.locator(".cbx__more").isVisible(), true, "extra chips roll up into +N");
    await page.screenshot({ path: `${out}/multi-chips.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const before = await page.locator(".cbx__chips .cbx__chip").count();
    await members.focus(); await page.keyboard.press("Backspace");
    assert.equal(await page.locator(".cbx__chip[data-armed]").count() + await page.locator(".cbx__more").count() > 0, true);
    await page.keyboard.press("Backspace"); await page.waitForTimeout(500);
    await page.waitForTimeout(600);
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("affectui:acme:mapping-data")));
    assert.equal(saved.teams[0].memberIds.length, 8);
    assert.ok(before >= 1);
    await page.locator(".cbx__chips .cbx__chip-x").first().click(); await page.waitForTimeout(600);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("affectui:acme:mapping-data"))).teams[0].memberIds.length, 7);
  });
  await run("mapping project and task fields use the same control with status and health dots", async () => {
    await page.locator(".mapping-stage").focus(); await page.keyboard.press("0"); await page.waitForTimeout(1500);
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await page.waitForTimeout(1800);
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await page.waitForTimeout(1800);
    await box("Health").click();
    assert.equal(await page.locator(".cbx__pop .cbx__dot").count(), 3);
    await page.getByRole("option", { name: "Off track", exact: true }).click(); await page.waitForTimeout(500);
    assert.equal(await box("Health").inputValue(), "Off track");
    await page.locator(".mapping-stage").focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await page.waitForTimeout(1800);
    await box("Status").click(); await page.getByRole("option", { name: "Blocked", exact: true }).click(); await page.waitForTimeout(400);
    await box("Assignee").click(); await page.keyboard.type("3"); await page.waitForTimeout(300); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    assert.match(await box("Assignee").inputValue(), /User 3|User 13/);
    await noSelects("Mapping task");
  });
  await run("the list sits above a modal dialog; Esc closes the list before the dialog; the pick submits with the form", async () => {
    await nav("Companies");
    await page.getByRole("button", { name: "New view", exact: true }).click(); await page.locator("dialog[open]").waitFor();
    await noSelects("New view dialog");
    await page.getByLabel("View name").fill("Board for Lea");
    await box("Layout").click(); await page.locator(".cbx__pop").waitFor(); await page.waitForTimeout(350);
    const probe = await page.evaluate(() => { const option = document.querySelector(".cbx__pop [role=option]"), rect = option.getBoundingClientRect(); const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return option === hit || option.contains(hit); });
    assert.equal(probe, true, "list is hit-testable above the dialog");
    await page.screenshot({ path: `${out}/dialog-open.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(350);
    assert.equal(await popCount(), 0); assert.equal(await page.locator("dialog[open]").count(), 1, "dialog survives the first Esc");
    await box("Layout").click(); await page.getByRole("option", { name: "Board", exact: true }).click(); await page.waitForTimeout(300);
    await box("Owner").click(); await page.getByRole("option", { name: "Lea Braun", exact: true }).click(); await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Create view", exact: true }).click(); await page.waitForTimeout(900);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.locator(".ui-as-board").first().waitFor();
    assert.equal(await page.locator(".ui-as-board__card").count(), 3);
  });
  await run("Settings invite role and Appearance travel with their forms", async () => {
    await nav("Settings"); await page.getByRole("tab", { name: "Members", exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Invite", exact: true }).click(); await page.locator("dialog[open]").waitFor(); await noSelects("Invite dialog");
    await page.getByLabel("Email address").fill("qa-viewer@example.com");
    await box("Role").click(); await page.getByRole("option", { name: "Viewer", exact: true }).click(); await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Save invitation", exact: true }).click(); await page.waitForTimeout(800);
    assert.match(await page.locator(".ui-sb-row", { hasText: "qa-viewer@example.com" }).innerText(), /Viewer/);
    await page.locator(".ui-as-user").click(); await page.getByRole("menuitem", { name: "Appearance & notifications", exact: true }).click(); await page.locator("dialog[open]").waitFor();
    await noSelects("Appearance dialog");
    await box("Appearance").click(); await page.getByRole("option", { name: "Dark", exact: true }).click(); await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Save settings", exact: true }).click(); await page.waitForTimeout(700);
    assert.equal(await page.locator(".crm-page").getAttribute("data-theme"), "dark");
  });
  await run("dark theme: field, list, highlight and text use the dark palette", async () => {
    await nav("Contacts"); await box("Sort contacts").click(); await page.locator(".cbx__pop").waitFor(); await page.waitForTimeout(400);
    const colors = await page.evaluate(() => { const style = selector => getComputedStyle(document.querySelector(selector)); return { field: style(".cbx__field").backgroundColor, pop: style(".cbx__pop").backgroundColor, text: style(".cbx__name").color, pill: style(".cbx__pill").backgroundColor }; });
    assert.deepEqual([colors.field, colors.pop], ["rgb(28, 28, 30)", "rgb(28, 28, 30)"]);
    assert.equal(colors.text, "rgba(255, 255, 255, 0.9)"); assert.equal(colors.pill, "rgba(255, 255, 255, 0.08)");
    await page.screenshot({ path: `${out}/dark-open.png` });
    await page.keyboard.press("Escape");
    await page.locator(".ui-as-user").click(); await page.getByRole("menuitem", { name: "Appearance & notifications", exact: true }).click(); await page.locator("dialog[open]").waitFor();
    await box("Appearance").click(); await page.getByRole("option", { name: "Light", exact: true }).click(); await page.getByRole("button", { name: "Save settings", exact: true }).click(); await page.waitForTimeout(600);
    assert.equal(await page.locator(".crm-page").getAttribute("data-theme"), "light");
  });
  await run("motion: the list eases in, fades out and unmounts, the highlight glides, the chevron turns", async () => {
    await nav("Contacts");
    const field = box("Sort contacts");
    await page.evaluate(() => { window.__frames = []; const start = performance.now(); const tick = () => { const pop = document.querySelector(".cbx__pop"); if (pop) { const style = getComputedStyle(pop); window.__frames.push([Math.round(performance.now() - start), Number(style.opacity), style.transform, pop.dataset.state]); } if (performance.now() - start < 900) requestAnimationFrame(tick); }; window.__sample = () => requestAnimationFrame(tick); });
    await page.evaluate(() => window.__sample());
    await field.click(); await page.waitForTimeout(950);
    const frames = await page.evaluate(() => window.__frames);
    const first = frames[0], last = frames.at(-1);
    assert.ok(first[1] < .6, `starts transparent: ${first[1]}`); assert.ok(last[1] === 1);
    assert.ok(frames.some(frame => frame[1] > .1 && frame[1] < .95), "has in-between frames");
    const rotated = await page.locator(".cbx[data-open] .cbx__toggle .cbx__glyph").evaluate(el => getComputedStyle(el).transform);
    assert.notEqual(rotated, "none");
    // the highlight moves with a transition and fades when the pointer leaves
    const rows = options(); const second = await rows.nth(1).boundingBox();
    const before = await page.locator(".cbx__pill").evaluate(el => getComputedStyle(el).transform);
    await page.mouse.move(second.x + 30, second.y + 10); await page.waitForTimeout(30);
    const mid = await page.locator(".cbx__pill").evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(250);
    const after = await page.locator(".cbx__pill").evaluate(el => getComputedStyle(el).transform);
    assert.notEqual(after, before); assert.equal([before, after].includes(mid) && mid === before, false, "pill is mid-flight or already there");
    await page.mouse.move(second.x + second.width + 80, second.y - 150); await page.waitForTimeout(400);
    assert.equal(await page.locator(".cbx__pill").evaluate(el => getComputedStyle(el).opacity), "0");
    // closing keeps the node for the exit animation, then removes it
    await page.keyboard.press("Escape"); await page.waitForTimeout(40);
    assert.equal(await page.locator('.cbx__pop[data-state="closing"]').count(), 1);
    await page.waitForTimeout(420); assert.equal(await popCount(), 0);
  });
  await run("small viewport: the list flips above the field and stays inside the window", async () => {
    await page.setViewportSize({ width: 1536, height: 620 }); await nav("Mapping"); await page.waitForTimeout(1500);
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.locator(".mapping-stage").focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await page.waitForTimeout(1800);
    await box("Lead").click(); await page.locator(".cbx__pop").waitFor(); await page.waitForTimeout(500);
    const geometry = await page.evaluate(() => { const pop = document.querySelector(".cbx__pop").getBoundingClientRect(), field = document.querySelector(".cbx__field").getBoundingClientRect(); return { side: document.querySelector(".cbx__pop").dataset.side, popTop: pop.top, popBottom: pop.bottom, fieldTop: field.top, fieldBottom: field.bottom, height: innerHeight }; });
    assert.ok(geometry.popTop >= 0 && geometry.popBottom <= geometry.height, JSON.stringify(geometry));
    assert.ok(geometry.popBottom <= geometry.fieldTop + 1 || geometry.popTop >= geometry.fieldBottom - 1, "never covers the field");
    await page.screenshot({ path: `${out}/small-viewport.png` });
    await page.keyboard.press("Escape"); await page.setViewportSize({ width: 1536, height: 900 });
  });
  await run("reduced motion: no animations run when the list opens", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" }); await nav("Contacts");
    await box("Sort contacts").click(); await page.locator(".cbx__pop").waitFor(); await page.waitForTimeout(30);
    assert.equal(await page.locator(".cbx__pop").evaluate(el => getComputedStyle(el).animationName), "none");
    await page.keyboard.press("Escape"); await page.waitForTimeout(60); assert.equal(await popCount(), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
  await run("touch screens: 44px rows, 16px text, the list fits the field width", async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const touch = await mobile.newPage(); touch.on("pageerror", error => errors.push(error.message));
    await touch.goto(`${base}/personalize`, { waitUntil: "networkidle" });
    await touch.getByRole("button", { name: "Open sidebar", exact: true }).tap(); await touch.waitForTimeout(500);
    await touch.locator(".workspace-nav-label").getByText("Contacts", { exact: true }).tap(); await touch.waitForTimeout(800);
    const sort = touch.getByRole("combobox", { name: "Sort contacts", exact: true });
    await sort.tap(); await touch.locator(".cbx__pop").waitFor(); await touch.waitForTimeout(400);
    const metrics = await touch.evaluate(() => { const row = document.querySelector(".cbx__pop [role=option]").getBoundingClientRect(), pop = document.querySelector(".cbx__pop").getBoundingClientRect(), field = document.querySelector(".cbx__field").getBoundingClientRect(), input = getComputedStyle(document.querySelector(".cbx__input")); return { row: row.height, font: input.fontSize, popWidth: Math.round(pop.width), fieldWidth: Math.round(field.width), inside: pop.left >= 0 && pop.right <= innerWidth }; });
    assert.equal(metrics.row, 44); assert.equal(metrics.font, "16px"); assert.equal(metrics.popWidth, metrics.fieldWidth); assert.equal(metrics.inside, true);
    await touch.getByRole("option", { name: "Most companies", exact: true }).tap(); await touch.waitForTimeout(500);
    assert.equal(await sort.inputValue(), "Most companies"); assert.equal(await touch.locator(".cbx__pop").count(), 0);
    await mobile.close();
  });
  await run("document dialog: the Folder choice moves the document into the folder", async () => {
    await nav("Companies"); await page.getByRole("button", { name: "Sales docs", exact: true }).click(); await page.locator(".workspace-doc-toolbar").waitFor();
    await page.getByRole("button", { name: "Create folder", exact: true }).click(); await page.getByLabel("Name", { exact: true }).fill("Combobox folder");
    await page.locator("dialog[open]").getByRole("button", { name: "Create folder", exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole("button", { name: "New document", exact: true }).click(); await page.getByLabel("Name", { exact: true }).fill("Folder note"); await page.getByRole("button", { name: "Create document", exact: true }).click(); await page.waitForTimeout(500);
    await noSelects("document dialog");
    await box("Folder").click(); await page.getByRole("option", { name: "Combobox folder", exact: true }).click(); await page.waitForTimeout(400);
    assert.equal(await box("Folder").inputValue(), "Combobox folder");
    await page.screenshot({ path: `${out}/document-folder.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    if (await page.locator("dialog[open]").count()) await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Combobox folder", exact: true }).click(); await page.waitForTimeout(400);
    assert.ok(await page.getByText("Folder note").first().isVisible());
  });
  await run("no native <select> remains anywhere in the workspace screens", async () => {
    for (const name of ["Home", "Companies", "Contacts", "Deals", "Reports", "Run", "Mapping", "Invoice", "Settings"]) { await nav(name); await noSelects(name); }
  });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
