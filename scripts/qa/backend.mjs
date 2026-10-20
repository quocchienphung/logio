// Drives the real UI against a mocked REST backend (docs/backend-api.md) to prove that every Guide me section
// loads from the API, saves to it with the documented requests, and reports failures. No real server is used:
// Playwright answers the requests under /mock-api from memory.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { goToSection } from "./lib/nav.mjs";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/backend";
await fs.mkdir(out, { recursive: true });
const analyticsSeed = JSON.parse(await fs.readFile("src/components/sites/affectui-analytics/analytics-seed.json", "utf8"));
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==", "base64");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/** An in-memory server that follows docs/backend-api.md and records every request it gets. */
function createMockApi() {
  const db = new Map(), log = [];
  const state = { failQuery: new Set(), rejectPut: new Map(), uploads: 0 };
  const set = (key, data) => db.set(key, { data, version: String((Number(db.get(key)?.version) || 0) + 1) });
  const days = Array.from({ length: 30 }, (_, index) => ({ label: `Jan ${index + 1}`, value: index < 12 ? 400 + index * 20 : null }));
  const queries = {
    analytics: params => { const period = analyticsSeed.find(item => item.days === Number(params.get("days"))) || analyticsSeed[0]; return { ...period, stats: period.stats.map((stat, index) => index === 0 ? { ...stat, value: 424242 } : stat) }; },
    usage: () => ({ daily: days, categories: [{ label: "Chat", value: 5000 }, { label: "Agents", value: 1000 }], storageUsed: 7.5, resetLabel: "Resets in 3 days", renewsOn: "Jan 3, 2030" }),
    invoices: () => [{ date: "Jan 3, 2030", id: "INV-REMOTE-1", amount: 77, status: "Due" }],
    plans: () => [
      { name: "Remote Basic", price: 10, credits: 1000, seats: 2, storage: 5, description: "From the server", features: ["1,000 credits"] },
      { name: "Remote Plus", price: 30, credits: 5000, seats: 5, storage: 50, description: "From the server", features: ["5,000 credits", "5 seats"] },
    ],
  };
  set("workspaces/acme/companies", [
    { id: "r1", company: "Remote Co One", category: "Productivity", domain: "one.example", owner: "Remote Owner", value: 1200, stage: "New", lastContact: "Today" },
    { id: "r2", company: "Remote Co Two", category: "Productivity", domain: "two.example", owner: "Remote Owner", value: 3400, stage: "Won", lastContact: "Today" },
  ]);
  set("workspaces/acme/contacts", [{ id: "c1", name: "Remote Person", email: "remote@example.com", role: "Tester" }]);
  set("workspaces/acme/settings-api-keys", [{ id: "k1", name: "Server key", prefix: "sk-live-", suffix: "abcd", created: "Jan 1, 2030", lastUsed: "Never" }]);

  async function handle(route) {
    const request = route.request(), url = new URL(request.url()), method = request.method(), headers = request.headers();
    const path = url.pathname.replace(/^\/mock-api/, "");
    let body = null;
    try { body = request.postData() && !headers["content-type"]?.startsWith("multipart") ? JSON.parse(request.postData()) : request.postData() ? "[multipart]" : null; } catch { body = "[unparsed]"; }
    log.push({ method, path, search: url.search, ifMatch: headers["if-match"], ifNoneMatch: headers["if-none-match"], authorization: headers.authorization, body });
    const reply = (status, payload) => route.fulfill({ status, contentType: "application/json", body: payload === undefined ? "" : JSON.stringify(payload) });
    let match;
    if ((match = path.match(/^\/workspaces\/([^/]+)\/queries\/([a-z-]+)$/))) {
      if (state.failQuery.has(match[2])) return reply(503, { error: { message: "The usage service is down." } });
      const answer = queries[match[2]]?.(url.searchParams);
      return answer === undefined ? reply(404) : reply(200, { data: answer });
    }
    if ((match = path.match(/^\/workspaces\/([^/]+)\/commands\/(api-key\.create)$/))) {
      const keys = db.get(`workspaces/${match[1]}/settings-api-keys`).data;
      const key = { id: `k${keys.length + 1}`, name: body.name, prefix: "sk-live-", suffix: "0001", created: "Just now", lastUsed: "Never" };
      set(`workspaces/${match[1]}/settings-api-keys`, [key, ...keys]);
      return reply(200, { data: { key, secret: "sk-remote-secret-0001" } });
    }
    if (path.match(/\/uploads\/(avatar|logo|document)$/)) { state.uploads += 1; return reply(200, { data: { url: `https://cdn.test/upload-${state.uploads}.png` } }); }
    if ((match = path.match(/^\/workspaces\/([^/]+)\/agent-run\/actions$/))) {
      const run = db.get(`workspaces/${match[1]}/agent-run`).data;
      const next = body.type === "approve" ? { ...run, phase: "done", activeId: null, approvals: { ...run.approvals, [body.id]: "approved" }, states: Object.fromEntries(Object.entries(run.states).map(([id, runtime]) => [id, { ...runtime, status: "done" }])) } : run;
      set(`workspaces/${match[1]}/agent-run`, next);
      return reply(200, { data: next });
    }
    if ((match = path.match(/^\/(account|workspaces\/[^/]+)\/([a-z-]+)$/))) {
      const key = `${match[1]}/${match[2]}`, stored = db.get(key);
      if (method === "GET") {
        if (!stored) return reply(404);
        if (headers["if-none-match"] === stored.version) return route.fulfill({ status: 304 });
        return reply(200, { data: stored.data, version: stored.version });
      }
      if (method === "PUT") {
        const rejection = state.rejectPut.get(match[2]);
        if (rejection) return reply(rejection.status, { error: { message: rejection.message } });
        if (stored && headers["if-match"] && headers["if-match"] !== stored.version) return reply(412, { error: { message: "The stored copy changed." } });
        set(key, body.data);
        return reply(200, { version: db.get(key).version });
      }
    }
    return reply(404, { error: { message: `No route for ${method} ${path}` } });
  }
  return { db, log, state, handle, set };
}

