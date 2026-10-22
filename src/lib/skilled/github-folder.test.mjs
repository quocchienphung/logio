import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { readSkillArchive, importGitHubFolder } from './github-folder.ts';
import { createBundle } from '../../components/sites/skilled/skill-model.ts';

const commit = '0123456789abcdef0123456789abcdef01234567';
const main = '---\nname: evidence-folder\ndescription: Use a real supporting reference.\n---\nRead references/check.md.\n';
function archive(entries) {
  const data = zipSync(Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, typeof value === 'string' ? strToU8(value) : value])));
  const result = new Uint8Array(data.length + 40); result.set(data); result.set(strToU8(commit), data.length);
  new DataView(result.buffer).setUint16(data.length - 2, 40, true);
  return result;
}
const files = () => ({ 'repo-main/skills/evidence/SKILL.md': main, 'repo-main/skills/evidence/references/check.md': 'Inspect primary sources.', 'repo-main/skills/evidence/assets/image.bin': new Uint8Array([0, 255, 1, 90]), 'repo-main/LICENSE': 'MIT license example', 'repo-main/other/secret.txt': 'not in this skill' });
const url = 'https://github.com/owner/repo/tree/main/skills/evidence';

test('public archive scan pins commit, includes folder references/binary/license, excludes unrelated source', async () => {
  const result = await readSkillArchive(archive(files()), url);
  assert.equal(result.sourceRef, commit);
  assert.match(result.sourceUrl, new RegExp(commit));
  assert.equal(result.instructions, main);
  assert.deepEqual(result.files.map(file => file.path).sort(), ['SOURCE-LICENSE.txt', 'assets/image.bin', 'references/check.md']);
  assert.equal(result.files.find(file => file.path.endsWith('bin')).encoding, 'base64');
  const record = { ...result, id: 'skill-1', target: 'Local AI', status: 'ready', importedAt: new Date().toISOString(), guardrails: { citeSources: true, verifyBeforeAnswer: true, askWhenUncertain: true } };
  assert.equal((await createBundle([record], 'acme')).skills[0].files.length, 3);
});

test('scan rejects missing skill, unsafe folder paths, oversized files and archives without commit identity', async () => {
  await assert.rejects(readSkillArchive(archive({ 'repo-main/elsewhere/readme.md': 'none' }), url), /does not contain/);
  await assert.rejects(readSkillArchive(archive({ ...files(), 'repo-main/skills/evidence/../escape.txt': 'bad' }), url), /unsafe/);
  await assert.rejects(readSkillArchive(archive({ ...files(), 'repo-main/skills/evidence/too-big.txt': 'x'.repeat(1024 * 1024 + 1) }), url), /oversized/);
  await assert.rejects(readSkillArchive(zipSync({ 'repo-main/skills/evidence/SKILL.md': strToU8(main) }), url), /commit identity/);
});

test('folder import uses public codeload and rejects unsupported hosts before making a request', async () => {
  let request;
  const result = await importGitHubFolder(url, async (input, options) => { request = { input, options }; return new Response(archive(files())); });
  assert.equal(request.input, 'https://codeload.github.com/owner/repo/zip/main');
  assert.equal(request.options.redirect, 'error');
  assert.equal(result.name, 'evidence-folder');
  await assert.rejects(importGitHubFolder('https://evil.test/repo', async () => { throw new Error('must not fetch'); }), /Only public/);
});
