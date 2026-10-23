// Fourth pass: the preview's simulated dictation take, measured cleanly by removing the browser's Web Speech API so the
// demo falls back to its sample take. Records word cadence, hand-over to chat, manual stop and typed text before dictation.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const mk = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  const page = await ctx.newPage();
  await page.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  return page;
};
const out = {};
const watch = async (page, ms) => {
  // Sampled inside the page every frame so evaluation latency does not distort the timings.
  const rows = await page.evaluate(async total => {
    const root = document.querySelector(".writing-assistant-demo .ui-wac");
    const read = () => {
      const ta = root.querySelector("textarea"); const m = root.querySelector(".ui-wac__messages");
      const mic = root.querySelector(".ui-wac__mic");
      return { v: ta.value, ph: ta.placeholder, p: mic.getAttribute("aria-pressed"), md: mic.disabled, n: m ? m.children.length : 0, last: m && m.lastElementChild ? m.lastElementChild.textContent.slice(0, 30) : "" };
    };
    const out = []; const t0 = performance.now(); let prev = "";
    while (performance.now() - t0 < total) {
      const r = read(); const key = JSON.stringify(r);
      if (key !== prev) { out.push({ t: Math.round(performance.now() - t0), ...r }); prev = key; }
      await new Promise(res => requestAnimationFrame(res));
    }
    return out;
  }, ms);
  return rows;
};

let page = await mk();
let card = page.locator(".writing-assistant-demo .ui-wac");
await card.locator(".ui-wac__mic").click();
out.natural = await watch(page, 4500);
await page.context().close();

page = await mk(); card = page.locator(".writing-assistant-demo .ui-wac");
await card.locator(".ui-wac__mic").click();
await page.waitForTimeout(900);
await card.locator(".ui-wac__mic").click();
out.stop = await watch(page, 2500);
await page.context().close();

page = await mk(); card = page.locator(".writing-assistant-demo .ui-wac");
await card.locator("textarea").fill("Draft an apology");
await card.locator(".ui-wac__mic").click();
out.typedThenMic = await watch(page, 800);
await page.context().close();

await fs.writeFile("docs/research/writing-assistant/simulated.json", JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) { console.log("==", k); v.forEach(r => console.log(r.t, r.p, r.md ? "micDisabled" : "", JSON.stringify(r.ph), "n=" + r.n, JSON.stringify(r.v), "|", JSON.stringify(r.last))); }
await browser.close();
