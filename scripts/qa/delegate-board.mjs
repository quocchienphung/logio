// Delegate Board QA in the Project Management frame of /personalize?browse=1: logos, alignment, fit at many sizes,
// mouse and touch drag, keyboard, Auto, tooltip, dark mode.
// Usage: node scripts/qa/delegate-board.mjs [base-url]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/delegate-board/qa";
await fs.mkdir(out, { recursive: true });
const url = base + "/personalize?browse=1&group=project-management";
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
const errors = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); };

const state = page => page.evaluate(() => {
  const all = selector => [...document.querySelectorAll(selector)];
  return {
    pile: all(".dgb__task-title").map(element => element.textContent),
    count: document.querySelector(".dgb__count")?.textContent,
    agents: all(".dgb__agent").map(agent => ({
      name: agent.querySelector(".dgb__name").textContent, model: agent.querySelector(".dgb__model")?.textContent,
      tag: agent.querySelector(".dgb__tag").textContent, price: agent.querySelector(".dgb__price")?.textContent ?? null,
      chips: [...agent.querySelectorAll(".dgb__chip-title")].map(chip => chip.textContent),
      more: agent.querySelector(".dgb__chip--more")?.textContent ?? null, target: agent.hasAttribute("data-target"),
    })),
    spend: document.querySelector(".dgb__spend")?.textContent,
    group: new URL(location.href).searchParams.get("group"), ghost: !!document.querySelector(".dgb__ghost"),
    active: document.querySelector(".guide-item[aria-current] .guide-item__name")?.textContent,
  };
});
const centre = async (page, selector) => { const box = await page.locator(selector).first().boundingBox(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
async function open(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push("pageerror " + error.message));
  page.on("console", message => { if (message.type() === "error") errors.push("console " + message.text().slice(0, 160)); });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".dgb__task");
  await page.waitForTimeout(800);
  return { context, page };
}
const agentSel = name => `.dgb__agent:has(.dgb__name:text-is("${name}"))`;
const taskSel = title => `.dgb__task:has-text("${title}")`;

/** Geometry in design pixels (the board is designed 380 wide), so numbers compare across viewport sizes. */
const geometry = page => page.evaluate(() => {
  const root = document.querySelector(".dgb");
  const origin = root.getBoundingClientRect();
  const k = origin.width / 380;
  const box = element => { const r = element.getBoundingClientRect(); return { left: (r.left - origin.left) / k, right: (r.right - origin.left) / k, top: (r.top - origin.top) / k, bottom: (r.bottom - origin.top) / k }; };
  const rows = [...root.querySelectorAll(".dgb__agent")].map(box);
  const tasks = [...root.querySelectorAll(".dgb__task")].map(box);
  const pile = box(root.querySelector(".dgb__pile"));
  const bar = box(root.querySelector(".dgb__bar"));
  const pitch = rows.slice(1).map((row, index) => row.top - rows[index].top);
  return {
    k, width: origin.width, height: origin.height,
    overflowY: root.scrollHeight - root.clientHeight, overflowX: root.scrollWidth - root.clientWidth,
    rightEdges: [box(root.querySelector(".dgb__switch")).right, box(root.querySelector(".dgb__spend")).right, ...[...root.querySelectorAll(".dgb__tag")].map(tag => box(tag).right)],
    headTops: [...root.querySelectorAll(".dgb__head")].map(head => box(head).top),
    pitchSpread: pitch.length ? Math.max(...pitch) - Math.min(...pitch) : 0,
    insetTop: pile.top - bar.bottom, insetBottom: 401 - pile.bottom,
    lastRowBottom: rows.at(-1).bottom, tasksInsidePile: tasks.every(task => task.left >= pile.left && task.right <= pile.right && task.bottom <= pile.bottom),
    truncated: [...root.querySelectorAll(".dgb__chip-title, .dgb__name, .dgb__model")].filter(element => element.scrollWidth > element.clientWidth + 0.5).map(element => element.textContent),
    marks: [...root.querySelectorAll(".dgb__mark")].map(mark => { const r = mark.getBoundingClientRect(); return [r.width, r.height]; }),
    marksOutside: [...root.querySelectorAll(".dgb__tool, .dgb__avatar")].filter(box => { const outer = box.getBoundingClientRect(); const inner = box.querySelector(".dgb__mark")?.getBoundingClientRect(); return inner && (inner.width > outer.width + 0.5 || inner.height > outer.height + 0.5); }).length,
    taskHeights: tasks.map(task => task.bottom - task.top),
  };
});
const near = (list, tolerance) => Math.max(...list) - Math.min(...list) <= tolerance;

