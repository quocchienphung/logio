import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import { goToSection } from './lib/nav.mjs';
const base=process.argv[2]||'http://localhost:3000';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],passed=[];
page.on('pageerror',e=>errors.push(e.message));
const nav=name=>goToSection(page,name,450);
try{
  await page.goto(`${base}/personalize?section=run`,{waitUntil:'networkidle'});await page.locator('.ui-ar').waitFor();await page.getByRole('button',{name:'Stop run',exact:true}).click();
  await nav('Reports');assert.equal(await page.locator('.ui-kpi').count(),3);await page.locator('.ui-as-rev__period').click();await page.getByRole('menuitemradio',{name:'Last 30 days',exact:true}).click();await page.waitForTimeout(800);assert.match(await page.locator('.ui-as-rev__stats').innerText(),/414,572/);passed.push('Reports chart and period interactions after Run stylesheet loads');
  await nav('Usage');await page.locator('.ui-sb-tier').first().waitFor();assert.equal(await page.locator('.ui-sb-tier').count(),3);await page.getByRole('tab',{name:'Members',exact:true}).click();await page.locator('.ui-sb-row').first().waitFor();assert.equal(await page.locator('.ui-sb-row').count(),5);passed.push('Settings billing and Members after Run stylesheet loads');
  await nav('Companies');assert.equal(await page.locator('.ui-dt tbody tr').count(),10);passed.push('Company table survives Run/Reports/Settings navigation');
  await nav('Run');assert.equal(await page.locator('.ui-ar').getAttribute('data-phase'),'stopped');passed.push('Returning to Run retains stopped state');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open sidebar',exact:true}).click();await page.waitForTimeout(450);await nav('Reports');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('.ui-kpi').count(),3);passed.push('Mobile Reports geometry after Run CSS remains contained');
  assert.deepEqual(errors,[]);await fs.writeFile('docs/research/affectui-run/qa/navigation-results.json',JSON.stringify({passed,errors},null,2));console.log(JSON.stringify({passed,errors},null,2));
}finally{await browser.close();}
