import { chromium } from "playwright";
const out = "docs/research/model-picker";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/model-picker", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const demo = page.locator(".mdp-demo").first();
await demo.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
const snap = () => page.evaluate(() => { const r = document.querySelector(".ui-mdpc"); const q = s => r.querySelector(s); return { open: r.hasAttribute("data-open"), trigger: q(".ui-mdpc__trigger").getAttribute("aria-label"), name: q(".ui-mdpc__name").innerText.replace(/\n/g, "|"), flag: q(".ui-mdpc__flag").hasAttribute("data-on"), cap: q(".ui-mdpc__caption").innerText.replace(/\n/g, "|"), sw: [...r.querySelectorAll("[role=switch]")].map(s => s.getAttribute("aria-checked")).join(","), fold: q(".ui-mdpc__fold").hasAttribute("data-open") + "/" + q(".ui-mdpc__fold").hasAttribute("inert"), eff: [...r.querySelectorAll("[data-effort]")].map(b => b.getAttribute("aria-checked") === "true" ? b.dataset.effort : "").join(""), seg: q(".ui-mdpc__segmented").getAttribute("style"), focus: document.activeElement?.getAttribute("aria-label") || document.activeElement?.className || document.activeElement?.tagName, sr: q(".ui-mdpc__sr").textContent }; });
const show = async (n) => console.log(n.padEnd(34), JSON.stringify(await snap()));
// outside click closes?
{ const box = await demo.boundingBox(); await page.mouse.click(box.x + box.width - 40, box.y + 30); } await page.waitForTimeout(500); await show("outside click");
// keyboard open
await page.locator(".ui-mdpc__trigger").focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(500); await show("Enter on trigger");
await page.keyboard.press("ArrowDown"); await page.waitForTimeout(100); await show("ArrowDown");
await page.keyboard.press("End"); await page.waitForTimeout(100); await show("End");
await page.keyboard.press("Home"); await page.waitForTimeout(100); await show("Home");
await page.keyboard.press("ArrowUp"); await page.waitForTimeout(100); await show("ArrowUp from first (wrap?)");
await page.keyboard.press("Tab"); await page.waitForTimeout(100); await show("Tab 1");
await page.keyboard.press("Space"); await page.waitForTimeout(700); await show("Space on thinking");
await demo.screenshot({ path: `${out}/source-thinking-on.png` });
await page.keyboard.press("Tab"); await page.waitForTimeout(100); await show("Tab 2");
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(500); await show("ArrowRight in effort");
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(500); await show("ArrowRight again (wrap?)");
await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(500); await show("ArrowLeft");
await page.keyboard.press("Tab"); await page.waitForTimeout(100); await show("Tab 3");
await page.keyboard.press("Enter"); await page.waitForTimeout(500); await show("Enter on web search");
await page.keyboard.press("Tab"); await page.waitForTimeout(100); await show("Tab 4 (leaves?)");
await page.keyboard.press("Escape"); await page.waitForTimeout(500); await show("Escape");
// reopen: model pick by keyboard
await page.keyboard.press("Enter"); await page.waitForTimeout(400); await show("reopen via Enter (focus)");
await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(100); await show("two ArrowDown");
await page.keyboard.press("Enter"); await page.waitForTimeout(100); await show("Enter picks");
await page.waitForTimeout(800); await show("settled");
await demo.screenshot({ path: `${out}/source-closed-thinking.png` });
await browser.close();
