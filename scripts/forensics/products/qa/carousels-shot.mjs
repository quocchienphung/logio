// Screenshot the viewport around the Nth element matching a selector.
// node scripts/forensics/products/qa/carousels-shot.mjs <path> <selector> <out.png> [index=0] [width=1440] [height=900] [offset=80] [waitMs=800]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path, selector, out, index = "0", w = "1440", h = "900", offset = "80", wait = "800"] = process.argv.slice(2);
const { browser, page, errors } = await open(path, { w: +w, h: +h });
await scrollToEl(page, selector, +offset, +index);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(JSON.stringify(await overflow(page)));
if (errors.length) console.log(errors.join("\n"));
await browser.close();
