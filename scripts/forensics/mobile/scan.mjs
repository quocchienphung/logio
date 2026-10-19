// Responsive scan of a route over many phone/tablet widths: horizontal overflow (page and its culprits), page height,
// console/page errors. node scripts/forensics/mobile/scan.mjs [base] [route] [widths comma list]
import { launch, newPage, sweep } from "../browser.mjs";

const [base = "http://localhost:3000", route = "/", list = "320,360,375,390,412,430,480,540,600,640,700,768,820,900,1024"] = process.argv.slice(2);
const browser = await launch();
for (const w of list.split(",").map(Number)) {
  const h = w >= 700 ? 1024 : 844;
  const { page, context } = await newPage(browser, { width: w, height: h, mobile: w < 900 });
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 120)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errs.push("console: " + m.text().slice(0, 120)));
  await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1500);
  await sweep(page, 600, 100);
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const clipped = (el) => {
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX !== "visible" || cs.contain.includes("paint") || cs.clipPath !== "none") {
          const b = a.getBoundingClientRect();
          if (b.right <= vw + 1 && b.left >= -1) return true;
        }
      }
      return false;
    };
    const culprits = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.visibility === "hidden" || cs.display === "none") continue;
      if (clipped(el)) continue;
      culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")} L${Math.round(r.left)} R${Math.round(r.right)}`);
      if (culprits.length >= 6) break;
    }
    return { scrollW: doc.scrollWidth, vw, height: doc.scrollHeight, culprits };
  });
  const flag = r.scrollW > r.vw ? "  <-- H-OVERFLOW" : "";
  console.log(`${String(w).padStart(4)}px  scrollW ${r.scrollW}  height ${r.height}${flag}${r.culprits.length ? "\n      " + r.culprits.join("\n      ") : ""}${errs.length ? "\n      " + errs.join("\n      ") : ""}`);
  await context.close();
}
await browser.close();
