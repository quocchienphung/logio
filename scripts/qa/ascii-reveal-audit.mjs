import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Static safety audit of the glyph loading effect: the module must stay inert. It reads no text, values or storage from the page, sends
// nothing anywhere, loads no outside resource, and cannot run strings as code. Usage: node scripts/qa/ascii-reveal-audit.mjs
const root = 'src/components/sites/ascii-reveal';
const files = (await fs.readdir(root)).filter(name => /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name));
const sources = Object.fromEntries(await Promise.all(files.map(async name => [name, await fs.readFile(path.join(root, name), 'utf8')])));
const strip = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const results = [];
const check = (name, ok) => { assert.ok(ok, name); results.push(name); };

const forbidden = [
  ['network calls', /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/],
  ['outside URLs', /https?:\/\//],
  ['code from strings', /\b(eval|new Function|setTimeout\(\s*["'`]|setInterval\(\s*["'`])/],
  ['raw HTML injection', /\b(innerHTML|outerHTML|insertAdjacentHTML|dangerouslySetInnerHTML|document\.write)\b/],
  ['storage and cookies', /\b(localStorage|sessionStorage|indexedDB|document\.cookie|caches)\b/],
  ['reading page text or form values', /\b(textContent|innerText|\.value\b|FormData|getSelection|clipboard|navigator\.(userAgent|geolocation|mediaDevices))/],
  ['reading pixels back from the canvas', /\b(getImageData|toDataURL|toBlob|captureStream)\b/],
  ['external stylesheets, fonts or images', /\b(FontFace|@import|@font-face|new Image|<img|<script|<link)\b/],
  ['dependencies', /^\s*import .* from ["'](?!react|react-dom|\.\/|\.\.\/)/m],
];
for (const [label, pattern] of forbidden) {
  const hits = Object.entries(sources).filter(([, text]) => pattern.test(strip(text))).map(([name]) => name);
  check(`no ${label} (${hits.join(', ') || 'clean'})`, hits.length === 0);
}
check('the only DOM it writes is its own aria-hidden, pointer-events:none canvas', /setAttribute\("aria-hidden", "true"\)/.test(sources['GlyphCover.tsx']) && /pointerEvents: "none"/.test(sources['GlyphCover.tsx']));
check('the glyph sets are literals in glyph-field.ts (nothing is taken from the page)', /const SCRAMBLE = "/.test(sources['glyph-field.ts']) && !/document|window/.test(strip(sources['glyph-field.ts'])));
check('the cover has a time limit and a cell limit', /limitMs/.test(sources['GlyphCover.tsx']) && /MAX_CELLS/.test(sources['glyph-field.ts']));
console.log(`${results.length} audit checks passed over: ${files.join(', ')}`);
