import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { openWorkspaceMenu } from "./lib/nav.mjs";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/affectui-assistant/qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const passed = [], failures = [], runtimeErrors = [], contexts = [];
const result = { base, backend: "Intercepted HTTP fixtures only; no live backend contacted", passed, failures, runtimeErrors };
const check = async (name, fn) => {
  try { await fn(); passed.push(name); console.log(`PASS ${name}`); }
  catch (error) {
    failures.push({ name, message: error.message, stack: error.stack }); console.error(`FAIL ${name}: ${error.message}`);
    const active = contexts.at(-1)?.pages()[0];
    if (active) await active.screenshot({ path: `${out}/failure-${failures.length}.png` }).catch(() => {});
  }
};
async function context(options = {}) {
  const value = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", ...options });
  contexts.push(value);
  return value;
}
async function pageFor(ctx) {
  const page = await ctx.newPage(); page.setDefaultTimeout(12000);
  page.on("pageerror", error => runtimeErrors.push(error.message));
  return page;
}
async function open(page) {
  await page.goto(`${base}/personalize?section=new-chat`, { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Message", exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('textarea[aria-label="Message"]')?.disabled);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}
const draft = page => page.getByRole("textbox", { name: "Message", exact: true });
async function waitFor(predicate, page, description) {
  const deadline = Date.now() + 12000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error(`Timed out: ${description}`); await page.waitForTimeout(30); }
}
async function selectOptions(page, folder = "Research") {
  await page.getByRole("button", { name: "Model: Auto", exact: true }).click();
  await page.getByRole("option", { name: /^Sonnet 5\.5/ }).click();
  await page.getByRole("button", { name: "Plugins", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: /Web search/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Work in a folder", exact: true }).click();
  await page.getByRole("menuitemradio", { name: folder, exact: true }).click();
}

function fixture() {
  const requests = [], sends = [], cancellations = [], uploads = [];
  const now = "2026-10-20T10:00:00.000Z";
  const saved = { id: "saved-chat", title: "Saved server conversation", updatedAt: now, messages: [{ id: "saved-reply", role: "assistant", content: "Restored old conversation", createdAt: now }] };
  const stores = new Map([["acme", new Map([[saved.id, saved]])], ["personal", new Map()]]);
  const folders = new Map([["acme", ["Research", "Brand assets"]], ["personal", []]]);
  let failNext = true, slowReply, restoredReply;
  const state = { requests, sends, cancellations, uploads, stores, folders, delayRestore: false, releaseSlow: () => slowReply?.(), releaseRestore: () => restoredReply?.() };
  const respond = async (route, data, status = 200) => { try { await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status >= 400 ? { error: { message: data } } : { data }) }); } catch { /* Browser cancellation is an expected branch. */ } };
  state.install = async ctx => {
    await ctx.addInitScript(() => { window.__workspaceBackendConfig = { baseUrl: "/__assistant-test-api", headers: () => ({ "X-Assistant-Test": "session" }) }; });
    await ctx.route("**/__assistant-test-api/**", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname.replace("/__assistant-test-api/", ""), method = req.method();
      requests.push({ path, method, auth: req.headers()["x-assistant-test"] });
      if (path === "account/workspaces") return respond(route, [{ id: "acme", name: "Logio" }, { id: "personal", name: "Personal" }]);
      if (path === "account/profile") return respond(route, { name: "Alex Morgan", email: "alex@logio.com", role: "Head of Sales", avatar: "" });
      const match = /^workspaces\/([^/]+)\/(.+)$/.exec(path);
      if (!match) return method === "PUT" ? respond(route, req.postDataJSON()?.data) : respond(route, "No fixture for this resource", 404);
      const workspace = decodeURIComponent(match[1]), endpoint = match[2], history = stores.get(workspace) || new Map();
      if (endpoint === "folders") {
        if (method === "PUT") folders.set(workspace, req.postDataJSON().data);
        return respond(route, folders.get(workspace) || []);
      }
      if (!endpoint.startsWith("assistant/")) return method === "PUT" ? respond(route, req.postDataJSON()?.data) : respond(route, "Resource has no stored value", 404);
      if (endpoint === "assistant/threads") return respond(route, [...history.values()].map(value => ({ id: value.id, title: value.title, updatedAt: value.updatedAt, ...(value.folderId ? { folderId: value.folderId } : {}) })));
      if (endpoint === "assistant/integrations") return respond(route, [{ id: "drive", name: "Google Drive", connected: false }]);
      if (endpoint === "assistant/integrations/drive/connect") return respond(route, { authorizationUrl: `${base}/__assistant-auth-fixture` });
      if (endpoint === "assistant/attachments") {
        uploads.push({ type: req.headers()["content-type"], body: req.postDataBuffer()?.toString("utf8") });
        return respond(route, { id: "upload-1", name: "qa-notes.txt", type: "text/plain", size: 8, url: "/__assistant-file-fixture" });
      }
      if (/\/requests\/[^/]+\/cancel$/.test(endpoint)) { cancellations.push(endpoint); return respond(route, { cancelled: true }); }
      if (endpoint === "assistant/messages") {
        const input = req.postDataJSON(); sends.push({ input, key: req.headers()["idempotency-key"], workspace });
        if (input.text === "Retry with attachment" && failNext) { failNext = false; return respond(route, "Fixture temporarily unavailable", 503); }
        if (input.text === "Slow request") await new Promise(resolve => { slowReply = resolve; });
        const old = history.get(input.threadId);
        const user = { id: input.clientMessageId, role: "user", content: input.text, createdAt: now, attachments: input.attachments };
        const reply = { id: `reply-${input.clientMessageId}`, role: "assistant", content: input.text === "Slow request" ? "LATE RESPONSE MUST STAY HIDDEN" : "Server reply <b id=unsafe-html>plain text only</b>", createdAt: now };
        const thread = { id: input.threadId, title: input.text, updatedAt: now, ...(input.folderId ? { folderId: input.folderId } : {}), messages: [...(old?.messages || []).filter(item => item.id !== input.clientMessageId), user, reply] };
        history.set(thread.id, thread);
        return respond(route, { thread, requestId: input.clientMessageId });
      }
      const threadMatch = /^assistant\/threads\/([^/]+)$/.exec(endpoint);
      if (threadMatch) {
        const id = decodeURIComponent(threadMatch[1]);
        if (method === "DELETE") { history.delete(id); return respond(route, { deleted: true }); }
        if (state.delayRestore && id === "saved-chat") await new Promise(resolve => { restoredReply = resolve; });
        return history.has(id) ? respond(route, history.get(id)) : respond(route, "Conversation not found", 404);
      }
      return respond(route, "Unknown assistant fixture endpoint", 404);
    });
  };
  return state;
}

