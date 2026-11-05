import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv.find(argument => /^https?:/.test(argument)) || "http://localhost:3000";
const blockedHost = host => ["stripe.com", "stripedemos.com", "stripe.link", "link.com"].some(domain => host === domain || host.endsWith(`.${domain}`));
const attributes = ["href", "action", "formaction", "data-href", "data-url", "data-submission-url", "data-redirect-url"];
const selector = "a[href],area[href],form[action],[formaction],[data-href],[data-url],[data-submission-url],[data-redirect-url]";
const routes = [];
function findRoutes(directory, segments = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith("[") && !entry.name.startsWith("_")) findRoutes(path.join(directory, entry.name), /^\(.+\)$/.test(entry.name) ? segments : [...segments, entry.name]);
    else if (/^page\.tsx?$/.test(entry.name)) routes.push(`/${segments.join("/")}`);
  }
}
findRoutes("src/app");
const results = { base, noJavaScriptRoutes: [], interactiveRoutes: [], blockedRequests: [], runtimeErrors: [] };
const browser = await chromium.launch({ channel: "chrome" });
try {
  // Inspect actual browser-parsed destinations with JS disabled. Static markup must stand on its own.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  async function audit(page, label) {
    const links = await page.locator(selector).evaluateAll((elements, attributes) => elements.flatMap(element => attributes.flatMap(attribute => {
      const value = element.getAttribute(attribute);
      return value ? [{ tag: element.tagName, attribute, value }] : [];
    })), attributes);
    for (const link of links) {
      const url = new URL(link.value, `${base}/`);
      assert.ok(!blockedHost(url.hostname.toLowerCase().replace(/\.$/, "")), `${label}: outbound ${link.attribute} ${link.value}`);
    }
    return links.length;
  }
  for (const route of process.argv.includes("--live-only") ? [] : routes) {
    const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    assert.equal(response.status(), 200, route);
    const count = await audit(page, route);
    results.noJavaScriptRoutes.push({ route, destinations: count });
    console.log(`No-JS ${route}: ${count} destinations local/allowed`);
  }
  await context.close();
  const interactive = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const active = await interactive.newPage();
  active.on("pageerror", error => { results.runtimeErrors.push(error.stack || error.message); console.error(error.stack || error.message); });
  for (const route of ["/", "/payments/payment-methods", "/invoicing", "/billing", "/personalize?section=run"]) {
    await active.goto(`${base}${route}`, { waitUntil: "load", timeout: 120000 });
    await active.waitForTimeout(900);
    const count = await audit(active, route);
    results.interactiveRoutes.push({ route, destinations: count });
    if (route === "/") {
      for (const label of ["Products", "Solutions", "Developers", "Resources"]) {
        const trigger = active.getByRole("button", { name: label, exact: true }).first();
        if (await trigger.count()) {
          await trigger.hover();
          await active.waitForTimeout(350);
          results.interactiveRoutes.push({ route: `/:menu=${label}`, destinations: await audit(active, label) });
          await active.keyboard.press("Escape");
        }
      }
      // MutationObserver normalizes before the next paint; copied/opened hrefs and form actions stay local.
      await active.evaluate(() => {
        const container = document.createElement("div");
        container.id = "navigation-policy-probe";
        container.innerHTML = '<a href="//docs.stripe.com/api" target="_blank">probe</a><form action="https://checkout.stripe.com/pay"><button formaction="https://example.stripedemos.com/send">probe</button></form><a href="https://dashboard.stripe.com/login">login</a>';
        document.body.append(container);
      });
      await active.waitForFunction(() => document.querySelector("#navigation-policy-probe a")?.getAttribute("href") === "/unavailable/stripe/docs.stripe.com/api");
      assert.equal(await active.locator("#navigation-policy-probe form").getAttribute("action"), "/unavailable/stripe/checkout.stripe.com/pay");
      assert.equal(await active.locator("#navigation-policy-probe a").last().getAttribute("href"), "/login");
      await audit(active, "dynamic DOM navigation");
      await active.locator("#navigation-policy-probe").evaluate(element => element.remove());
    }
  }
  for (const destination of ["/unavailable/stripe", "/unavailable/stripe/docs.stripe.com/api?next=https://stripe.com", "/unavailable/stripe/stripe.com/%2F%2Fstripe.com", "/https%3A%2F%2Fstripe.com/pricing", "/stripe.com/pricing"]) {
    const methods = destination.startsWith("/unavailable/") ? ["GET", "HEAD", "POST", "OPTIONS"] : ["GET"];
    for (const method of methods) {
      const response = await interactive.request.fetch(`${base}${destination}`, { method, maxRedirects: 0 });
      assert.equal(response.status(), 404, `${method} ${destination}`);
      assert.equal(response.headers().location, undefined, destination);
      results.blockedRequests.push({ destination, method, status: response.status() });
    }
  }
  assert.deepEqual(results.runtimeErrors, []);
  await interactive.close();
  fs.mkdirSync("docs/research/local-navigation", { recursive: true });
  fs.writeFileSync("docs/research/local-navigation/qa.json", `${JSON.stringify(results, null, 2)}\n`);
  console.log(`PASS: ${results.noJavaScriptRoutes.length} no-JS routes, ${results.interactiveRoutes.length} live states, ${results.blockedRequests.length} HTTP 404 checks`);
} finally {
  await browser.close();
}
