import { chromium } from "playwright";
const out = "docs/research/model-picker";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/model-picker", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const demo = page.locator(".mdp-demo").first();
await demo.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
// keyframes
const frames = await page.evaluate(() => { const r = []; for (const sheet of document.styleSheets) { let l; try { l = sheet.cssRules; } catch { continue; } const walk = rules => { for (const rule of rules) { if (rule.type === CSSRule.KEYFRAMES_RULE && /ui-mdpc/.test(rule.name)) r.push(rule.cssText); if (rule.cssRules) walk(rule.cssRules); } }; walk(l); } return r; });
console.log("KEYFRAMES\n" + frames.join("\n"));
const state = () => page.evaluate(() => {
  const root = document.querySelector(".ui-mdpc"); const q = s => root.querySelector(s);
  return {
    open: root.hasAttribute("data-open"), trigger: q(".ui-mdpc__trigger").getAttribute("aria-label"), triggerName: q(".ui-mdpc__name").innerText,
    flag: q(".ui-mdpc__flag").hasAttribute("data-on"), active: q(".ui-mdpc__list").getAttribute("aria-activedescendant"), pointing: q(".ui-mdpc__list").hasAttribute("data-pointing"),
    lit: [...root.querySelectorAll(".ui-mdpc__option")].filter(o => o.hasAttribute("data-lit")).map(o => o.id.split("-").pop()),
    activeRows: [...root.querySelectorAll(".ui-mdpc__option")].filter(o => o.hasAttribute("data-active")).map(o => o.id.split("-").pop()),
    selected: [...root.querySelectorAll(".ui-mdpc__option")].filter(o => o.getAttribute("aria-selected") === "true").map(o => o.id.split("-").pop()),
    caption: q(".ui-mdpc__caption").innerHTML.replace(/\s+/g, " ").slice(0, 700), sr: q(".ui-mdpc__sr").textContent,
    switches: [...root.querySelectorAll("[role=switch]")].map(s => s.getAttribute("aria-checked")), foldOpen: q(".ui-mdpc__fold").hasAttribute("data-open"), foldInert: q(".ui-mdpc__fold").hasAttribute("inert"),
    effort: [...root.querySelectorAll("[data-effort]")].map(b => b.getAttribute("aria-checked") + "/" + b.tabIndex), seg: q(".ui-mdpc__segmented").getAttribute("style"), focus: document.activeElement?.className || document.activeElement?.tagName,
  };
});
const log = async (name) => { console.log("\n== " + name + "\n" + JSON.stringify(await state(), null, 1)); };
await log("initial (open by default)");
const opt = id => page.locator(`.ui-mdpc__option[id$="-opt-${id}"]`);
await opt("haiku").hover(); await page.waitForTimeout(700); await log("hover haiku"); await demo.screenshot({ path: `${out}/source-hover-haiku.png` });
await opt("auto").hover(); await page.waitForTimeout(500); await log("hover auto"); await demo.screenshot({ path: `${out}/source-hover-auto.png` });
await page.mouse.move(5, 5); await page.waitForTimeout(500); await log("mouse left the menu");
await opt("haiku").click(); await page.waitForTimeout(150); await log("after click haiku (150ms)"); await page.waitForTimeout(700); await log("after click haiku (850ms)");
await demo.screenshot({ path: `${out}/source-closed-haiku.png` });
await browser.close();
