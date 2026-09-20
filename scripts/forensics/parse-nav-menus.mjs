// Parse captured mega-menu HTML into a data model for src/components/stripe/Navigation/menus.ts.
import fs from "node:fs";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
const out = {};
for (const name of ["products", "solutions", "developers", "resources"]) {
  const html = fs.readFileSync(`docs/research/stripe-live/nav/${name}.html`, "utf8");
  await page.setContent(html);
  out[name] = await page.evaluate(() => {
    const content = document.querySelector(".navigation__content");
    const blocks = [...content.children].map((el) => {
      const heading = el.querySelector(".hds-heading");
      const links = [...el.querySelectorAll(":scope > ul > li")].map((li) => {
        const a = li.querySelector("a");
        const label = a.querySelector(".navigation-hover-arrow, .hds-heading")?.childNodes[0]?.textContent?.trim() || a.textContent.trim();
        const desc = a.querySelector(".hds-text")?.textContent.trim() || null;
        const svg = a.querySelector("svg:not(.hds-icon-hover-arrow)")?.outerHTML || null;
        return { href: a.getAttribute("href"), label, desc, icon: svg, cls: a.className };
      });
      const extras = [...el.children].filter((c) => !c.matches("ul, .hds-heading")).map((c) => c.outerHTML.slice(0, 200));
      return { tag: el.tagName.toLowerCase(), cls: el.className, title: heading?.textContent.trim(), titleId: heading?.id, ulCls: el.querySelector(":scope > ul")?.className, links, extras };
    });
    const trailing = [...content.parentElement.children].filter((c) => c !== content).map((c) => c.outerHTML.slice(0, 300));
    return { contentCls: content.className, contentStyle: content.getAttribute("style"), blocks, trailing };
  });
}
await browser.close();
fs.writeFileSync("docs/research/stripe-live/nav/menus.json", JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) {
  console.log(`\n== ${k} (${v.contentCls})`);
  for (const b of v.blocks) console.log(`  <${b.tag} class="${b.cls}"> ${b.title} [${b.links.length} links] icons=${b.links.filter((l) => l.icon).length} extras=${b.extras.length}`, b.extras.map((e) => e.slice(0, 80)));
  console.log("  trailing:", v.trailing.map((t) => t.slice(0, 120)));
}
