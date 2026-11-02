import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// States of the public JSON viewer preview, read from the rendered DOM only: rows of every kind, the path bar, the status regions, search marks.
const directory = 'docs/research/json-viewer/source';
const browser = await chromium.launch({ channel: 'chrome' });
const out = [];
const log = (...a) => { const line = a.join(' '); out.push(line); console.log(line); };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto('https://uiarc.dev/components/json-viewer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const root = page.locator('[class*="json-viewer_root"]').first();
  await root.scrollIntoViewIfNeeded();
  const simplify = html => html.replace(/json-viewer_([A-Za-z]+)__\S+?(?=[" ])/g, 'jv_$1').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '');
  const rowsOf = () => page.evaluate(() => [...document.querySelectorAll('[class*="json-viewer_root"] [role="treeitem"]')].map(r => ({ label: r.getAttribute('aria-label'), level: r.getAttribute('aria-level'), pos: `${r.getAttribute('aria-posinset')}/${r.getAttribute('aria-setsize')}`, exp: r.getAttribute('aria-expanded'), sel: r.getAttribute('aria-selected'), kind: r.getAttribute('data-kind'), active: r.hasAttribute('data-active'), tab: r.getAttribute('tabindex'), style: r.getAttribute('style'), text: r.innerText.replace(/\s+/g, ' ').trim().slice(0, 90) })));
  const show = async title => { const rows = await rowsOf(); log(`\n## ${title}: ${rows.length} rows`); for (const r of rows.slice(0, 40)) log(`  L${r.level} ${r.pos} exp=${r.exp} sel=${r.sel} kind=${r.kind}${r.active ? ' ACTIVE' : ''} tab=${r.tab} | ${r.label} | ${r.text}`); };
  await show('initial');
  // one collapsed branch, whole row
  const customer = root.getByRole('treeitem').filter({ hasText: /^customer/ }).first();
  log('\n## collapsed branch row html:\n' + simplify(await customer.evaluate(n => n.outerHTML)));
  const strRow = root.getByRole('treeitem').filter({ hasText: /^status/ }).first();
  log('\n## string row html (hover not applied):\n' + simplify(await strRow.evaluate(n => n.outerHTML)).slice(0, 1400));
  log('\n## below the tree (path bar, status):\n' + simplify(await root.evaluate(n => [...n.children].slice(2).map(c => c.outerHTML).join('\n'))).slice(0, 3000));
  // open the long array to see the paging row
  const events = root.getByRole('treeitem').filter({ hasText: /^events/ }).first();
  await events.click(); await page.waitForTimeout(900);
  await show('after opening events (180 items, page 50)');
  const more = root.locator('[data-kind="more"]').first();
  log('\n## more row html:\n' + simplify(await more.evaluate(n => n.outerHTML)));
  // search
  await root.getByRole('searchbox').or(root.locator('input[type=search]')).first().fill('refund'); await page.waitForTimeout(900);
  await show('after searching "refund"');
  log('\n## toolbar with matches:\n' + simplify(await root.locator('[class*="json-viewer_toolbar"]').evaluate(n => n.outerHTML)).slice(0, 2600));
  log('\n## a mark:\n' + simplify(await root.locator('mark, [class*="json-viewer_mark"]').first().evaluate(n => n.parentElement.outerHTML)).slice(0, 900));
  await fs.writeFile(`${directory}/states.txt`, out.join('\n'));
} finally { await browser.close(); }
