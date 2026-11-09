import { chromium } from "playwright";
const out = "docs/research/model-picker";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://www.affectui.com/components/model-picker", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const demo = page.locator(".mdp-demo").first();
await demo.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
const root = page.locator(".ui-mdpc");
const opt = id => page.locator(`.ui-mdpc__option[id$="-opt-${id}"]`);
const snap = () => page.evaluate(() => { const r = document.querySelector(".ui-mdpc"); const q = s => r.querySelector(s); return { pointing: q(".ui-mdpc__list").hasAttribute("data-pointing"), lit: [...r.querySelectorAll(".ui-mdpc__option")].filter(o => o.hasAttribute("data-lit")).map(o => o.id.split("-").pop()).join(), act: q(".ui-mdpc__list").getAttribute("aria-activedescendant")?.split("-").pop(), cap: q(".ui-mdpc__caption").innerText.replace(/\n/g, "|"), focus: document.activeElement?.getAttribute("aria-label") || document.activeElement?.className };});
const show = async n => console.log(n.padEnd(30), JSON.stringify(await snap()));
// close then open with the mouse
await page.mouse.click(...(await (async () => { const b = await demo.boundingBox(); return [b.x + b.width - 40, b.y + 30]; })()));
await page.waitForTimeout(500);
await root.locator(".ui-mdpc__trigger").click(); await page.waitForTimeout(600); await show("opened by mouse click");
await demo.screenshot({ path: `${out}/source-open-mouse.png` });
// hover the web search switch and thinking switch
await page.locator(".ui-mdpc__toggle").nth(1).hover(); await page.waitForTimeout(500); await show("hover web search");
await page.locator(".ui-mdpc__toggle").nth(0).hover(); await page.waitForTimeout(500); await show("hover thinking");
// tween: hover opus -> haiku, sample numbers every ~25ms
await opt("opus").hover(); await page.waitForTimeout(900);
await page.evaluate(() => { window.__samples = []; const t0 = performance.now(); const tick = () => { const c = document.querySelector(".ui-mdpc__caption"); window.__samples.push([Math.round(performance.now() - t0), c.innerText.replace(/\n/g, "|")]); if (performance.now() - t0 < 1400) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
await opt("haiku").hover(); await page.waitForTimeout(1600);
const samples = await page.evaluate(() => window.__samples);
const compact = []; let last = ""; for (const [t, v] of samples) { if (v !== last) { compact.push(`${t}ms ${v}`); last = v; } }
console.log("CAPTION SAMPLES opus->haiku:\n" + compact.join("\n"));
// bars fill animation: sample the segment backgrounds of opus when hovered
await page.mouse.move(5, 5); await page.waitForTimeout(700);
await page.evaluate(() => { window.__bars = []; const t0 = performance.now(); const segs = [...document.querySelectorAll('.ui-mdpc__option[id$="-opt-opus"] .ui-mdpc__seg[data-on]')]; const tick = () => { window.__bars.push([Math.round(performance.now() - t0), segs.map(s => { const c = getComputedStyle(s).backgroundColor.match(/[\d.]+/g); return c.slice(0, 3).join("") === "000" ? "g" : "B"; }).join("")]); if (performance.now() - t0 < 1500) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
await opt("opus").hover(); await page.waitForTimeout(1700);
const bars = await page.evaluate(() => window.__bars); let lb = ""; const cb = []; for (const [t, v] of bars) { if (v !== lb) { cb.push(`${t}ms ${v}`); lb = v; } } console.log("BARS (segments of opus, g=gray B=blue):\n" + cb.join("\n"));
// geometry
const geo = await page.evaluate(() => { const r = n => { const e = document.querySelector(n); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; }; return { trigger: r(".ui-mdpc__trigger"), pop: r(".ui-mdpc__pop"), head: r(".ui-mdpc__head"), list: r(".ui-mdpc__list"), opus: r('.ui-mdpc__option[id$="-opt-opus"]'), auto: r('.ui-mdpc__option[id$="-opt-auto"]'), settings: r(".ui-mdpc__settings"), toggle: r(".ui-mdpc__toggle"), foot: r(".ui-mdpc__foot"), bars: r(".ui-mdpc__bars"), glyph: r(".ui-mdpc__option .ui-mdpc__glyph"), switch: r(".ui-mdpc__switch"), caption: r(".ui-mdpc__caption"), keys: r(".ui-mdpc__keys"), composer: r(".mdp-demo__composer") }; });
console.log("GEOMETRY [x,y,w,h]\n" + JSON.stringify(geo, null, 1));
await browser.close();
