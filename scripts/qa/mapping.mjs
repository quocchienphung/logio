import { openWorkspaceMenu } from "./lib/nav.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import { goToSection } from "./lib/nav.mjs";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/mapping/qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1536, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await context.newPage();
const errors = [], results = [], outbound = [];
const watch = target => {
  target.on("pageerror", error => errors.push(error.message));
  target.on("request", request => { const url = new URL(request.url()); if (!["localhost", "127.0.0.1"].includes(url.hostname) && !url.protocol.startsWith("data")) outbound.push(request.url()); });
};
watch(page);
const KEY = "affectui:acme:mapping-data";
const stage = page.locator(".mapping-stage"), crumbs = page.locator(".mapping-crumbs"), panelBody = page.locator(".mapping-panelBody");
async function run(name, callback) { await callback(); results.push({ name, pass: true }); console.log(`PASS ${name}`); }
async function settle(ms = 1750) { await page.waitForTimeout(ms); }
async function keys(...values) { await stage.focus(); for (const value of values) await page.keyboard.press(value); await settle(); }
async function tab(name) { await page.getByRole("tab", { name, exact: true }).click(); }
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), KEY);
const names = () => page.evaluate(() => [...document.querySelectorAll(".mapping-srOnly tbody tr")].map(row => row.children[1].textContent));
async function open(url = `${base}/personalize?section=mapping`, target = page) { await target.goto(url, { waitUntil: "networkidle" }); await target.locator(".mapping-stage").waitFor(); await target.waitForTimeout(1900); }
async function reset() { await keys("0"); }
async function pick(label, option) { await panelBody.getByRole("combobox", { name: label, exact: true }).click(); await page.getByRole("option", { name: new RegExp(`^${option}`) }).first().click(); await page.waitForTimeout(250); }
async function field(label, value) { const input = panelBody.getByLabel(label, { exact: true }); await input.fill(value); }
// World size of the starter data (5 teams, 21 projects) and the camera that fits it, to place real pointer input.
async function worldToScreen(wx, wy, world = { w: 1648, h: 1144 }) {
  const box = await stage.boundingBox(), top = 64, bottom = 60, side = 24;
  const scale = Math.min((box.width - 2 * side) / world.w, (box.height - top - bottom) / world.h);
  return { x: box.x + box.width / 2 + (wx - world.w / 2) * scale, y: box.y + box.height / 2 + (wy - (world.h / 2 - (top - bottom) / 2 / scale)) * scale };
}
try {
  await page.goto(`${base}/personalize?section=mapping`, { waitUntil: "networkidle" });
  await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes("mapping")).forEach(key => localStorage.removeItem(key)));
  await open();
  await run("fills the workspace panel with no container, header or title", async () => {
    assert.equal(await page.getByRole("button", { name: "Mapping", exact: true }).getAttribute("aria-current"), "page");
    assert.equal(await page.getByText("Studio map").count(), 0);
    assert.equal(await page.locator(".mapping-header").count(), 0);
    const root = await page.locator(".mapping-root").evaluate(el => { const style = getComputedStyle(el); return [style.borderTopWidth, style.borderRadius]; });
    assert.deepEqual(root, ["0px", "0px"]);
    const main = await page.locator(".ui-as-main").boundingBox(), body = await page.locator(".mapping-body").boundingBox();
    assert.ok(Math.abs(body.width - (main.width - 2)) <= 2 && Math.abs(body.height - (main.height - 2)) <= 2, `map fills panel: ${JSON.stringify([body, main])}`);
    await page.screenshot({ path: `${out}/desktop-map.png` });
  });
  await run("starter data is generic: User 1..N, no copied names, nothing stored until an edit", async () => {
    const text = await page.locator("body").innerText();
    for (const copied of ["Northstar", "Jasmine", "Billing v2", "Platform", "Studio map"]) assert.ok(!text.includes(copied), copied);
    assert.equal(await stored(), null);
    await tab("People");
    const people = await panelBody.locator('input[aria-label="Name"]').evaluateAll(inputs => inputs.map(input => input.value));
    assert.equal(people.length, 21);
    assert.deepEqual([people[0], people[1], people[20]], ["User 1", "User 2", "User 21"]);
    await tab("Overview");
    assert.match(await panelBody.innerText(), /59%/);
    assert.equal((await names()).length, 21);
  });
  await run("keyboard hierarchy and animated camera", async () => {
    await stage.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
    await page.waitForTimeout(350);
    const mid = await page.locator(".mapping-readout").innerText();
    await settle(); assert.match(await crumbs.innerText(), /Team \d/);
    assert.notEqual(mid, "1.0×");
    await keys("ArrowRight", "Enter"); assert.match(await crumbs.innerText(), /Project \d+/);
    await keys("ArrowRight", "Enter"); assert.match(await crumbs.innerText(), /Task \d+/);
    await page.screenshot({ path: `${out}/desktop-task.png` });
    await reset();
  });
  await run("canvas checklist toggles update rollups and persist across reload", async () => {
    await keys("ArrowRight", "Enter", "ArrowRight", "Enter", "ArrowRight", "Enter");
    const before = await stored(); assert.equal(before, null);
    const box = page.locator("fieldset.mapping-srOnly input").first(), first = await box.isChecked();
    await keys("ArrowDown", "Enter");
    assert.equal(await page.locator("fieldset.mapping-srOnly input").first().isChecked(), !first);
    await page.waitForTimeout(600);
    const saved = await stored(); assert.equal(saved.teams[0].projects[0].tasks[0].checklist[0].done, !first);
    await page.reload({ waitUntil: "networkidle" }); await settle(2000);
    await keys("ArrowRight", "Enter", "ArrowRight", "Enter", "ArrowRight", "Enter");
    assert.equal(await page.locator("fieldset.mapping-srOnly input").first().isChecked(), !first);
    await keys("ArrowDown", "Enter"); await reset();
  });
  await run("edit tab changes names, text, health, dates, status and checklist; the map follows", async () => {
    await tab("Edit");
    assert.match(await panelBody.innerText(), /Workspace name/);
    await field("Workspace name", "Logio studio");
    await page.waitForTimeout(300);
    assert.match(await crumbs.innerText(), /Logio studio/);
    await keys("ArrowRight", "Enter");
    assert.equal(await panelBody.getByLabel("Name", { exact: true }).inputValue(), "Team 1");
    await field("Name", "Platform"); await field("Mission", "Keep every request fast");
    await page.waitForTimeout(300); assert.match(await crumbs.innerText(), /Platform/);
    await page.locator(".mapping-stage").focus(); await keys("ArrowRight", "Enter");
    await field("Name", "Billing"); await pick("Health", "Off track"); await field("Due date", "2027-05-01"); await field("Brief", "Invoices on the new ledger");
    await keys("ArrowRight", "Enter");
    await field("Title", "Backfill invoices"); await field("Description", "Move every invoice across.");
    await pick("Status", "Blocked");
    await pick("Assignee", "User 3");
    await field("Points", "8");
    await panelBody.getByRole("button", { name: "Add step", exact: true }).click();
    await panelBody.locator('input[aria-label="Step name"]').last().fill("Verify totals");
    await page.waitForTimeout(700);
    const saved = await stored(), task = saved.teams[0].projects[0].tasks[0];
    assert.deepEqual([saved.name, saved.teams[0].name, saved.teams[0].mission, saved.teams[0].projects[0].health, saved.teams[0].projects[0].due], ["Logio studio", "Platform", "Keep every request fast", "off-track", "2027-05-01"]);
    assert.deepEqual([task.title, task.description, task.points, task.assigneeId], ["Backfill invoices", "Move every invoice across.", 8, "person-3"]);
    assert.equal(task.checklist.at(-1).label, "Verify totals");
    assert.match(await crumbs.innerText(), /Backfill invoices/);
    await page.screenshot({ path: `${out}/desktop-edit-task.png` });
    await panelBody.getByRole("button", { name: "Remove Verify totals" }).click();
    assert.equal(await panelBody.locator('input[aria-label="Step name"]').filter({ hasText: "" }).evaluateAll(list => list.some(input => input.value === "Verify totals")), false);
    await reset();
  });
  await run("add team, project and task; the camera flies to each; delete needs a second click", async () => {
    await tab("Edit"); await page.locator(".mapping-stage").focus();
    await panelBody.getByRole("button", { name: "Add team", exact: true }).click(); await settle(2000);
    assert.match(await crumbs.innerText(), /Team 6/);
    await panelBody.getByRole("button", { name: "Add project", exact: true }).click(); await settle(2000);
    assert.match(await crumbs.innerText(), /Project 22/);
    await panelBody.getByRole("button", { name: "Add task", exact: true }).click(); await settle(2000);
    assert.match(await crumbs.innerText(), /Task 152/);
    await panelBody.getByRole("button", { name: "Delete task", exact: true }).click();
    assert.equal((await stored()).teams.at(-1).projects[0].tasks.length, 1, "first click only arms");
    await panelBody.getByRole("button", { name: "Click again to confirm" }).click(); await settle(2000);
    assert.equal((await stored()).teams.at(-1).projects[0].tasks.length, 0);
    assert.match(await crumbs.innerText(), /Project 22/);
    await panelBody.getByRole("button", { name: "Delete project", exact: true }).click(); await panelBody.getByRole("button", { name: "Click again to confirm" }).click(); await settle(2000);
    await panelBody.getByRole("button", { name: "Delete team", exact: true }).click(); await panelBody.getByRole("button", { name: "Click again to confirm" }).click(); await settle(2000);
    assert.equal((await stored()).teams.length, 5);
    assert.doesNotMatch(await crumbs.innerText(), /Team 6/);
  });
  await run("people: new users count upward (User n+1), rename, remove clears assignments", async () => {
    await tab("People");
    await panelBody.getByRole("button", { name: "Add user", exact: true }).click();
    await panelBody.getByRole("button", { name: "Add user", exact: true }).click();
    let people = await panelBody.locator('input[aria-label="Name"]').evaluateAll(inputs => inputs.map(input => input.value));
    assert.deepEqual(people.slice(-2), ["User 22", "User 23"]);
    await panelBody.locator('input[aria-label="Name"]').nth(1).fill("Ada Lovelace");
    await panelBody.getByRole("button", { name: "Remove" }).last().click(); await panelBody.getByRole("button", { name: "Confirm" }).click();
    await panelBody.getByRole("button", { name: "Add user", exact: true }).click();
    people = await panelBody.locator('input[aria-label="Name"]').evaluateAll(inputs => inputs.map(input => input.value));
    assert.deepEqual([people[1], people.at(-1), people.length], ["Ada Lovelace", "User 24", 23]);
    await page.waitForTimeout(700);
    const saved = await stored(); assert.equal(saved.seq.person, 24);
    await panelBody.getByRole("button", { name: "Remove" }).nth(2).click(); await panelBody.getByRole("button", { name: "Confirm" }).click(); await page.waitForTimeout(700);
    const after = await stored(); assert.ok(!JSON.stringify(after).includes('"person-3"') || after.people.every(person => person.id !== "person-3"));
    assert.equal(after.teams[0].projects[0].tasks[0].assigneeId, null);
    await tab("Overview");
  });
  await run("drag a team on the map to rearrange; Move later/earlier works from the editor", async () => {
    await reset(); await tab("Edit"); await page.waitForTimeout(300);
    const order = async () => (await stored()).teams.map(team => team.id);
    const before = await order();
    const from = await worldToScreen(120, 40), to = await worldToScreen(1192 + 380, 40);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 8 }); await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.screenshot({ path: `${out}/desktop-drag.png` });
    await page.mouse.up(); await page.waitForTimeout(900);
    const after = await order();
    assert.notDeepEqual(after, before); assert.equal(after.indexOf(before[0]) > 0, true);
    assert.equal((await names())[0].startsWith("Project"), true);
    await keys("ArrowRight", "Enter");
    const moveEarlier = panelBody.getByRole("button", { name: "Move earlier", exact: true });
    const first = (await order()).indexOf(before[1]);
    if (!(await moveEarlier.isDisabled())) { await moveEarlier.click(); await page.waitForTimeout(900); assert.ok((await order()).length === 5); }
    assert.ok(first >= 0);
    await reset();
  });
  await run("wheel anchored zoom, pan drag and minimap", async () => {
    await tab("Overview"); await reset();
    const box = await stage.boundingBox(); await page.mouse.move(box.x + box.width * .3, box.y + box.height * .4); await page.mouse.wheel(0, -450); await settle();
    assert.notEqual(await page.locator(".mapping-readout").innerText(), "1.0×"); assert.equal(await page.locator(".mapping-mini").getAttribute("data-visible"), "true");
    const mini = await page.locator(".mapping-miniCanvas").boundingBox(); await page.mouse.click(mini.x + mini.width * .8, mini.y + mini.height * .7); await settle();
    assert.ok(Number.parseFloat(await page.locator(".mapping-readout").innerText()) > 1);
    await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .4, box.y + box.height * .55, { steps: 12 }); await page.mouse.up(); await settle();
    await reset(); assert.equal(await page.locator(".mapping-readout").innerText(), "1.0×");
  });
  await run("tour advances and user input stops it", async () => {
    await page.getByRole("button", { name: "Take the tour", exact: true }).click();
    await page.waitForTimeout(4200); assert.match(await crumbs.innerText(), /Project \d+/);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click(); await settle();
    assert.equal(await page.getByRole("button", { name: "Take the tour", exact: true }).getAttribute("aria-pressed"), "false");
    await reset();
  });
  await run("export, import, invalid import, clear everything and reload the sample", async () => {
    await tab("Data");
    const [download] = await Promise.all([page.waitForEvent("download"), panelBody.getByRole("button", { name: "Export JSON", exact: true }).click()]);
    const file = `${out}/export.json`; await download.saveAs(file);
    const exported = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(exported.version, 1); assert.equal(exported.teams.length, 5); assert.equal(exported.name, "Logio studio");
    exported.name = "Imported"; exported.teams.length = 2;
    await fs.writeFile(`${out}/import.json`, JSON.stringify(exported));
    await page.getByLabel('Import map JSON file').setInputFiles(`${out}/import.json`); await settle(2000);
    assert.match(await panelBody.innerText(), /Imported 2 teams/); assert.match(await crumbs.innerText(), /Imported/);
    await fs.writeFile(`${out}/bad.json`, '{"version":9}');
    await page.getByLabel('Import map JSON file').setInputFiles(`${out}/bad.json`);
    await page.waitForTimeout(400);
    assert.match(await panelBody.innerText(), /not a valid map export/);
    assert.equal((await stored()).teams.length, 2);
    await panelBody.getByRole("button", { name: "Clear everything", exact: true }).click(); await panelBody.getByRole("button", { name: "Click again to confirm" }).click(); await settle(2000);
    assert.equal(await page.locator(".mapping-empty").isVisible(), true);
    await page.screenshot({ path: `${out}/desktop-empty.png` });
    await page.locator(".mapping-empty").getByRole("button", { name: "Add a team", exact: true }).click(); await settle(2000);
    assert.equal((await stored()).teams.length, 1);
    await tab("Data"); await panelBody.getByRole("button", { name: "Load sample data", exact: true }).click(); await panelBody.getByRole("button", { name: "Click again to confirm" }).click(); await settle(2000);
    assert.equal((await stored()).teams.length, 5); await tab("Overview"); await reset();
  });
  await run("a second tab sees the edit through the data source subscription; workspaces stay separate", async () => {
    const other = await context.newPage(); watch(other);
    await open(`${base}/personalize?section=mapping`, other);
    await tab("Edit"); await field("Workspace name", "Shared name"); await page.waitForTimeout(700);
    await other.waitForTimeout(500);
    assert.match(await other.locator(".mapping-crumbs").innerText(), /Shared name/);
    await other.close();
    await tab("Overview"); await openWorkspaceMenu(page); await page.getByRole("menuitemradio").filter({ hasText: "Personal" }).click(); await settle(2200);
    assert.doesNotMatch(await crumbs.innerText(), /Shared name/);
    assert.match(await crumbs.innerText(), /My workspace/);
    await openWorkspaceMenu(page); await page.getByRole("menuitemradio").filter({ hasText: "Logio" }).click(); await settle(2200);
    assert.match(await crumbs.innerText(), /Shared name/);
  });
  await run("existing Reports, Run, Settings and Companies navigation", async () => {
    for (const [name, selector] of [["Reports", ".ui-an"], ["Run", ".ui-ar"], ["Usage", ".ui-sb"], ["Settings", ".sc-frame"], ["Companies", ".ui-as-crm"]]) {
      await goToSection(page, name, 300);
      if (name === "Reports") await page.getByText("Revenue", { exact: true }).first().waitFor();
      else await page.locator(selector).first().waitFor();
      await goToSection(page, "Mapping", 300); await stage.waitFor(); await settle();
    }
  });
  await run("mobile layout and reduced motion keyboard", async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.reload({ waitUntil: "networkidle" }); await settle();
    const canvas = await stage.boundingBox(), aside = await page.locator(".mapping-panel").boundingBox();
    assert.ok(aside.y >= canvas.y + canvas.height - 1); assert.equal(Math.round(canvas.height), 420);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${out}/mobile-map.png` });
    await keys("ArrowRight", "Enter", "ArrowRight", "Enter", "ArrowRight", "Enter");
    assert.match(await crumbs.innerText(), /Task \d+|Backfill/);
    await tab("Edit"); assert.ok(await panelBody.getByLabel("Title", { exact: true }).isVisible());
    await page.screenshot({ path: `${out}/mobile-edit.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
  await run("touch tap and two-finger pinch", async () => {
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const touch = await touchContext.newPage(); watch(touch);
    await touch.goto(`${base}/personalize?section=mapping`, { waitUntil: "networkidle" }); await touch.waitForTimeout(2400);
    const box = await touch.locator(".mapping-stage").boundingBox();
    const world = { w: 1648, h: 1144 }, top = 56, bottom = 56, side = 12, scale = Math.min((box.width - 2 * side) / world.w, (box.height - top - bottom) / world.h);
    await touch.touchscreen.tap(box.x + box.width / 2 + (336 - world.w / 2) * scale, box.y + box.height / 2 + (278 - (world.h / 2 - (top - bottom) / 2 / scale)) * scale);
    await touch.waitForTimeout(1700);
    assert.match(await touch.locator(".mapping-crumbs").innerText(), /Team 1/);
    const previous = Number.parseFloat(await touch.locator(".mapping-readout").innerText());
    const cdp = await touchContext.newCDPSession(touch), x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 25, y, id: 0 }, { x: x + 25, y, id: 1 }] });
    for (let distance = 30; distance <= 90; distance += 10) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - distance, y, id: 0 }, { x: x + distance, y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await touch.waitForTimeout(1700);
    assert.ok(Number.parseFloat(await touch.locator(".mapping-readout").innerText()) > previous * 2);
    await touchContext.close();
  });
  await run("zoomed-out task blocks: done is green, blocked is red, everything else stays neutral, and a status change recolors live", async () => {
    // 20 projects keep the studio zoomed out, where tasks are small colored blocks. Only project 1 has non-gray tasks.
    const task = (n, status) => ({ id: `task-${n}`, title: `Task ${n}`, description: "", status, assigneeId: null, due: null, points: 1, comments: 0, checklist: [] });
    const data = status => { let n = 0; return { version: 1, name: "Colors", people: [], seq: { person: 0, team: 5, project: 20, task: 120, item: 0 }, teams: Array.from({ length: 5 }, (_, t) => ({ id: `team-${t + 1}`, name: `Team ${t + 1}`, mission: "", leadId: null, memberIds: [], projects: Array.from({ length: 4 }, (_, q) => ({ id: `project-${t * 4 + q + 1}`, name: `Project ${t * 4 + q + 1}`, brief: "", health: "on-track", due: null, leadId: null, blocker: "", tasks: (t === 0 && q === 0 ? ["todo", status, "progress", "blocked", "done", "done"] : Array(6).fill("todo")).map(value => task(++n, value)) })) })) }; };
    const colorful = await browser.newContext({ viewport: { width: 1536, height: 900 }, deviceScaleFactor: 1 });
    const view = await colorful.newPage(); watch(view);
    await view.addInitScript(value => localStorage.setItem("affectui:acme:mapping-data", JSON.stringify(value)), data("todo"));
    await view.goto(`${base}/personalize?section=mapping`, { waitUntil: "networkidle" }); await view.locator(".mapping-stage").waitFor(); await view.waitForTimeout(2600);
    const count = async () => {
      const box = await view.locator(".mapping-stage").boundingBox(), png = PNG.sync.read(await view.screenshot({ clip: box }));
      let green = 0, red = 0, gray = 0;
      for (let i = 0; i < png.data.length; i += 4) { const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]]; if (g > r + 30 && g > b + 20) green++; else if (r > g + 55 && r > b + 35) red++; else if (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r > 120 && r < 215) gray++; }
      return { green, red, gray };
    };
    const before = await count();
    assert.ok(before.green > 40, `two done tasks are green: ${JSON.stringify(before)}`); assert.ok(before.red > 15, "the blocked task is red");
    const ratio = before.green / before.red; assert.ok(ratio > 1.5 && ratio < 2.6, `two green tiles to one red tile: ${ratio.toFixed(2)}`);
    assert.ok(before.gray > 2000, "unstarted tasks stay gray");
    await view.screenshot({ path: `${out}/task-colors.png` });
    // Another tab marks task 2 done: it turns green without a reload.
    await view.evaluate(value => window.dispatchEvent(new StorageEvent("storage", { key: "affectui:acme:mapping-data", newValue: JSON.stringify(value), storageArea: localStorage })), data("done"));
    await view.waitForTimeout(900);
    const after = await count();
    assert.ok(after.green > before.green * 1.35, `a third green tile appears: ${before.green} to ${after.green}`);
    assert.ok(Math.abs(after.red - before.red) < before.red * .15, "the blocked tile keeps its color");
    await colorful.close();
  });
  await run("no request ever leaves localhost (no ARC or other remote API)", async () => {
    assert.deepEqual(outbound, []);
    const source = (await fs.readdir("src/components/sites/mapping")).map(name => `src/components/sites/mapping/${name}`);
    for (const file of source) { const text = await fs.readFile(file, "utf8"); assert.doesNotMatch(text, /uiarc|fetch\(|XMLHttpRequest|WebSocket|sendBeacon/i, file); }
  });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors, outbound }, null, 2));
  await browser.close();
}
