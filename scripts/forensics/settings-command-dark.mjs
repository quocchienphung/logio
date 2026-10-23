import {chromium} from 'playwright';

// Dark theme of the local Settings page: page, search palette and a select list (usage: node scripts/forensics/settings-command-dark.mjs [base-url])
const base=process.argv[2]||'http://localhost:3000';
const out='docs/research/uiarc-settings-command/qa';
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${base}/personalize?section=settings`,{waitUntil:'networkidle'});
  await page.waitForSelector('.sc-frame');
  await page.locator('.ui-as-user').click();
  await page.getByRole('menuitem',{name:'Dark mode'}).click();
  await page.waitForTimeout(700);
  await page.screenshot({path:`${out}/local-dark-page.png`});
  await page.locator('#language').click();await page.waitForTimeout(500);
  await page.screenshot({path:`${out}/local-dark-select.png`});
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');await page.waitForTimeout(1200);
  await page.screenshot({path:`${out}/local-dark-palette.png`});
  console.log('theme',await page.locator('.crm-page').getAttribute('data-theme'));
  // restore
  await page.keyboard.press('Escape');await page.waitForTimeout(800);
  await page.locator('.ui-as-user').click();
  await page.getByRole('menuitem',{name:'Light mode'}).click();
} finally {await browser.close();}
