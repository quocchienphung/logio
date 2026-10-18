// Run against a production server: node scripts/forensics/products/qa/nav-history.mjs [base]
// Optional: BROWSER_CHANNEL=msedge (or chrome), BROWSER_EXECUTABLE_PATH=/path/to/chromium.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const interactionsOnly = process.argv.includes("--interactions-only");
const artifacts = "docs/design-references/navigation-fix";
const routes = [
  "/payments", "/managed-payments", "/payments/payment-links", "/payments/checkout",
  "/payments/elements", "/payments/payment-methods", "/terminal", "/authorization-boost",
  "/payments/link", "/financial-connections", "/billing", "/billing/usage-based-billing",
  "/billing/subscriptions", "/invoicing", "/tax", "/revenue-recognition", "/sigma", "/data-pipeline",
];
const menus = ["Products", "Solutions", "Developers", "Resources"];
const browser = await chromium.launch({
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
});
const results = [];
const errors = [];
await fs.mkdir(artifacts, { recursive: true });

async function check(name, action) {
  try {
    await action();
    results.push({ name, pass: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, pass: false, detail: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    throw error;
  }
}

async function newPage(width, mobile = false, reducedMotion = "reduce") {
  const context = await browser.newContext({
    viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion,
  });
  await context.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(base) || /^(data|blob):/.test(url) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  return page;
}

async function ready(page) {
  await page.locator("[data-navigation-portal]").waitFor({ state: "attached" });
  await page.locator("header.navigation").waitFor();
}

async function closed(page) {
  await page.waitForFunction(() => !document.querySelector(".hds-navigation-menu__positioner"));
  assert.equal(await page.locator("[data-navigation-portal]").count(), 1, "one live portal host");
  assert.equal(await page.locator('header [aria-expanded="true"]').count(), 0, "no stale open trigger");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), "hidden", "scroll is unlocked");
}

async function openMenu(page, label = "Products", mobile = false) {
  if (mobile && await page.locator(".navigation-hamburger-button").getAttribute("aria-expanded") !== "true") {
    await page.locator(".navigation-hamburger-button").click();
  }
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.locator('.hds-navigation-menu__popup[data-status="open"]').waitFor();
  await page.waitForTimeout(100);
}

async function geometry(page, width) {
  const boxes = await page.locator(".navigation__content--products > section, .navigation__content--products > aside").evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  assert.equal(boxes.length, 5);
  const [payments, revenue, money, platforms, more] = boxes;
  if (width >= 940) {
    for (const box of [revenue, money, platforms]) assert.ok(Math.abs(box.y - payments.y) < 2, "four product columns share the top row");
    assert.ok(payments.x < revenue.x && revenue.x < money.x && money.x < platforms.x, "product column order");
    if (width >= 1300) assert.ok(more.x > platforms.x, "More stays in the fifth column");
    else assert.ok(more.y > payments.y, "More sits below the four product columns");
  } else {
    for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].y > boxes[i - 1].y, "mobile sections stack in order");
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
  return boxes;
}