// ---------- logos, alignment and fit at many sizes
{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
  const info = await page.evaluate(() => ({
    avatars: [...document.querySelectorAll(".dgb__avatar")].map(avatar => [avatar.hasAttribute("data-logo"), avatar.querySelectorAll("svg path").length > 0, avatar.querySelector("svg")?.getAttribute("viewBox")]),
    tools: [...document.querySelectorAll(".dgb__task")].map(task => [task.querySelector(".dgb__task-title").textContent, [...task.querySelectorAll(".dgb__tool")].map(tool => tool.title)]),
    chips: [...document.querySelectorAll(".dgb__chip:not([data-running])")].map(chip => [...chip.querySelectorAll(".dgb__tool")].map(tool => tool.title)),
    gradient: !!document.querySelector("#dgb-gemini"), gradientCount: document.querySelectorAll("#dgb-gemini").length,
  }));
  check("every agent avatar is a real logo tile", info.avatars.length === 4 && info.avatars.every(([logo, hasPath]) => logo && hasPath), JSON.stringify(info.avatars));
  check("tasks show the tool logos in order", JSON.stringify(info.tools) === JSON.stringify([["Write release notes", ["Notion", "GitHub"]], ["Fix checkout test", ["GitHub"]], ["Summarize churn calls", ["Slack", "HubSpot"]], ["Update pricing page", ["Figma"]]]), JSON.stringify(info.tools));
  check("a waiting chip shows its tool logo", JSON.stringify(info.chips) === JSON.stringify([["Stripe"]]), JSON.stringify(info.chips));
  check("Gemini gradient is defined once", info.gradient && info.gradientCount === 1);
  const initial = await state(page);
  check("agents carry their model names from the app's model list", JSON.stringify(initial.agents.map(agent => agent.model)) === JSON.stringify(["Opus 5.5", "Sonnet 5.5", "GPT-6.1 Sol", "Gemini"]), JSON.stringify(initial.agents.map(agent => agent.model)));
  const colors = await page.evaluate(() => { const mark = [...document.querySelectorAll(".dgb__mark[data-mono]")][0]; const light = getComputedStyle(mark).color; document.documentElement.setAttribute("data-theme", "dark"); const dark = getComputedStyle(mark).color; const card = getComputedStyle(document.querySelector(".dgb")).backgroundColor; document.documentElement.removeAttribute("data-theme"); return { light, dark, card }; });
  check("black marks turn white in dark mode", colors.light === "rgb(0, 0, 0)" && colors.dark === "rgb(255, 255, 255)" && colors.card === "rgb(28, 28, 31)", JSON.stringify(colors));
  await context.close();
}

