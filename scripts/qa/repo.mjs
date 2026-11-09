import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

// Repo holds the Activity terrain; Skilled keeps the overview and timeline. The home-server section needs a server started from this checkout with no LOGIO_API_TOKEN.
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/repo';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, result) => { assert.ok(result, name); results.push(name); };
const sidebar = page => page.getByRole('navigation', { name: 'Main menu' });
const addSkill = async (page, name) => {
  await page.getByLabel('Skill instructions', { exact: true }).fill('Check every claim against a source.');
  await page.getByLabel('Skill name', { exact: true }).fill(name);
  await page.getByLabel('Description', { exact: true }).fill('Use when facts must be verified.');
  await page.getByRole('button', { name: 'Add skill', exact: true }).click();
  await page.locator('.sk-card').first().waitFor();
};
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
  await page.getByRole('region', { name: 'Skilled workspace' }).waitFor();
  check('Repo sits directly under Skilled in the sidebar', (await sidebar(page).locator('.ui-as-side__item').allInnerTexts()).slice(0, 2).join('|') === 'Skilled|Repo');
  check('The terrain left Skilled', await page.locator('.at').count() === 0 && await page.getByText('The shape of your week').count() === 0);
  check('Skilled shows four metric cards and the timeline', await page.locator('.sk-metric').count() === 4 && await page.getByRole('region', { name: 'Skill timeline' }).locator('.sk-steps li').count() === 4);
  check('No catalog of skill sources is left in Skilled', await page.getByText('Skill sources', { exact: true }).count() === 0);
  await addSkill(page, 'claim-checker');
  await page.waitForFunction(() => document.querySelector('[aria-label="Skill timeline"]')?.textContent.includes('claim-checker'));
  const row = page.locator('.sk-tl__row button').first();
  await row.focus(); await page.keyboard.press('Enter');
  check('Timeline row expands with its measured detail', await row.getAttribute('aria-expanded') === 'true' && await page.locator('.sk-tl__detail').first().innerText().then(text => text.includes('Took')));
  await page.getByRole('button', { name: '30D' }).click();
  check('Period control switches the window', await page.getByRole('button', { name: '30D' }).getAttribute('aria-pressed') === 'true');
  await page.screenshot({ path: `${out}/local-skilled-desktop.png` });

  await sidebar(page).getByRole('button', { name: 'Repo' }).click();
  await page.waitForURL(/section=repo/);
  await page.getByRole('region', { name: 'Repo workspace' }).waitFor();
  await page.locator('.at canvas').first().waitFor();
  check('Repo shows the Activity terrain and nothing else', await page.getByText('The shape of your week').count() === 1 && await page.locator('.sk-task-panel, .sk-metric, .sk-card-panel').count() === 0);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/local-repo-desktop.png` });
  await page.getByRole('button', { name: 'Top view' }).click();
  check('Terrain controls work on Repo', await page.getByRole('button', { name: 'Top view' }).getAttribute('aria-pressed') === 'true');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('region', { name: 'Repo workspace' }).waitFor();
  check('Repo survives a reload', await page.locator('.at canvas').count() > 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/personalize?section=repo`, { waitUntil: 'networkidle' });
  await page.getByRole('region', { name: 'Repo workspace' }).waitFor();
  check('Mobile Repo has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${out}/local-repo-mobile.png` });
  await page.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
  await page.getByRole('region', { name: 'Skilled workspace' }).waitFor();
  check('Mobile Skilled has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await context.close();

  // ---- Home-server API (file store, ETag, guard, agent delivery)
  const api = `${base}/api/workspace`;
  const health = await (await fetch(`${api}/health`)).json();
  check('Health reports the data folder and access mode', health.data.ok === true && typeof health.data.store.dir === 'string' && typeof health.data.auth.tokenRequired === 'boolean');
  const dataDir = health.data.store.dir;
  const existed = await fs.readdir(dataDir).then(list => list.length > 0, () => false);
  if (existed) console.log(`Skipping the file-store write checks: ${dataDir} already holds data.`);
  else {
    try {
      const put = await fetch(`${api}/workspaces/qa-ws/skill-library`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [] }) });
      const { version } = await put.json();
      check('PUT stores a resource and returns a version', put.status === 200 && /^v[a-f0-9]{20}$/.test(version));
      check('Unchanged resource answers 304', (await fetch(`${api}/workspaces/qa-ws/skill-library`, { headers: { 'If-None-Match': version } })).status === 304);
      check('A stale If-Match is refused with 412', (await fetch(`${api}/workspaces/qa-ws/skill-library`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': 'v0000' }, body: JSON.stringify({ data: [1] }) })).status === 412);
      check('A missing resource answers 204', (await fetch(`${api}/workspaces/qa-ws/nothing-here`)).status === 204);
      check('Path tricks are refused', (await fetch(`${api}/workspaces/..%2F..%2Fx/profile`)).status >= 400);
      check('A cross-site write is refused', (await fetch(`${api}/workspaces/qa-ws/skill-library`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: 'http://evil.test' }, body: JSON.stringify({ data: [] }) })).status === 403);
      const instructions = '---\nname: qa-skill\ndescription: QA.\n---\n\nBody.\n';
      const bundle = { version: 1, workspaceId: 'qa-ws', createdAt: new Date().toISOString(), skills: [{ id: 'q1', name: 'qa-skill', description: 'QA.', instructions, sourceUrl: '', sourceRef: '', sourcePath: '', sha256: createHash('sha256').update(instructions).digest('hex'), bytes: Buffer.byteLength(instructions), importedAt: new Date().toISOString(), target: 'Local AI', status: 'ready', guardrails: { citeSources: true, verifyBeforeAnswer: true, askWhenUncertain: true }, files: [] }] };
      const transfer = await fetch(`${api}/workspaces/qa-ws/commands/skill.transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: 'qa-agent', bundle }) });
      const receipt = (await transfer.json()).data;
      check('skill.transfer writes the files and returns a matching receipt', transfer.status === 200 && receipt.agent === 'qa-agent' && receipt.accepted[0].sha256 === bundle.skills[0].sha256 && (await fs.readFile(`${health.data.agents.dir}/qa-agent/qa-skill/SKILL.md`, 'utf8')).includes('Body.'));
    } finally { await fs.rm(dataDir, { recursive: true, force: true }); }

    // The Skilled page saving to the home-server backend through the real UI
    const remote = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await remote.addInitScript(url => { window.__workspaceBackendConfig = { baseUrl: url, debounceMs: 10 }; }, api);
    const r = await remote.newPage(); r.on('pageerror', error => errors.push(error.message));
    try {
      await r.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
      await r.getByRole('region', { name: 'Skilled workspace' }).waitFor();
      await addSkill(r, 'home-server-skill');
      await r.waitForTimeout(900);
      const file = JSON.parse(await fs.readFile(`${dataDir}/workspaces/acme/skill-library.json`, 'utf8'));
      check('The skill was saved by the server, not the browser', file.data[0].name === 'home-server-skill' && await r.evaluate(() => localStorage.getItem('affectui:acme:skill-library')) === null);
      await r.reload({ waitUntil: 'networkidle' });
      await r.locator('.sk-card').first().waitFor();
      check('It loads back from the server after a reload', await r.locator('.sk-card-title').first().innerText().then(text => text.includes('home-server-skill')));
    } finally { await remote.close(); await fs.rm(dataDir, { recursive: true, force: true }); }
  }
  check('No browser runtime errors', errors.length === 0);
  console.log(`${results.length} checks passed`);
  await fs.writeFile(`${out}/qa-results.json`, JSON.stringify({ at: new Date().toISOString(), base, passed: results }, null, 2));
} catch (error) {
  console.error('FAILED:', error.message, errors.length ? `\nPage errors: ${errors.join(' | ')}` : '');
  process.exitCode = 1;
} finally { await browser.close(); }
