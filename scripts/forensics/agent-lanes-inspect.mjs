// Clone-engine evidence from the rendered public preview only. No registry, install API, CLI or Pro source.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'docs/research/agent-lanes';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
try {
  await page.goto('https://www.affectui.com/components/agent-lanes', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  await page.locator('.ui-alc').screenshot({ path: `${out}/source-desktop.png` });
  await fs.writeFile(`${out}/source-docs.txt`, await page.locator('.doc').innerText());
  const evidence = await page.locator('.ui-alc').evaluate(root => {
    const measure = selector => Array.from(root.querySelectorAll(selector)).map(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { selector: el.className, text: el.textContent, label: el.getAttribute('aria-label'), width: r.width, height: r.height, font: s.font, padding: s.padding, background: s.backgroundColor, borderRadius: s.borderRadius, style: el.getAttribute('style') };
    });
    return { root: root.outerHTML, css: document.querySelector('style[data-href="ui-agent-lanes-clean"]').textContent, measurements: measure('.ui-alc__bar, .ui-alc__agent, .ui-alc__avatar, .ui-alc__track, .ui-alc__slot'), avatars: Array.from(root.querySelectorAll('.ui-alc__avatar svg')).map(el => el.outerHTML), tools: Array.from(root.querySelectorAll('.ui-alc__slot')).map(el => ({ title: el.querySelector('.ui-alc__label').textContent, icons: Array.from(el.querySelectorAll('.ui-alc__tool svg')).map(svg => svg.outerHTML) })) };
  });
  await fs.writeFile(`${out}/source-preview.html`, evidence.root);
  await fs.writeFile(`${out}/observed-rules.css`, evidence.css);
  await fs.writeFile(`${out}/measurements.json`, JSON.stringify(evidence.measurements, null, 2));
  // Static, visible brand artwork only; the rebuilt component imports no captured runtime or CSS.
  const icons = { claude: evidence.avatars[0], chatgpt: evidence.avatars[2], gemini: evidence.avatars[3] };
  const toolNames = [['google', 'notion'], ['notion', 'slack'], ['figma', 'notion'], ['github', 'linear'], ['hubspot'], ['stripe', 'github']];
  evidence.tools.forEach((task, index) => task.icons.forEach((svg, position) => { icons[toolNames[index][position]] = svg; }));
  await fs.mkdir('src/components/sites/affectui-agent-lanes', { recursive: true });
  await fs.writeFile('src/components/sites/affectui-agent-lanes/icons.json', JSON.stringify(icons, null, 2));
  const tips = [];
  for (const title of ['Competitor pricing', 'Customer interviews', 'Draft pricing page', 'PR #482 billing', 'Sync CRM']) {
    await page.keyboard.press('Escape');
    // Blocks continuously slide; force skips Playwright's stability wait, not any UI access check.
    await page.getByRole('button', { name: new RegExp(`: ${title} –`) }).click({ force: true });
    await page.waitForTimeout(80);
    tips.push({ title, text: await page.locator('.ui-alc__pop').innerText() });
  }
  await fs.writeFile(`${out}/tooltips.json`, JSON.stringify(tips, null, 2));
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  await page.getByRole('button', { name: /Ops: Rotate API keys/ }).click({ force: true });
  await page.getByRole('dialog', { name: 'Decide: Rotate API keys' }).waitFor();
  await page.locator('.ui-alc').screenshot({ path: `${out}/source-approval.png` });
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  const rejected = await page.getByRole('button', { name: /Ops: Rotate API keys/ }).getAttribute('aria-label');
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  const sequence = [];
  for (const wait of [0, 4000, 4000, 8000]) {
    if (wait) await page.waitForTimeout(wait);
    sequence.push({ elapsed: sequence.length ? sequence.at(-1).elapsed + wait : 0, tasks: await page.locator('.ui-alc__block').evaluateAll(els => els.map(el => ({ text: el.textContent, label: el.getAttribute('aria-label'), status: el.getAttribute('data-status'), position: el.parentElement.getAttribute('style') }))) });
  }
  await fs.writeFile(`${out}/sequence.json`, JSON.stringify({ rejected, sequence }, null, 2));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  await page.locator('.ui-alc').screenshot({ path: `${out}/source-mobile.png` });
  console.log('Saved public preview, docs, static icons, measurements and interaction evidence.');
} finally {
  await browser.close();
}
