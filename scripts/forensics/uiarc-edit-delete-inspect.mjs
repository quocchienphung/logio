import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Reads only the rendered public documentation pages of Action button and Confirm morph (text, DOM of each preview, computed style, screenshots).
// No API, registry, CLI, install command or Pro source. Usage: node scripts/forensics/uiarc-edit-delete-inspect.mjs
const routes = [['action-button', 'docs/research/uiarc-action-button'], ['confirm-morph', 'docs/research/uiarc-confirm-morph']];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [route, out] of routes) {
    await fs.mkdir(out, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const response = await page.goto(`https://uiarc.dev/components/${route}`, { waitUntil: 'networkidle' });
    console.log(route, response?.status());
    await fs.writeFile(`${out}/docs.txt`, await page.locator('main').innerText());
    await page.screenshot({ path: `${out}/page-desktop.png` });
    // these two previews are not <figure>s: the preview card is the shell around the component
    await page.locator('[class*="preview-shell_shell"]').first().screenshot({ path: `${out}/preview.png` });
    await page.close();
  }
} finally { await browser.close(); }
