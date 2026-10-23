import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/affectui-files/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], passed = [], outbound = [];
async function check(name, fn) { await fn(); passed.push(name); console.log(`PASS ${name}`); }
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('request', req => { if (/affectui\.com/.test(req.url())) outbound.push(req.url()); });
const dialog = title => page.getByRole('dialog', { name: title, exact: true });
const folderCard = name => page.locator('.files-folder-open').filter({ has: page.getByText(name, { exact: true }) });
const fileCard = name => page.locator('.files-template').filter({ has: page.getByText(name, { exact: true }) });
const sidebar = name => page.locator('.ui-as-side__item').filter({ has: page.getByText(name, { exact: true }) });
async function select(p, name, option) { await p.getByRole('combobox', { name, exact: true }).click(); await p.getByRole('option', { name: option, exact: true }).click(); }
async function waitStorage(name, predicate) { await page.waitForFunction(({ name, source }) => { const raw = localStorage.getItem(`affectui:acme:${name}`); return raw && new Function('value', `return ${source}`)(JSON.parse(raw)); }, { name, source: predicate }); }
try {
  await page.goto(`${base}/personalize?section=files`); await page.locator('.files-template').first().waitFor();
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await check('Files is owned by Agent Chat; source copy, counts, search, privacy, sorting and list view work', async () => {
    assert.deepEqual(await page.locator('.workspace-nav-label').allInnerTexts(), ['New chat', 'Files', 'Run', 'Usage', 'Settings']);
    assert.equal(await page.locator('.files-folder-open').count(), 4); assert.equal(await page.locator('.files-template').count(), 4);
    await page.getByRole('tab', { name: 'Shared', exact: true }).click(); assert.equal(await page.locator('.files-folder-open').count(), 2);
    await page.getByRole('tablist', { name: 'Folder visibility' }).getByRole('tab', { name: 'All', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search folders', exact: true }).fill('Research'); assert.equal(await page.locator('.files-folder-open').count(), 1);
    await page.getByRole('searchbox', { name: 'Search folders', exact: true }).fill('');
    await page.getByRole('button', { name: 'Sort folders Z to A' }).click(); assert.match(await page.locator('.files-folder-open').first().innerText(), /Research/);
    await page.getByRole('button', { name: 'List view' }).click(); assert.equal(await page.locator('.files-folders').getAttribute('data-view'), 'list');
    await page.getByRole('button', { name: 'Grid view' }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click(); await page.getByRole('menuitemcheckbox', { name: 'PDF', exact: true }).click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.files-template').count(), 1);
    await page.getByRole('button', { name: 'Type · 1' }).click(); await page.getByRole('menuitem', { name: 'Clear all' }).click();
    await page.getByRole('tab', { name: 'Mine', exact: true }).click(); assert.equal(await page.locator('.files-template').count(), 2);
    await page.getByRole('tablist', { name: 'File ownership' }).getByRole('tab', { name: 'All', exact: true }).click();
  });
  await check('Create folder validates duplicate names and is shared with the chat composer', async () => {
    await page.getByRole('button', { name: 'Create folder', exact: true }).click();
    await dialog('Create folder').getByLabel('Folder name').fill('Research'); await dialog('Create folder').getByRole('button', { name: 'Create folder', exact: true }).click();
    assert.match(await dialog('Create folder').innerText(), /already exists/);
    await dialog('Create folder').getByLabel('Folder name').fill('QA Files'); await dialog('Create folder').getByRole('button', { name: 'Create folder', exact: true }).click();
    await folderCard('QA Files').waitFor(); await sidebar('New chat').click(); await page.getByRole('button', { name: 'Work in a folder', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'QA Files', exact: true }).waitFor(); await page.keyboard.press('Escape');
    await sidebar('Files').click(); await folderCard('QA Files').click(); await page.getByRole('heading', { name: 'QA Files' }).waitFor();
  });
  await check('Upload stores actual binary in IndexedDB, persists metadata, and downloads unchanged bytes', async () => {
    await page.locator('.files-page input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Real uploaded content — QA') });
    await fileCard('notes.txt').waitFor(); await fileCard('notes.txt').click();
    const event = page.waitForEvent('download'); await dialog('File details').getByRole('button', { name: 'Download', exact: true }).click();
    const dl = await event; assert.equal(dl.suggestedFilename(), 'notes.txt'); assert.equal(await fs.readFile(await dl.path(), 'utf8'), 'Real uploaded content — QA');
    await dialog('File details').getByLabel('File name').fill('renamed.txt'); await dialog('File details').getByRole('button', { name: 'Save changes' }).click();
    await fileCard('renamed.txt').waitFor(); await waitStorage('file-library', 'value.items.some(item => item.name === "renamed.txt" && item.localBlobId)');
    await page.reload(); await fileCard('renamed.txt').waitFor(); assert.match(page.url(), /folder=QA\+Files/);
  });
  await check('Folder sharing and rename persist, preserve contents, and respect native browser history', async () => {
    await page.getByRole('button', { name: 'Share', exact: true }).click(); await select(page, 'Who can access', 'Shared');
    await dialog('Share folder').getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('button', { name: 'Folder actions', exact: true }).click(); await page.getByRole('menuitem', { name: 'Edit folder' }).click();
    await dialog('Edit folder').getByLabel('Folder name').fill('QA Renamed'); await dialog('Edit folder').getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('heading', { name: 'QA Renamed' }).waitFor(); assert.equal(await page.locator('.files-template').count(), 1);
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Files' }).click(); await folderCard('QA Renamed').waitFor();
    assert.match(await folderCard('QA Renamed').innerText(), /Shared · 1 files/);
    await page.goBack(); await page.getByRole('heading', { name: 'QA Renamed' }).waitFor(); await page.goForward(); await folderCard('QA Renamed').waitFor();
  });
  await check('Editable templates save real content, download text, move folders, and file/folder deletion works', async () => {
    await page.getByRole('button', { name: 'Add template', exact: true }).click(); await page.getByRole('menuitem', { name: 'Create template' }).click();
    await dialog('Create template').getByLabel('Template name').fill('QA Brief'); await dialog('Create template').getByLabel('Content').fill('Editable project brief');
    await dialog('Create template').getByRole('button', { name: 'Create template', exact: true }).click(); await fileCard('QA Brief').click();
    await dialog('File details').getByLabel('Content').fill('Updated project brief'); await dialog('File details').getByRole('button', { name: 'Save changes' }).click();
    await fileCard('QA Brief').click(); const event = page.waitForEvent('download'); await dialog('File details').getByRole('button', { name: 'Download', exact: true }).click();
    const dl = await event; assert.equal(await fs.readFile(await dl.path(), 'utf8'), 'Updated project brief');
    await select(page, 'Folder', 'QA Renamed'); await dialog('File details').getByRole('button', { name: 'Save changes' }).click();
    await folderCard('QA Renamed').click(); assert.equal(await page.locator('.files-template').count(), 2);
    await page.getByRole('button', { name: 'Folder actions', exact: true }).click(); await page.getByRole('menuitem', { name: 'Delete folder' }).click(); await dialog('Delete folder?').getByRole('button', { name: 'Delete folder', exact: true }).click();
    await fileCard('renamed.txt').waitFor(); assert.match(await fileCard('renamed.txt').innerText(), /Private/);
    await fileCard('QA Brief').click(); await dialog('File details').getByRole('button', { name: 'Delete file', exact: true }).click(); await dialog('Delete file?').getByRole('button', { name: 'Delete file', exact: true }).click();
    assert.equal(await fileCard('QA Brief').count(), 0);
  });
  await check('Mobile reflows, empty states, accessible dialogs and upload size errors', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('searchbox', { name: 'Search templates' }).fill('nothing matches');
    assert.match(await page.locator('.files-empty').last().innerText(), /No matching files/); await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('.files-page input[type=file]').setInputFiles({ name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(21 * 1024 * 1024) });
    await page.getByText('Choose a file smaller than 20 MB.', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Cancel upload too-large.pdf' }).click();
    await page.getByRole('button', { name: 'Learn more', exact: true }).click(); await dialog('Files in your workspace').waitFor(); await page.keyboard.press('Escape');
    await page.screenshot({ path: `${out}/mobile.png` });
  });

  await check('Authenticated REST load/save, multipart upload failure/retry, revision headers and workspace isolation', async () => {
    const remote = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await remote.addInitScript(() => { window.__workspaceBackendConfig = { baseUrl: `${location.origin}/__files-api`, debounceMs: 0, headers: () => ({ Authorization: 'Bearer files-qa', 'Content-Type': 'application/json' }) }; });
    let library = { folderAccess: { 'Server folder': 'shared' }, items: [] }, folderNames = ['Server folder'], uploadCalls = 0, saved = false, slowRoute;
    const requests = [];
    await remote.route('**/__files-api/**', async route => {
      const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.split('/').at(-1); requests.push({ url: url.pathname, method: req.method(), headers: req.headers() });
      assert.equal(req.headers().authorization, 'Bearer files-qa');
      const respond = (data, version = 'v1') => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, version }) });
      if (url.pathname.includes('/workspaces/personal/')) return route.fulfill({ status: 204 });
      if (url.pathname.includes('/uploads/')) {
        uploadCalls++; assert.match(req.headers()['content-type'], /multipart\/form-data; boundary=/); assert.match(req.postDataBuffer().toString(), /remote file content/);
        if (uploadCalls === 3) { slowRoute = route; return; }
        return uploadCalls === 1 ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Upload temporarily unavailable' } }) }) : respond({ url: '/download/uploaded.txt' });
      }
      if (endpoint === 'folders') { if (req.method() === 'PUT') folderNames = req.postDataJSON().data; return respond(folderNames); }
      if (endpoint === 'file-library') {
        if (req.method() === 'PUT') { assert.equal(req.headers()['if-match'], 'v1'); library = req.postDataJSON().data; saved = true; }
        return respond(library, saved ? 'v2' : 'v1');
      }
      return route.fulfill({ status: 204 });
    });
    const p = await remote.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${base}/personalize?section=files`); await p.getByRole('button', { name: /Server folder/ }).waitFor(); assert.equal(await p.locator('.files-template').count(), 0);
    await p.getByRole('button', { name: /Server folder/ }).click(); await p.locator('.files-page input[type=file]').setInputFiles({ name: 'uploaded.txt', mimeType: 'text/plain', buffer: Buffer.from('remote file content') });
    await p.getByText('Upload temporarily unavailable', { exact: true }).waitFor(); assert.equal(await p.locator('.files-template').count(), 0);
    await p.locator('.files-uploads').getByRole('button', { name: 'Retry', exact: true }).click(); await p.locator('.files-template').waitFor();
    await p.waitForFunction(() => !document.querySelector('.files-uploads')); await p.waitForTimeout(300);
    assert.equal(uploadCalls, 2); assert(saved); assert.equal(library.items[0].url, '/download/uploaded.txt'); assert.equal(library.items[0].localBlobId, undefined);
    assert.equal(library.items[0].access, 'shared');
    await p.reload(); await p.locator('.files-template').waitFor();
    await p.locator('.files-page input[type=file]').setInputFiles({ name: 'cancelled.txt', mimeType: 'text/plain', buffer: Buffer.from('remote file content') });
    await p.locator('.files-uploads').waitFor(); await p.waitForTimeout(100);
    await p.locator('.ui-as-user').click(); await p.getByRole('menuitemradio').filter({ hasText: 'Personal' }).click();
    await p.getByText('Folder not found', { exact: true }).waitFor();
    if (slowRoute) await slowRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { url: '/download/late.txt' } }) }).catch(() => {});
    await p.waitForTimeout(200); assert.equal(library.items.length, 1, 'late cancelled uploads cannot enter the previous workspace');
    assert.equal(await p.locator('.files-template').count(), 0); assert(requests.some(req => req.url.includes('/workspaces/personal/file-library')));
    await p.locator('.ui-as-user').click(); await p.getByRole('menuitemradio').filter({ hasText: 'Logio' }).click(); await p.locator('.files-template').waitFor();
    await p.goto(`${base}/personalize?section=files&folder=Missing`); await p.getByText('Folder not found', { exact: true }).waitFor();
    await p.screenshot({ path: `${out}/remote.png` }); await remote.close();
    await fs.writeFile(`${out}/http-requests.json`, JSON.stringify(requests, null, 2));
  });
  await check('Unauthorized backend is visible with retry and never inserts source/demo files', async () => {
    const remote = await browser.newContext(); await remote.addInitScript(() => { window.__workspaceBackendConfig = { baseUrl: `${location.origin}/__denied-api` }; });
    await remote.route('**/__denied-api/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Please sign in to your workspace' } }) }));
    const p = await remote.newPage(); await p.goto(`${base}/personalize?section=files`); await p.locator('.files-error-banner').waitFor();
    assert.match(await p.locator('.files-error-banner').innerText(), /Please sign in/); assert.equal(await p.locator('.files-template').count(), 0); assert.equal(await p.getByRole('button', { name: 'Create folder', exact: true }).isDisabled(), true); await remote.close();
  });
  assert.deepEqual(errors, []); assert.deepEqual(outbound, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors, affectuiRequests: outbound }, null, 2));
  await browser.close();
}
