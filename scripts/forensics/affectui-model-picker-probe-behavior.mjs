import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/model-picker", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const demo = page.locator(".mdp-demo").first();
await demo.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
const snap = () => page.evaluate(() => { const r = document.querySelector(".ui-mdpc"); const q = s => r.querySelector(s); const list = q(".ui-mdpc__list"); return { open: r.hasAttribute("data-open"), pointing: list.hasAttribute("data-pointing"), act: list.getAttribute("aria-activedescendant")?.split("-").pop(), lit: [...r.querySelectorAll(".ui-mdpc__option")].filter(o => o.hasAttribute("data-lit")).map(o => o.id.split("-").pop()).join(), cap: q(".ui-mdpc__caption").innerText.replace(/\n/g, "|"), focus: document.activeElement?.getAttribute("aria-label") || document.activeElement?.className, flagOn: q(".ui-mdpc__flag").hasAttribute("data-on") }; });
const show = async n => console.log(n.padEnd(34), JSON.stringify(await snap()));
const box = await demo.boundingBox();
await page.mouse.click(box.x + box.width - 40, box.y + 30); await page.waitForTimeout(500);
await page.locator(".ui-mdpc__trigger").focus(); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(500); await show("open via ArrowDown");
await page.keyboard.press("ArrowDown"); await page.waitForTimeout(500); await show("keyboard ArrowDown");
await demo.screenshot({ path: "docs/research/model-picker/source-keyboard-nav.png" });
await page.keyboard.press("Escape"); await page.waitForTimeout(500); await show("Escape from list");
await page.keyboard.press("Space"); await page.waitForTimeout(500); await show("Space on trigger");
await page.keyboard.press("Space"); await page.waitForTimeout(400); await show("Space picks active");
// thinking + effort caption
await page.locator(".ui-mdpc__trigger").click(); await page.waitForTimeout(400);
await page.locator(".ui-mdpc__toggle").nth(0).click(); await page.waitForTimeout(700);
for (const level of ["low", "medium", "high"]) { await page.locator(`[data-effort=${level}]`).click(); await page.waitForTimeout(700); await show(`thinking effort ${level} (clicked)`); }
await show("thinking on, mouse over nothing");
await page.locator(".ui-mdpc__toggle").nth(0).click(); await page.waitForTimeout(600); await show("thinking off again");
// toggling does not close; click on switch label hint
await page.locator(".ui-mdpc__toggle").nth(1).click(); await page.waitForTimeout(500); await show("web search on by click");
// bar-fill animation details
await page.mouse.move(5, 5); await page.waitForTimeout(500);
await page.locator('.ui-mdpc__option[id$="-opt-haiku"]').hover(); await page.waitForTimeout(80);
const anims = await page.evaluate(() => document.getAnimations().filter(a => a.animationName || a.transitionProperty).slice(0, 6).map(a => ({ name: a.animationName || a.transitionProperty, dur: a.effect.getComputedTiming().duration, delay: a.effect.getComputedTiming().delay, easing: a.effect.getComputedTiming().easing, cls: a.effect.target?.className })));
console.log("ANIMS", JSON.stringify(anims, null, 0));
const seg = await page.evaluate(() => { const s = document.querySelector('.ui-mdpc__option[id$="-opt-haiku"] .ui-mdpc__seg[data-on]'); const cs = getComputedStyle(s); return { animation: cs.animation, name: cs.animationName, dur: cs.animationDuration, ease: cs.animationTimingFunction, fill: cs.animationFillMode, delay: cs.animationDelay, trans: cs.transition }; });
console.log("SEG", JSON.stringify(seg));
await browser.close();
