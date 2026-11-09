import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/morph-nav/qa'; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); };
const trigger = name => page.getByRole('button', { name, exact: true });
const popup = page.locator('.hds-navigation-menu__popup');
const active = () => page.locator('.hds-navigation-menu__popup > .hds-navigation-menu__viewport > .hds-navigation-menu__content[data-status=open]');
const close = async () => { await page.keyboard.press('Escape'); await page.mouse.move(1380,900); await page.waitForTimeout(220); };
const open = async name => { await trigger(name).hover(); await page.waitForTimeout(850); };
try {
  await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(1300);
  await page.locator('[data-navigation-portal]').waitFor({state:'attached'});
  // A passing pointer must not open a large menu; move across the trigger in under 60ms.
  const box = await trigger('Products').boundingBox();
  await page.mouse.move(box.x+box.width/2, box.y+box.height/2); await page.mouse.move(1380,900);
  await page.waitForTimeout(120); check('passing pointer does not open menu', await popup.count() === 0);
  const heights = {};
  for (const name of ['Products','Solutions','Developers','Resources']) {
    await open(name); heights[name] = (await popup.boundingBox()).height;
    check(`${name} opens with its own links`, await active().locator('a[href]').count() > 0);
    await close();
  }
  for (const name of ['Products','Solutions','Developers','Resources','Developers','Solutions','Products','Resources']) {
    await open(name); const height = (await popup.boundingBox()).height;
    check(`${name} keeps its intrinsic height after switching`, Math.abs(height-heights[name]) < 0.1);
    await page.waitForTimeout(250); check(`${name} height has settled`, Math.abs((await popup.boundingBox()).height-height) < 0.1);
    check('outgoing menu leaves no focusable duplicate', await popup.locator('.hds-navigation-menu__content').count() === 1);
  }
  const anchor = await active().locator('a[href]').first().boundingBox();
  await page.mouse.move(anchor.x+8,anchor.y+8,{steps:5}); await page.waitForTimeout(220);
  check('pointer can cross from trigger into panel', await popup.getAttribute('data-status') === 'open');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check('Escape closes and restores trigger focus', await popup.count() === 0 && await trigger('Resources').evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Enter'); await page.waitForTimeout(350);
  check('keyboard opens menu immediately', await popup.getAttribute('data-status') === 'open');
  await page.mouse.click(1400,850); await page.waitForTimeout(200); check('outside click closes menu', await popup.count() === 0);
  await open('Products');
  await page.mouse.move(1380,900); await page.waitForTimeout(120);
  check('leaving tolerance keeps panel open across a gap', await popup.getAttribute('data-status') === 'open');
  await trigger('Products').hover(); await page.waitForTimeout(250);
  check('re-entry cancels pending close', await popup.getAttribute('data-status') === 'open');
  // Re-enter during exit, before the unmount timer fires.
  await page.mouse.move(1380,900); await page.waitForTimeout(200); await trigger('Products').hover(); await page.waitForTimeout(450);
  check('re-entry during exit survives old unmount timer', await popup.getAttribute('data-status') === 'open');
  check('settled popup has no permanent promotion', await popup.evaluate(e=>getComputedStyle(e).willChange) === 'auto');
  await close();
  for (const width of [1024,1920,940]) {
    await page.setViewportSize({width,height:1000}); await open('Products');
    const p = await popup.boundingBox(); check(`desktop ${width}px fits viewport`, p.x>=0 && p.x+p.width<=width+1);
    await popup.screenshot({path:`${out}/desktop-${width}.png`}); await close();
  }
  for (const width of [939,768,390]) {
    await page.setViewportSize({width,height:844}); await page.waitForTimeout(180);
    const menu = page.locator('.navigation-hamburger-button'); await menu.click(); await page.waitForTimeout(680);
    check(`mobile ${width}px menu opens`, await menu.getAttribute('aria-expanded') === 'true');
    await trigger('Solutions').click(); await page.waitForTimeout(650);
    check(`mobile ${width}px submenu has destinations`, await popup.locator('.navigation__content--solutions a[href]').count() > 0);
    check(`mobile ${width}px has no horizontal overflow`, await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${out}/mobile-${width}.png`}); await page.keyboard.press('Escape'); await page.waitForTimeout(220);
    check(`mobile ${width}px closes and unlocks scroll`, await popup.count()===0 && await page.evaluate(()=>document.documentElement.style.overflow) !== 'hidden');
    // A quick close/open must not be removed by the old delayed unmount.
    await menu.click(); await menu.click(); await menu.click(); await page.waitForTimeout(400);
    check(`mobile ${width}px rapid reopen survives`, await popup.count()===1); await page.keyboard.press('Escape'); await page.waitForTimeout(180);
  }
  await page.setViewportSize({width:1440,height:1000}); await page.emulateMedia({reducedMotion:'reduce'}); await open('Solutions');
  check('reduced motion removes travel and scale', await popup.evaluate(e=>[e,...e.querySelectorAll('.hds-navigation-menu__content')].every(n=>getComputedStyle(n).transform==='none')));
  await close();
  check('no runtime errors', errors.length===0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({base,checks,errors,heights},null,2));
} catch (error) {
  await page.screenshot({path:`${out}/failure.png`});
  console.error(await page.evaluate(()=>({hover:[...document.querySelectorAll(':hover')].map(e=>e.className), nav:document.querySelector('header.navigation')?.outerHTML.slice(0,1200), portal:document.querySelector('[data-navigation-portal]')?.innerHTML,errors:window.__errors})));
  throw error;
} finally { await browser.close(); }
