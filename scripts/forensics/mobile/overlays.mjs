// Overlays at phone widths: menus, dialogs and sheets stay inside the screen (and the page behind does not move sideways while they are open).
// node scripts/forensics/mobile/overlays.mjs [base] [widths]
import { chromium } from "playwright";
const [base = "http://localhost:3000", list = "280,320,390"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const bad = [];
for (const w of list.split(",").map(Number)) {
  const context = await browser.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem("logio-cookie-consent", JSON.stringify({ value: { necessary: true }, version: "1", updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  const measure = async label => {
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const vw = innerWidth, out = [];
      for (const el of document.querySelectorAll('[role="dialog"], dialog[open], [role="menu"], [role="listbox"], .bs-sheet, .sb-menu, .cookie-consent, [data-cookie-consent]')) {
        const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (b.width < 5 || cs.visibility === "hidden" || cs.display === "none" || el.matches(".cc-face") || el.closest("[inert], [aria-hidden=\"true\"], .cc-face")) continue;
        if (b.left < -1 || b.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} L${Math.round(b.left)} R${Math.round(b.right)}`);
      }
      return { out, scrollX: (window.scrollTo(200, 0), scrollX), docW: document.documentElement.scrollWidth };
    });
    if (r.out.length || r.scrollX > 0 || r.docW > w) bad.push(`${w}px ${label}: ${r.out.join(" | ")} scrollX ${r.scrollX} doc ${r.docW}`);
    else console.log(`ok  ${w}px ${label}`);
  };
  await page.goto(base + "/personalize?section=process", { waitUntil: "load" }); await page.waitForTimeout(2500);
  await measure("process");
  await page.getByRole("button", { name: "More process actions" }).click(); await measure("split-button menu");
  await page.getByRole("menuitem", { name: /Saved processes/ }).click(); await measure("saved processes sheet"); await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /New process/ }).first().click(); await measure("new process sheet"); await page.keyboard.press("Escape");
  await page.goto(base + "/personalize?section=companies", { waitUntil: "load" }); await page.waitForTimeout(2500);
  await measure("companies");
  await page.getByRole("button", { name: /Open sidebar/ }).click().catch(() => {}); await measure("sidebar drawer");
  await page.goto(base + "/personalize?section=home&settings=1", { waitUntil: "load" }); await page.waitForTimeout(2500); await measure("settings panel");
  await page.goto(base + "/", { waitUntil: "load" }); await page.waitForTimeout(2500); await measure("home");
  await context.close();
}
console.log(bad.length ? "\nPROBLEMS\n" + bad.join("\n") : "\nno overlay sticks out");
await browser.close();
