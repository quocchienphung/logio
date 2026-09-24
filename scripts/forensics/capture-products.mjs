// Capture the 18 Payments + Revenue product pages from the live reference.
// For every page × viewport: requested/final URL, locale, DOM, section topology,
// computed typography of text landmarks, full-page and per-section screenshots.
//
// Usage:
//   node scripts/forensics/capture-products.mjs                 # all pages, all viewports
//   node scripts/forensics/capture-products.mjs managed-payments payments --vp 1440
//   node scripts/forensics/capture-products.mjs --base http://localhost:3000 --out docs/design-references/products-local
//
// Output: <out>/<slug>/<vp>/{meta.json,dom.html,topology.json,type.json,full.png,sections/NN.png}
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { PRODUCT_PAGES } from "./product-pages.mjs";

const VIEWPORTS = {
  1440: { width: 1440, height: 900 },
  1280: { width: 1280, height: 800 },
  768: { width: 768, height: 1024 },
  390: { width: 390, height: 844, mobile: true },
};

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const base = opt("base", "https://stripe.com");
const out = path.resolve(opt("out", "docs/research/products"));
const vpArg = opt("vp", null);
const vps = vpArg ? vpArg.split(",") : Object.keys(VIEWPORTS);
const pages = args.length ? PRODUCT_PAGES.filter((p) => args.includes(p.slug)) : PRODUCT_PAGES;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  headless: true,
  args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function sweep(page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total + 400; y += 400) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

for (const p of pages) {
  for (const w of vps) {
    const vp = VIEWPORTS[w];
    const dir = path.join(out, p.slug, w);
    fs.mkdirSync(path.join(dir, "sections"), { recursive: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: !!vp.mobile,
      hasTouch: !!vp.mobile,
      locale: "en-US",
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const requested = base + p.href;
    const chain = [];
    page.on("response", (r) => {
      if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) {
        chain.push({ url: r.url(), status: r.status() });
      }
    });
    try {
      await page.goto(requested, { waitUntil: "networkidle", timeout: 90000 });
    } catch (e) {
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ requested, error: String(e) }, null, 2));
      console.log(`FAIL ${p.slug}@${w}: ${e.message.split("\n")[0]}`);
      await context.close();
      continue;
    }
    // dismiss a cookie banner if one is shown, so every capture has the same state
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^(accept|accept all)$/i.test((x.textContent || "").trim()));
      if (b) b.click();
    });
    await page.evaluate(() => document.fonts.ready);
    await sweep(page);

    const meta = await page.evaluate(() => ({
      finalUrl: location.href,
      lang: document.documentElement.lang,
      title: document.title,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
    }));
    fs.writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify({ requested, redirects: chain, viewport: vp, capturedAt: new Date().toISOString(), ...meta }, null, 2),
    );
    fs.writeFileSync(path.join(dir, "dom.html"), await page.content());

    const topology = await page.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      const nodes = [...document.querySelectorAll("header, footer"), ...main.children];
      return nodes.map((el, i) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          i,
          tag: el.tagName.toLowerCase(),
          id: el.id,
          cls: typeof el.className === "string" ? el.className : "",
          rect: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height },
          bg: cs.backgroundColor,
          heading: (el.querySelector("h1,h2,h3")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200),
          text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 400),
        };
      });
    });
    fs.writeFileSync(path.join(dir, "topology.json"), JSON.stringify(topology, null, 2));

    const type = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,p,a,button,li,figcaption,blockquote")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (el.textContent || "").trim().length > 0;
        })
        .slice(0, 1500)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          // one rect per rendered line -> exact wrap positions
          const range = document.createRange();
          range.selectNodeContents(el);
          const lines = [...new Set([...range.getClientRects()].map((q) => Math.round(q.top + scrollY)))].length;
          return {
            tag: el.tagName.toLowerCase(),
            cls: typeof el.className === "string" ? el.className : "",
            text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300),
            rect: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height },
            lines,
            font: {
              family: cs.fontFamily,
              size: cs.fontSize,
              weight: cs.fontWeight,
              lineHeight: cs.lineHeight,
              letterSpacing: cs.letterSpacing,
              color: cs.color,
              maxWidth: cs.maxWidth,
            },
          };
        }),
    );
    fs.writeFileSync(path.join(dir, "type.json"), JSON.stringify(type, null, 2));

    await page.screenshot({ path: path.join(dir, "full.png"), fullPage: true });
    for (const s of topology) {
      if (s.rect.h < 8) continue;
      await page.evaluate((y) => window.scrollTo(0, y), s.rect.y);
      await page.waitForTimeout(700);
      const clip = { x: 0, y: s.rect.y, width: vp.width, height: Math.min(s.rect.h, 4000) };
      await page.screenshot({ path: path.join(dir, "sections", `${String(s.i).padStart(2, "0")}.png`), clip, fullPage: true });
    }
    console.log(`ok ${p.slug}@${w} → ${meta.finalUrl} (${topology.length} nodes, ${meta.scrollHeight}px)`);
    await context.close();
  }
}
await browser.close();
