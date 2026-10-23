// Pixel comparison against the rendered public preview at its native 380 x 401 CSS px,
// in welcome, typing and reply states, with ambient glow frozen on both.
// Usage: node scripts/forensics/writing-assistant-compare.mjs [base-url]
import { chromium } from "playwright";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/writing-assistant/resize/comparison";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const freeze = "*,*::before,*::after{animation-play-state:paused!important;animation-delay:-1s!important}.ui-wac__welcome,.ui-wac__msg,.ui-wac__send,.wra__welcome,.wra__msg,.wra__send{animation:none!important}nextjs-portal{display:none!important}";

const ref = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
await ref.goto("https://www.affectui.com/components/writing-assistant", { waitUntil: "networkidle" });
await ref.addStyleTag({ content: freeze });
const loc = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
await loc.goto(`${base}/personalize?browse=1&group=agent-chat`, { waitUntil: "networkidle" });
// Compare the component at native width; the real selector's responsive rules remain unchanged.
await loc.addStyleTag({ content: `${freeze}.guide-page{--u:1.484375px!important}.guide-floor{display:none!important}` });
await loc.waitForTimeout(900);

const refCard = ref.locator(".writing-assistant-demo .ui-wac");
const locCard = loc.locator(".guide-preview__frame[data-live] .wra");
const size = await locCard.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height]; });
console.log("local card", size.map(n => n.toFixed(2)).join(" x "), "reference", JSON.stringify(await refCard.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height]; })));

const results = {};
async function compare(name) {
  const a = PNG.sync.read(await refCard.screenshot());
  const b = PNG.sync.read(await locCard.screenshot());
  await fs.writeFile(`${out}/${name}-reference.png`, PNG.sync.write(a));
  await fs.writeFile(`${out}/${name}-local.png`, PNG.sync.write(b));
  const width = Math.min(a.width, b.width), height = Math.min(a.height, b.height);
  const crop = png => { const c = new PNG({ width, height }); PNG.bitblt(png, c, 0, 0, width, height, 0, 0); return c; };
  const diff = new PNG({ width, height });
  const bad = pixelmatch(crop(a).data, crop(b).data, diff.data, width, height, { threshold: 0.15 });
  await fs.writeFile(`${out}/${name}-diff.png`, PNG.sync.write(diff));
  results[name] = { reference: `${a.width}x${a.height}`, local: `${b.width}x${b.height}`, differentPixels: bad, percent: +(bad / (width * height) * 100).toFixed(2) };
  console.log(name, JSON.stringify(results[name]));
}
await compare("welcome");

// Same message in both: type, send, and compare once the reply is complete.
await refCard.locator("textarea").fill("Make it shorter");
await locCard.locator("textarea").fill("Make it shorter");
await compare("typed");
await refCard.locator("textarea").press("Enter");
await locCard.locator("textarea").press("Enter");
await ref.waitForTimeout(3500); await loc.waitForTimeout(500);
await loc.waitForFunction(() => !document.querySelector(".guide-preview__frame[data-live] .wra__mic").disabled);
await ref.addStyleTag({ content: ".ui-wac__msg{animation:none!important}" });
await compare("reply");
await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
await browser.close();