const sizes = [
  ["320x640 phone", { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["390x844 phone", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["844x390 phone landscape", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["768x1024 tablet", { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 2 }],
  ["1440x900 laptop", { viewport: { width: 1440, height: 900 } }],
  ["1920x1080 wide", { viewport: { width: 1920, height: 1080 } }],
];
for (const [label, options] of sizes) {
  const { context, page } = await open(options);
  const rest = await geometry(page);
  check(`${label}: card is 380:401 and nothing overflows`, Math.abs(rest.height / rest.k - 401) < 1 && rest.overflowY <= 1 && rest.overflowX <= 1, `${rest.width}x${rest.height} oy ${rest.overflowY} ox ${rest.overflowX}`);
  check(`${label}: edges align (right edge, column heads, row pitch, insets)`, near(rest.rightEdges, 0.6) && near(rest.headTops, 0.6) && rest.pitchSpread < 0.6 && Math.abs(rest.insetTop - rest.insetBottom) < 1.2 && rest.tasksInsidePile, JSON.stringify({ r: rest.rightEdges, h: rest.headTops, p: rest.pitchSpread, t: rest.insetTop, b: rest.insetBottom }));
  check(`${label}: no label is cut off, every logo fits its box and the cards share one height`, rest.truncated.length === 0 && rest.marks.length === 11 && rest.marks.every(([w, h]) => w > 4 && h > 4) && rest.marksOutside === 0 && rest.taskHeights.every(height => Math.abs(height - rest.taskHeights[0]) < 0.6), JSON.stringify({ cut: rest.truncated, marks: rest.marks.length, outside: rest.marksOutside, heights: rest.taskHeights }));
  // worst case: Auto hands everything over, so every agent queue is as full as it gets
  await page.click(".dgb__auto");
  await page.waitForFunction(() => document.querySelectorAll(".dgb__task").length === 0, null, { timeout: 8000 });
  await page.waitForTimeout(900);
  await page.click(".dgb__auto");
  const full = await geometry(page);
  check(`${label}: fully loaded queues still fit`, full.overflowY <= 1 && full.overflowX <= 1 && full.lastRowBottom <= 401 && near(full.rightEdges, 0.6) && full.pitchSpread < 0.6, JSON.stringify({ oy: full.overflowY, last: full.lastRowBottom, spread: full.pitchSpread }));
  if (label.startsWith("390") || label.startsWith("1440")) await page.locator(".guide-preview").screenshot({ path: `${out}/frame-${label.split(" ")[0]}-loaded.png` });
  await context.close();
}

// ---------- desktop, mouse
{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
  let s = await state(page);
  check("initial", s.pile.length === 4 && s.count === "4" && s.spend === "56 min in queues" && s.agents[0].tag === "Busy until 09:20" && s.agents[1].tag === "Free" && s.agents[2].tag === "Busy until 09:36" && s.agents[0].name === "Planner", JSON.stringify(s.agents.map(agent => agent.tag)));
  await page.locator(".guide-preview").screenshot({ path: `${out}/frame-desktop.png` });

  const from = await centre(page, taskSel("Write release"));
  const to = await centre(page, agentSel("Writer"));
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(from.x + 3, from.y + 1);
  s = await state(page); check("below slop no drag", !s.ghost);
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 }); await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.waitForTimeout(150);
  s = await state(page);
  check("ghost + target + preview while dragging", s.ghost && s.agents[1].target && s.agents[1].tag === "+12m until 09:12" && s.agents[1].price === null, JSON.stringify(s.agents[1]));
  await page.locator(".guide-preview").screenshot({ path: `${out}/drag-desktop.png` });
  await page.mouse.up(); await page.waitForTimeout(700);
  s = await state(page);
  check("drop hands over", s.pile.length === 3 && s.agents[1].chips[0] === "Write release notes" && s.agents[1].tag === "Busy until 09:12" && s.spend === "1 h 8 min in queues" && !s.ghost && s.group === "project-management", JSON.stringify({ pile: s.pile.length, writer: s.agents[1], spend: s.spend }));
  await page.mouse.move(0, 0);

  const chip = await centre(page, ".dgb__chip:has-text('Write release')"); const pile = await centre(page, ".dgb__tasks");
  await page.mouse.move(chip.x, chip.y); await page.mouse.down(); await page.mouse.move(pile.x, pile.y, { steps: 10 }); await page.waitForTimeout(100);
  const over = await page.evaluate(() => document.querySelector(".dgb__pile").hasAttribute("data-over"));
  await page.mouse.up(); await page.waitForTimeout(700); s = await state(page);
  check("chip dropped on pile unassigns", over && s.pile.length === 4 && s.agents[1].chips.length === 0 && s.agents[1].tag === "Free", String(over));

  const outside = await centre(page, taskSel("Fix checkout")); await page.mouse.move(outside.x, outside.y); await page.mouse.down(); await page.mouse.move(outside.x + 100, 20, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(400);
  s = await state(page); check("drop outside the board keeps it", s.pile.length === 4 && !s.ghost);

  const esc = await centre(page, taskSel("Fix checkout")); const escTo = await centre(page, agentSel("Ops"));
  await page.mouse.move(esc.x, esc.y); await page.mouse.down(); await page.mouse.move(escTo.x, escTo.y, { steps: 10 }); await page.keyboard.press("Escape"); await page.mouse.up(); await page.waitForTimeout(400);
  s = await state(page); check("Esc cancels drag", s.pile.length === 4 && !s.ghost && s.agents[3].chips.length === 0);

  for (const title of ["Fix checkout", "Summarize churn"]) {
    const a = await centre(page, taskSel(title)); const d = await centre(page, agentSel("Coder"));
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(d.x, d.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(600);
  }
  s = await state(page); check("queue past the limit shows +N", s.agents[2].chips.length === 2 && s.agents[2].more === "+2", JSON.stringify(s.agents[2]));
  await page.hover(".dgb__chip--more"); await page.waitForTimeout(300);
  const tip = await page.evaluate(() => { const t = document.querySelector(".dgb__tip"); const r = t.getBoundingClientRect(), c = document.querySelector(".dgb").getBoundingClientRect(); return { visible: getComputedStyle(t).visibility, inside: r.left >= c.left && r.right <= c.right && r.top >= c.top, text: t.textContent, marks: t.querySelectorAll(".dgb__mark").length }; });
  check("tooltip lists the rest with logos and stays inside the card", tip.visible === "visible" && tip.inside && /Fix checkout test/.test(tip.text) && /Summarize churn calls/.test(tip.text) && tip.marks >= 3, JSON.stringify(tip));
  await page.locator(".guide-preview").screenshot({ path: `${out}/tooltip-desktop.png` });
  await context.close();
}

// ---------- keyboard
{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
  await page.focus(taskSel("Write release")); await page.keyboard.press("Enter");
  let s = await state(page);
  check("Enter picks up and previews the first agent", s.agents[0].target && s.agents[0].tag === "+12m until 09:32", JSON.stringify(s.agents[0]));
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); s = await state(page);
  check("arrows move the highlight", s.agents[2].target && !s.agents[0].target);
  await page.keyboard.press("Escape"); s = await state(page);
  check("Esc puts it back", s.pile.length === 4 && !s.agents.some(agent => agent.target));
  await page.focus(taskSel("Write release")); await page.keyboard.press("Enter"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(600);
  s = await state(page);
  check("Enter hands over to the chosen agent, focus follows", s.agents[1].chips[0] === "Write release notes" && (await page.evaluate(() => document.activeElement?.textContent)) === "Write release notes", JSON.stringify(s.agents[1].chips));
  await page.focus(taskSel("Fix checkout")); await page.keyboard.press("4"); await page.waitForTimeout(600); s = await state(page);
  check("number key hands over at once", s.agents[3].chips[0] === "Fix checkout test");
  await page.keyboard.press("0"); await page.waitForTimeout(600); s = await state(page);
  check("0 returns it to Unassigned", s.pile.includes("Fix checkout test") && s.agents[3].chips.length === 0);
  const toggle = await page.evaluate(() => { const element = document.querySelector(".dgb__auto"); return [element.getAttribute("role"), element.getAttribute("aria-checked")]; });
  check("auto is a switch", toggle[0] === "switch" && toggle[1] === "false");
  await context.close();
}

// ---------- auto mode
{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
  await page.click(".dgb__auto"); await page.waitForTimeout(700);
  let s = await state(page);
  check("auto hands tasks over about one a second", s.pile.length === 3 && s.agents[1].chips.length === 1, "pile " + s.pile.length);
  await page.waitForTimeout(3600); s = await state(page);
  const total = s.agents.reduce((sum, agent) => sum + agent.chips.length + (agent.more ? Number(agent.more.slice(1)) : 0), 0);
  check("auto empties the pile to whoever is free first", s.pile.length === 0 && total === 7, JSON.stringify(s.agents.map(agent => [agent.chips, agent.more])));
  check("empty note", await page.locator(".dgb__empty").count() === 1);
  await context.close();
}

// ---------- phone, real touch
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const cdp = await context.newCDPSession(page);
  const touch = async points => { for (let i = 0; i < points.length; i++) await cdp.send("Input.dispatchTouchEvent", { type: i === 0 ? "touchStart" : "touchMove", touchPoints: [points[i]] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.waitForTimeout(700); };
  const line = (a, c, n = 12) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (c.x - a.x) * i / n, y: a.y + (c.y - a.y) * i / n }));
  const a = await centre(page, taskSel("Update pricing")); const d = await centre(page, agentSel("Ops"));
  const before = await page.evaluate(() => scrollY);
  await touch(line(a, d));
  let s = await state(page);
  check("touch drag hands a task over (no swipe, no scroll)", s.agents[3].chips[0] === "Update pricing page" && s.group === "project-management" && s.active === "Project Management" && (await page.evaluate(() => scrollY)) === before, JSON.stringify({ chips: s.agents[3].chips, group: s.group }));
  const a2 = await centre(page, taskSel("Fix checkout")); const d2 = await centre(page, agentSel("Writer"));
  await touch(line(a2, d2, 14));
  s = await state(page); check("touch drag to a second agent", s.agents[1].chips[0] === "Fix checkout test" && s.group === "project-management");
  for (const title of ["Write release", "Summarize churn"]) {
    const from = await centre(page, taskSel(title)); const to = await centre(page, agentSel("Coder"));
    await touch(line(from, to, 14));
  }
  s = await state(page); check("touch fills a queue past the limit", s.agents[2].more === "+2" && s.group === "project-management", JSON.stringify(s.agents[2]));
  const tipVisibility = () => page.evaluate(() => getComputedStyle(document.querySelector(".dgb__tip")).visibility);
  const more = await centre(page, ".dgb__chip--more");
  await page.touchscreen.tap(more.x, more.y); await page.waitForTimeout(400);
  check("tapping +N opens its list", (await tipVisibility()) === "visible");
  const away = await centre(page, ".dgb__bar"); await page.touchscreen.tap(away.x, away.y); await page.waitForTimeout(400);
  check("tapping elsewhere closes it", (await tipVisibility()) === "hidden");
  const bar = await geometry(page);
  check("coarse pointers keep the layout (bar stays 53, hit area grows)", await page.evaluate(() => { const bar = document.querySelector(".dgb__bar").getBoundingClientRect(); const k = document.querySelector(".dgb").getBoundingClientRect().width / 380; const hit = getComputedStyle(document.querySelector(".dgb__auto"), "::after").content; return Math.abs(bar.height / k - 53) < 1 && hit === '""'; }) && bar.overflowY <= 1);
  await touch(line({ x: 330, y: 150 }, { x: 60, y: 155 }, 10));
  s = await state(page); check("horizontal swipe outside the board still changes group", s.active !== "Project Management", String(s.active));
  await context.close();
}
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console/page errors");
const passed = results.filter(result => result.ok).length;
console.log(passed === results.length ? "ALL PASS" : "SOME FAILED", `${passed}/${results.length}`);
await fs.writeFile(out + "/results.json", JSON.stringify({ base, checks: results, errors }, null, 2) + "\n");
await browser.close();
if (passed !== results.length || errors.length) process.exit(1);