try {
  const offline = await context(), page = await pageFor(offline);
  await open(page);
  await check("No backend: draft persists after Send and reload; no fabricated reply", async () => {
    await draft(page).fill("Offline message remains a draft");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Connect the workspace backend" }).waitFor();
    assert.equal(await draft(page).inputValue(), "Offline message remains a draft");
    assert.equal(await page.getByRole("log", { name: "Conversation" }).count(), 0);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="Message"]')?.value === "Offline message remains a draft");
  });
  await check("Source model/plugin/folder menus and created folder persist in browser", async () => {
    await selectOptions(page);
    await page.getByRole("button", { name: "Research", exact: true }).click();
    await page.getByRole("textbox", { name: "New folder name", exact: true }).fill("Assistant QA folder");
    await page.getByRole("button", { name: "Create folder", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Model: Sonnet 5.5", exact: true }).waitFor();
    await page.getByRole("button", { name: "Assistant QA folder", exact: true }).waitFor();
    await page.getByRole("button", { name: "Plugins", exact: true }).click();
    assert.equal(await page.getByRole("menuitemcheckbox", { name: /Web search/ }).getAttribute("aria-checked"), "true");
    await page.keyboard.press("Escape");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("affectui:acme:folders")));
    assert.ok(saved.includes("Assistant QA folder"));
  });
  await check("Shift+Enter inserts newline, Enter submits, Invite opens Members settings", async () => {
    await draft(page).fill("First line"); await draft(page).press("Shift+Enter"); await draft(page).type("Second line");
    assert.equal(await draft(page).inputValue(), "First line\nSecond line");
    await draft(page).press("Enter");
    await page.getByRole("alert").filter({ hasText: "Connect the workspace backend" }).waitFor();
    await page.getByRole("button", { name: "Invite people", exact: true }).click();
    await page.waitForURL(/section=settings.*settings-tab=members/);
    await page.getByRole("heading", { name: "Members", exact: true }).waitFor();
  });
  await open(page);
  await check("Mobile composer and top-layer menus remain inside viewport", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Model: Sonnet 5.5", exact: true }).click();
    const box = await page.locator('.mp__pop:popover-open').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${out}/local-mobile-menu.png` });
    await page.keyboard.press("Escape");
  });

  const mocked = fixture(), connected = await context(); await mocked.install(connected);
  result.mockRequests = mocked.requests;
  const remote = await pageFor(connected); await open(remote);
  await check("Real HTTP contract: authenticated upload and send payload, failed retry is idempotent", async () => {
    await selectOptions(remote);
    await remote.getByRole("button", { name: "Add file", exact: true }).click();
    await remote.getByRole("textbox", { name: "Message", exact: true }).waitFor();
    await remote.getByLabel("Attach files", { exact: true }).setInputFiles({ name: "qa-notes.txt", mimeType: "text/plain", buffer: Buffer.from("QA notes") });
    await waitFor(() => mocked.uploads.length === 1, remote, "upload request");
    await draft(remote).fill("Retry with attachment");
    await remote.getByRole("button", { name: "Send", exact: true }).click();
    await remote.getByRole("button", { name: "Retry message", exact: true }).waitFor();
    assert.equal(await remote.locator('.assistant-message[data-role="user"]').count(), 1);
    await remote.getByRole("button", { name: "Retry message", exact: true }).click();
    await remote.getByText("Server reply <b id=unsafe-html>plain text only</b>", { exact: true }).waitFor();
    assert.equal(await remote.locator("#unsafe-html").count(), 0);
    assert.equal(await remote.locator('.assistant-message[data-role="user"]').count(), 1);
    assert.equal(await remote.locator(".ui-as-attachments").count(), 0);
    const [first, retry] = mocked.sends;
    assert.equal(first.key, retry.key); assert.equal(first.input.clientMessageId, retry.input.clientMessageId);
    assert.deepEqual(first.input, retry.input);
    assert.equal(retry.input.model, "claude-sonnet-5-5"); assert.deepEqual(retry.input.plugins, ["web-search"]); assert.equal(retry.input.folderId, "Research"); assert.equal(retry.input.attachments[0].id, "upload-1");
    assert.match(mocked.uploads[0].type, /multipart\/form-data; boundary=/); assert.match(mocked.uploads[0].body, /QA notes/);
    assert.ok(mocked.requests.every(item => item.auth === "session"));
    await remote.screenshot({ path: `${out}/local-server-chat.png` });
  });
  await check("Reload restores server history, delete removes the saved conversation", async () => {
    const activeId = mocked.sends.at(-1).input.threadId;
    await remote.reload({ waitUntil: "networkidle" });
    await remote.getByText("Server reply <b id=unsafe-html>plain text only</b>", { exact: true }).waitFor();
    await remote.getByRole("button", { name: "Recent chats", exact: true }).click();
    await remote.getByRole("button", { name: "Delete Retry with attachment", exact: true }).click();
    await remote.getByRole("button", { name: "Delete conversation", exact: true }).click();
    await waitFor(() => !mocked.stores.get("acme").has(activeId), remote, "server delete");
    await remote.keyboard.press("Escape");
  });
  await check("Stop invokes backend cancellation and ignores a late response", async () => {
    await remote.getByRole("button", { name: "New conversation", exact: true }).click();
    await draft(remote).fill("Slow request"); await draft(remote).press("Enter");
    await waitFor(() => mocked.sends.at(-1)?.input.text === "Slow request", remote, "slow send");
    const sentBeforeStop = mocked.sends.length;
    await remote.getByRole("button", { name: "Stop response", exact: true }).click();
    await waitFor(() => mocked.cancellations.length === 1, remote, "cancel request");
    assert.ok(mocked.cancellations[0].includes(mocked.sends.at(-1).input.clientMessageId));
    mocked.releaseSlow(); await remote.waitForTimeout(200);
    assert.equal(mocked.sends.length, sentBeforeStop, "Stop must not submit the restored draft as another message");
    assert.equal(await remote.getByText("LATE RESPONSE MUST STAY HIDDEN", { exact: true }).count(), 0);
    assert.equal(await draft(remote).inputValue(), "Slow request");
  });
  await check("Server integrations return connection status; explicit Connect opens authorization", async () => {
    await remote.getByRole("button", { name: /Connect apps/ }).click();
    await remote.locator('.assistant-integrations > div > span').filter({ hasText: /^Google Drive/ }).waitFor();
    assert.ok(await remote.getByText("Not connected", { exact: true }).isVisible());
    const popupEvent = remote.waitForEvent("popup");
    await remote.getByRole("button", { name: "Connect", exact: true }).click();
    const popup = await popupEvent; await popup.waitForURL(`${base}/__assistant-auth-fixture`); await popup.close();
    assert.ok(await remote.getByText("Not connected", { exact: true }).isVisible());
    await remote.keyboard.press("Escape");
  });
  await check("Workspace switch isolates composer preferences, history and uploaded files", async () => {
    await remote.getByRole("button", { name: "New conversation", exact: true }).click();
    await draft(remote).fill("Only Logio draft");
    await openWorkspaceMenu(remote); await remote.getByRole("menuitemradio", { name: /Personal/ }).click();
    await remote.getByRole("button", { name: "Model: Auto", exact: true }).waitFor();
    assert.equal(await draft(remote).inputValue(), ""); assert.equal(await remote.getByRole("log", { name: "Conversation" }).count(), 0);
    assert.equal(await remote.locator(".ui-as-attachments").count(), 0);
    await draft(remote).fill("Only Personal draft");
    await openWorkspaceMenu(remote); await remote.getByRole("menuitemradio", { name: /Logio/ }).click();
    await remote.getByRole("button", { name: "Model: Sonnet 5.5", exact: true }).waitFor();
    await remote.waitForFunction(() => document.querySelector('textarea[aria-label="Message"]')?.value === "Only Logio draft");
    assert.ok(mocked.requests.some(item => item.path === "workspaces/personal/assistant/threads"));
  });
  const racing = fixture(), raceContext = await context(); racing.delayRestore = true; await racing.install(raceContext);
  await raceContext.addInitScript(() => { if (!localStorage.getItem("assistant-qa-seeded")) { localStorage.setItem("affectui:acme:assistant-session", JSON.stringify({ draft: "", model: "auto", plugins: [], activeThreadId: "saved-chat" })); localStorage.setItem("assistant-qa-seeded", "1"); } });
  const racePage = await pageFor(raceContext);
  await check("New chat aborts initial restored-thread GET; delayed old content cannot overwrite it", async () => {
    // Do not wait for networkidle: the intentionally delayed GET remains pending.
    await racePage.goto(`${base}/personalize?section=new-chat`, { waitUntil: "domcontentloaded" });
    await racePage.getByRole("button", { name: "New conversation", exact: true }).waitFor();
    await waitFor(() => racing.requests.some(item => item.path.endsWith("assistant/threads/saved-chat")), racePage, "restore GET");
    await racePage.getByRole("button", { name: "New conversation", exact: true }).click();
    await draft(racePage).fill("New draft after cancelled restore");
    racing.releaseRestore(); await racePage.waitForTimeout(200);
    assert.equal(await racePage.getByText("Restored old conversation", { exact: true }).count(), 0);
    assert.equal(await draft(racePage).inputValue(), "New draft after cancelled restore");
    assert.equal(await racePage.getByRole("log", { name: "Conversation" }).count(), 0);
  });
  await check("Browser runtime has no uncaught errors", async () => assert.deepEqual(runtimeErrors, []));
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ ...result, completedAt: new Date().toISOString() }, null, 2));
  for (const ctx of contexts) await ctx.close();
  await browser.close();
}
if (failures.length) process.exitCode = 1;