try {
  // Actual menu clicks load product pages. The logo then uses Next Link, retaining the product CSS.
  // Back/Forward must preserve the shared menu geometry and remove old portals and scroll locks.
  for (const mobile of interactionsOnly ? [] : [false, true]) {
    const width = mobile ? 390 : 1677;
    const page = await newPage(width, mobile);
    await page.goto(base);
    await ready(page);
    for (const route of routes) {
      await check(`${width}: menu -> ${route} -> logo -> Back -> Forward`, async () => {
        await openMenu(page, "Products", mobile);
        await geometry(page, width);
        await page.locator(`.navigation__content--products a[href="${route}"]`).click();
        await page.waitForURL(base + route);
        await ready(page);
        await closed(page);
        await openMenu(page, "Products", mobile);
        await geometry(page, width);
        if (route === "/managed-payments") await page.screenshot({ path: `${artifacts}/${width}-products.png` });
        await page.getByRole("link", { name: "Stripe homepage", exact: true }).click();
        await page.waitForURL(base + "/");
        await ready(page);
        await closed(page);
        await openMenu(page, "Products", mobile);
        await geometry(page, width);
        await page.keyboard.press("Escape");
        await closed(page);
        await page.goBack();
        await page.waitForURL(base + route);
        await ready(page);
        await closed(page);
        await openMenu(page, "Products", mobile);
        await geometry(page, width);
        await page.keyboard.press("Escape");
        await closed(page);
        await page.goForward();
        await page.waitForURL(base + "/");
        await ready(page);
        await closed(page);
      });
    }
    await page.context().close();
  }

  // Breakpoint changes with an open menu, including both sides of the two desktop grid changes.
  const page = await newPage(1677, false, "no-preference");
  await page.goto(base + "/billing");
  await ready(page);
  for (const width of [1677, 1300, 1299, 1024, 940, 939, 390, 1440]) {
    await check(`resize ${width}: all menus and Products layout`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      const mobile = width < 940;
      for (const label of menus) {
        await openMenu(page, label, mobile);
        if (label === "Products") await geometry(page, width);
        const popup = await page.locator(".hds-navigation-menu__popup").boundingBox();
        assert.ok(popup && popup.width <= width && popup.x >= -1, "popup stays inside viewport");
        await page.keyboard.press("Escape");
        await closed(page);
      }
      await openMenu(page, "Products", mobile);
      if ([940, 1299].includes(width)) await page.screenshot({ path: `${artifacts}/${width}-products.png` });
    });
    await page.keyboard.press("Escape");
    await closed(page);
  }
  await check("open mobile menu -> desktop -> mobile releases scroll and old submenu", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMenu(page, "Products", true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await closed(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await closed(page);
    await openMenu(page, "Resources", true);
    await page.keyboard.press("Escape");
    await closed(page);
  });
  await check("mobile: repeated close/reopen cancels the previous close timer", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (let i = 0; i < 8; i++) {
      await openMenu(page, "Products", true);
      await geometry(page, 390);
      await page.keyboard.press("Escape");
      await closed(page);
    }
    await openMenu(page, "Products", true);
    await page.waitForTimeout(400);
    await geometry(page, 390);
    await page.keyboard.press("Escape");
    await closed(page);
  });
  await check("desktop hover travel, rapid switches, outside click, keyboard Escape", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Products", exact: true }).hover();
    await page.locator('.hds-navigation-menu__popup[data-status="open"]').waitFor();
    await page.locator('.navigation__content--products a[href="/payments"]').hover();
    await page.waitForTimeout(250);
    await geometry(page, 1440);
    for (const label of [...menus, ...menus.toReversed()]) {
      await page.getByRole("button", { name: label, exact: true }).hover();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.hds-navigation-menu__content[data-status="open"]').count(), 1);
    await geometry(page, 1440);
    await page.mouse.click(5, 880);
    await closed(page);
    await page.keyboard.press("Tab");
    await page.getByRole("button", { name: "Products", exact: true }).focus();
    await page.locator('.hds-navigation-menu__popup[data-status="open"]').waitFor();
    await page.locator('.navigation__content--products a[href="/payments"]').focus();
    await page.keyboard.press("Escape");
    await closed(page);
    assert.equal(await page.getByRole("button", { name: "Products", exact: true }).evaluate((node) => node === document.activeElement), true);
  });
  await check("persisted pageshow handler clears an open menu", async () => {
    await openMenu(page);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    await closed(page);
  });
  await check("partially scrolled header keeps the popup anchored below the navbar", async () => {
    await page.mouse.move(5, 880);
    await page.mouse.wheel(0, 24);
    await page.waitForFunction(() => scrollY >= 20);
    const trigger = await page.getByRole("button", { name: "Products", exact: true }).boundingBox();
    assert.ok(trigger);
    await page.mouse.move(trigger.x + trigger.width / 2, Math.max(2, trigger.y + trigger.height / 2));
    await page.locator('.hds-navigation-menu__popup[data-status="open"]').waitFor();
    const gap = await page.evaluate(() => {
      const nav = document.querySelector("#navigation-menu").getBoundingClientRect();
      const popup = document.querySelector(".hds-navigation-menu__popup").getBoundingClientRect();
      return Math.abs(popup.top - nav.bottom);
    });
    assert.ok(gap <= 1, `popup/header gap: ${gap}`);
    await page.keyboard.press("Escape");
    await closed(page);
  });
  await check("no browser runtime errors", async () => assert.deepEqual(errors, []));
  await page.context().close();
} finally {
  await fs.writeFile(`${artifacts}/results.json`, JSON.stringify({ results, errors }, null, 2) + "\n");
  await browser.close();
}
console.log(`${results.length} navigation regression scenarios passed`);