const browser = await chromium.launch({ channel: "chrome" });
const errors = [], results = [];
const check = async (name, fn) => { await fn(); results.push(name); console.log(`PASS ${name}`); };

async function remoteContext(api, config = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  await context.addInitScript(extra => {
    window.__workspaceBackendConfig = { baseUrl: "/mock-api", pollMs: 300, debounceMs: 150, headers: () => ({ Authorization: "Bearer test-token" }), ...extra };
  }, config);
  await context.route("**/mock-api/**", route => api.handle(route));
  await context.route("https://cdn.test/**", route => route.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /Encountered two children|Cannot update|hydration|Invalid DOM|unique.*key/i.test(message.text())) errors.push(message.text()); });
  return { context, page };
}
const open = async (page, section = "") => {
  await page.goto(`${base}/personalize${section ? `?section=${section}` : ""}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
};
const puts = (api, resource) => api.log.filter(entry => entry.method === "PUT" && entry.path.endsWith(`/${resource}`));
const gets = (api, text) => api.log.filter(entry => entry.method === "GET" && (entry.path + entry.search).includes(text));

try {
  const api = createMockApi();
  const { context, page } = await remoteContext(api);
  await open(page);
  await page.locator("tbody tr").first().waitFor();

  await check("Companies load from the server, not from the demo data, and every request carries the auth header", async () => {
    assert.equal(await page.locator("tbody tr").count(), 2);
    const text = await page.locator("tbody").innerText();
    assert.match(text, /Remote Co One/); assert.match(text, /Remote Co Two/); assert.doesNotMatch(text, /Notion/);
    assert.equal(await page.evaluate(() => localStorage.getItem("affectui:acme:companies")), null, "no copy is kept in this browser");
    assert.ok(api.log.length > 0 && api.log.every(entry => entry.authorization === "Bearer test-token"));
  });

  await check("an edit is saved with a diff and the stored revision, and the next save uses the new revision", async () => {
    const cell = page.locator("tbody tr").first().locator("td").nth(4);
    await cell.dblclick(); await page.getByRole("textbox", { name: "Edit Owner" }).fill("First owner"); await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".wb-sync").length === 0); await wait(500);
    await cell.dblclick(); await page.getByRole("textbox", { name: "Edit Owner" }).fill("Second owner"); await page.keyboard.press("Enter");
    await wait(900);
    const saves = puts(api, "companies");
    assert.equal(saves.length, 2, JSON.stringify(saves.map(entry => entry.body.changes)));
    assert.deepEqual(saves.map(entry => entry.ifMatch), ["1", "2"]);
    assert.deepEqual(saves[0].body.changes.map(change => [change.op, change.id]), [["update", "r1"]]);
    assert.equal(saves[0].body.data.length, 2); assert.equal(saves[1].body.baseVersion, "2");
    assert.equal(api.db.get("workspaces/acme/companies").data[0].owner, "Second owner");
  });

  await check("a rejected save names the reason in the sidebar and clears after Retry", async () => {
    api.state.rejectPut.set("companies", { status: 422, message: "Company limit reached." });
    const cell = page.locator("tbody tr").nth(1).locator("td").nth(4);
    await cell.dblclick(); await page.getByRole("textbox", { name: "Edit Owner" }).fill("Blocked owner"); await page.keyboard.press("Enter");
    await page.locator('.wb-sync[data-state="error"]').waitFor();
    assert.match(await page.locator(".wb-sync").innerText(), /Company limit reached\./);
    assert.equal(await cell.innerText(), "Blocked owner", "the edit stays on screen");
    api.state.rejectPut.delete("companies");
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector(".wb-sync")); await wait(300);
    assert.equal(api.db.get("workspaces/acme/companies").data[1].owner, "Blocked owner");
    await page.screenshot({ path: `${out}/remote-companies.png` });
  });

  await check("Contacts load from the server", async () => {
    await goToSection(page, "Contacts");
    assert.match(await page.locator("body").innerText(), /Remote Person/);
    assert.ok(gets(api, "/contacts").length >= 1);
  });

  await check("Reports ask the server for the chosen period and show its numbers", async () => {
    await goToSection(page, "Reports", 700);
    await page.locator(".ui-as-rev__stats").waitFor();
    assert.match(await page.locator(".ui-as-rev__stats").innerText(), /424,242/);
    assert.ok(gets(api, "/queries/analytics?days=7").length >= 1);
    await page.locator(".ui-as-rev__period").click(); await page.getByRole("menuitemradio", { name: "Last 30 days", exact: true }).click(); await page.waitForTimeout(600);
    assert.ok(gets(api, "/queries/analytics?days=30").length >= 1);
    assert.match(await page.locator(".ui-as-rev__stats").innerText(), /424,242/);
    await page.screenshot({ path: `${out}/remote-reports.png` });
  });

  await check("Settings billing shows the server's plans, invoices, usage and renewal date", async () => {
    await goToSection(page, "Settings", 700);
    await page.locator(".ui-sb").waitFor();
    const text = await page.locator(".ui-sb").innerText();
    for (const expected of [/Remote Basic/, /Remote Plus/, /INV-REMOTE-1/, /Resets in 3 days/, /Renews on Jan 3, 2030/]) assert.match(text, expected);
    assert.doesNotMatch(text, /INV-2026/);
    await page.screenshot({ path: `${out}/remote-billing.png` });
  });

  await check("API keys: the list has no secrets, a new key is created by the server and its secret is shown once", async () => {
    await page.getByRole("tab", { name: "API keys", exact: true }).click(); await page.waitForTimeout(400);
    assert.match(await page.locator(".ui-sb-list").innerText(), /Server key/);
    assert.equal(await page.getByRole("button", { name: "Copy Server key key" }).count(), 0, "a key without a secret cannot be copied");
    await page.getByRole("button", { name: "Create key", exact: true }).click();
    const input = page.locator(".settings-demo-key"); await input.waitFor();
    assert.equal(await input.inputValue(), "sk-remote-secret-0001");
    const command = api.log.find(entry => entry.path.endsWith("/commands/api-key.create"));
    assert.equal(command.method, "POST"); assert.deepEqual(command.body, { name: "New key 2" });
    await page.getByRole("button", { name: "Done", exact: true }).click(); await page.waitForTimeout(500);
    assert.match(await page.locator(".ui-sb-list").innerText(), /New key 2/);
    await page.getByRole("button", { name: "Server key", exact: true }).click();
    await page.getByLabel("Key name").fill("Renamed key"); await page.getByRole("button", { name: "Save name", exact: true }).click(); await wait(900);
    const saves = puts(api, "settings-api-keys");
    assert.ok(saves.length >= 1 && saves.at(-1).body.changes.some(change => change.op === "update" && change.value.name === "Renamed key"));
    assert.equal(JSON.stringify(api.log).includes("sk-remote-secret"), false, "the secret is never sent back");
    assert.ok(saves.every(entry => entry.body.data.every(key => !("value" in key))), "no key value is ever sent");
  });

  await check("the workspace logo is uploaded to the server and the saved settings keep its URL", async () => {
    await page.getByRole("tab", { name: "General", exact: true }).click(); await page.waitForTimeout(400);
    await page.getByLabel("Upload workspace logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await page.locator('.ui-sb-logo img[src^="https://cdn.test/"]').waitFor();
    await page.getByRole("button", { name: "Save changes", exact: true }).click(); await wait(900);
    assert.ok(api.log.some(entry => entry.method === "POST" && entry.path === "/workspaces/acme/uploads/logo"));
    assert.equal(puts(api, "settings-general").at(-1).body.data.logo, "https://cdn.test/upload-1.png");
  });

  await check("when a read model fails the sample is shown with the reason, and Retry brings the real data", async () => {
    api.state.failQuery.add("usage");
    await open(page, "settings");
    await page.locator('.wb-notice[data-state="error"]').waitFor();
    assert.match(await page.locator(".wb-notice").innerText(), /usage service is down/);
    api.state.failQuery.delete("usage");
    await page.locator(".wb-notice").getByRole("button", { name: "Retry" }).click();
    await page.waitForFunction(() => /Resets in 3 days/.test(document.querySelector(".ui-sb")?.innerText || ""));
    assert.equal(await page.locator(".wb-notice").count(), 0);
  });

  await check("Invoice: the draft is saved to the server and loaded from it after a reload", async () => {
    await goToSection(page, "Invoice", 700);
    await page.locator(".inv-sheet").waitFor(); await page.waitForTimeout(700);
    await page.getByLabel("Line 1 description", { exact: true }).fill("Remote work");
    await page.getByRole("button", { name: "Save draft", exact: true }).click(); await wait(700);
    const saved = puts(api, "invoice").at(-1);
    assert.equal(saved.body.data.version, 1); assert.equal(saved.body.data.lines[0].description, "Remote work");
    await open(page, "invoice"); await page.locator(".inv-sheet").waitFor(); await page.waitForTimeout(700);
    assert.equal(await page.getByLabel("Line 1 description", { exact: true }).inputValue(), "Remote work");
    assert.equal(await page.evaluate(() => localStorage.getItem("affectui:acme:invoice")), null);
  });

  await check("Mapping: edits are saved to the server with their commands and the revision", async () => {
    await goToSection(page, "Mapping", 700);
    await page.locator(".mapping-stage").waitFor(); await page.waitForTimeout(1900);
    await page.getByRole("tab", { name: "Edit", exact: true }).click(); await page.locator(".mapping-stage").focus();
    await page.locator(".mapping-panelBody").getByRole("button", { name: "Add team", exact: true }).click();
    await wait(1500);
    const first = puts(api, "mapping")[0];
    assert.ok(first, "a save request was sent");
    assert.ok(first.body.commands.some(command => command.type === "team.add"), JSON.stringify(first.body.commands));
    assert.equal(first.body.data.version, 1); assert.equal(first.body.data.teams.length, 6);
    assert.equal(first.ifMatch, undefined, "nothing was stored yet, so there is no revision to match");
    // The new team is now open in the panel: renaming it is the second edit.
    await page.locator(".mapping-panelBody").getByLabel("Name", { exact: true }).fill("Remote team"); await wait(1500);
    const second = puts(api, "mapping")[1];
    assert.equal(second.ifMatch, "1", "the second save is based on the revision the first one returned");
    assert.ok(second.body.commands.some(command => command.type === "team.update" && command.patch.name === "Remote team"), JSON.stringify(second.body.commands));
    assert.equal(api.db.get("workspaces/acme/mapping").data.teams.at(-1).name, "Remote team");
  });

  await context.close();

  // Run with the browser simulating the agent: record a snapshot that is waiting for approval.
  const local = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const localPage = await local.newPage();
  await localPage.goto(`${base}/personalize?section=run`, { waitUntil: "networkidle" });
  await localPage.getByRole("button", { name: "Approve", exact: true }).waitFor();
  const waiting = await localPage.evaluate(() => JSON.parse(localStorage.getItem("affectui:acme:agent-run")));
  await local.close();
  assert.equal(waiting.phase, "waiting");

  const driven = createMockApi();
  driven.set("workspaces/acme/agent-run", waiting);
  const remote = await remoteContext(driven, { serverRun: true });
  await check("Run, server-driven: the server's snapshot is shown, nothing ticks locally and actions go to the server", async () => {
    // The run is polled every 300 ms, so the network never goes idle: wait for the page itself.
    await remote.page.goto(`${base}/personalize?section=run`, { waitUntil: "load" });
    await remote.page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await remote.page.getByRole("button", { name: "Approve", exact: true }).waitFor();
    const before = await remote.page.locator(".ui-ar").getAttribute("data-phase");
    assert.equal(before, "waiting");
    await wait(1200);
    assert.ok(gets(driven, "/agent-run").length >= 3, "the run is polled");
    assert.ok(gets(driven, "/agent-run").some(entry => entry.ifNoneMatch), "with a conditional request");
    assert.equal(puts(driven, "agent-run").length, 0, "the browser never saves a run the server drives");
    await remote.page.getByRole("button", { name: "Approve", exact: true }).click();
    await remote.page.waitForFunction(() => document.querySelector(".ui-ar")?.getAttribute("data-phase") === "done");
    const action = driven.log.find(entry => entry.path.endsWith("/agent-run/actions"));
    assert.equal(action.method, "POST"); assert.equal(action.body.type, "approve"); assert.equal(action.body.id, waiting.activeId);
    await remote.page.screenshot({ path: `${out}/remote-run.png` });
  });
  await remote.context.close();

  assert.deepEqual(errors, []);
  console.log(`\n${results.length} checks passed`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
