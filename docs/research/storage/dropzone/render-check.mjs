import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';

// Isolated visual check of the authored component; integration is checked by the
// Storage page's end-to-end QA. This uses no source-site code or network API.
const out = 'docs/research/storage/dropzone';
const source = (await fs.readFile('src/components/sites/storage/StorageDropzone.tsx', 'utf8')).replace('import "./storage-dropzone.css";', '');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(import.meta.url), mod, mod.exports);
const Component = mod.exports.StorageDropzone;
const css = await fs.readFile('src/components/sites/storage/storage-dropzone.css', 'utf8');
const font = await fs.readFile('public/fonts/inter-latin.woff2');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const props = { onFiles() {}, onRemove() {}, onRetry() {} };
async function render(name, entries = [], width = 520, dark = false) {
  await page.setViewportSize({ width: width < 520 ? 390 : 1440, height: 1000 });
  const markup = renderToStaticMarkup(React.createElement(Component, { ...props, entries }));
  await page.setContent(`<style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:100 900}body{margin:0;padding:20px}main{width:${width}px}${css}</style><main ${dark ? 'data-theme="dark"' : ''}>${markup}</main>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.locator('.storage-dropzone').screenshot({ path: `${out}/local-${name}.png` });
  const state = await page.locator('.storage-dropzone').evaluate(el => ({ box:el.getBoundingClientRect().toJSON(), overflow:el.scrollWidth > el.clientWidth, progress:[...el.querySelectorAll('[role="progressbar"]')].map(n=>n.getAttribute('aria-valuenow')), names:[...el.querySelectorAll('button')].map(n=>n.getAttribute('aria-label') || n.textContent) }));
  if (state.overflow) throw new Error(`${name} overflows`);
  return state;
}
const entries = [
  { id:'1', name:'Finance annual review.pdf',size:4404019,status:'ready',progress:100 },
  { id:'2', name:'Banking data.sql',size:2419831,status:'processing',progress:42 },
  { id:'3', name:'A very long document filename that must truncate without pushing the action buttons away from the viewport.xlsx',size:1024,status:'pending',progress:0 },
  { id:'4', name:'Notes.txt',size:3211,status:'error',progress:17,error:'Could not read this file. Choose another copy.' },
];
const checks = { idle:await render('idle'), rows:await render('rows', entries), mobile:await render('mobile', entries, 334), dark:await render('dark', entries, 334, true) };
await fs.writeFile(`${out}/local-check.json`, JSON.stringify(checks,null,2));
await browser.close();
console.log(JSON.stringify(checks));
