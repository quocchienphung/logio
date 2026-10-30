// Run the canonical Process suite with consent already decided in the isolated test contexts.
// Its default setup predates the site-wide consent dialog; do not let that overlay intercept map controls.
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('./process.mjs', import.meta.url), 'utf8');
const consent = `() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true, preferences: false, analytics: false, marketing: false }, version: '1', updatedAt: new Date().toISOString() }))`;
const prepared = source
  .replace("const out = 'docs/research/process/qa';", "const out = 'docs/research/process-agent-run/regression';")
  .replace('const page = await context.newPage();', `await context.addInitScript(${consent}); const page = await context.newPage();`)
  .replace('const restPage = await rest.newPage();', `await rest.addInitScript(${consent}); const restPage = await rest.newPage();`);
const temporary = new URL('./.process-monitor-regression.tmp.mjs', import.meta.url);
try { await fs.writeFile(temporary, prepared, { flag: 'wx' }); await import(temporary.href); }
finally { await fs.unlink(temporary).catch(() => {}); }
