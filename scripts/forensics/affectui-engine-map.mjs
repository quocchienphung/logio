import fs from 'node:fs/promises';

const root = 'docs/research/affectui-library';
const manifest = JSON.parse(await fs.readFile(`${root}/manifest.json`, 'utf8'));
const usage = new Map();
for (const page of manifest) {
  for (const hash of page.styleHashes || []) usage.set(hash, [...(usage.get(hash) || []),page.route]);
}
const styles = [];
for (const [hash,routes] of usage) {
  const css = await fs.readFile(`${root}/styles/${hash}.css`,'utf8');
  const namespaces = [...new Set([...css.matchAll(/\.((?:ui-)[a-z][a-z0-9]*)(?=[\s.:\[_{>-])/g)].map(match=>match[1]))];
  styles.push({hash,routes,namespaces,bytes:Buffer.byteLength(css)});
}
styles.sort((a,b)=>b.routes.length-a.routes.length);
const families = ['components','screens','blocks','illustrations','motion'].map(family=>({
  family,
  count:manifest.filter(page=>page.route.startsWith(`/${family}/`)).length,
  pages:manifest.filter(page=>page.route.startsWith(`/${family}/`)),
}));
await fs.writeFile(`${root}/engine-map.json`,JSON.stringify({captured:'2026-10-19',scope:'Public Clean documentation and initial previews; interactive CRM and Analytics audits are separate.',families,styles},null,2));
const lines = [
  '# affectUI public library inventory', '',
  'Captured 2026-10-19. Read [the handoff](../../affectui-handoff.md) before implementation.', '',
  'These are reference observations, not installed Pro source. CRM and Analytics have separate local implementations and interaction/mobile audits. The library inventory itself records a desktop initial-state screenshot, public documentation/API text, visible controls, class inventory and deduplicated runtime styles for each item.', '',
  '| Family | Public items |', '| --- | ---: |',
  ...families.map(family=>`| ${family.family} | ${family.count} |`), '',
  '`manifest.json` maps source routes to style hashes. `engine-map.json` maps observed CSS namespaces to routes. Each `pages/<family>--<slug>.json` contains public documentation, API reference text, assets and controls; the adjacent PNG shows the initial viewport. A style hash resolves to `styles/<hash>.css`. A stylesheet appearing on a page does not prove a component dependency: globally injected styles can be present without visible UI. Check the DOM roots and interaction states before reusing it.', '',
  '## Most frequently observed style modules', '',
  '| Hash | Namespaces | Pages |', '| --- | --- | ---: |',
  ...styles.slice(0,12).map(style=>`| [${style.hash}](styles/${style.hash}.css) | ${style.namespaces.join(', ')} | ${style.routes.length} |`), '',
  '## Source index', '',
  ...manifest.map(page=>`- [${page.title}](https://www.affectui.com${page.route}) — [local evidence](pages/${page.route.slice(1).replaceAll('/','--')}.json)`), '',
  'Reproduce with `node scripts/forensics/affectui-library.mjs`, then `node scripts/forensics/affectui-engine-map.mjs`. This inventory excludes authenticated code/CLI endpoints, Classic variants and unobserved interaction states.', '',
];
await fs.writeFile(`${root}/README.md`,lines.join('\n'));
console.log(families.map(f=>`${f.family}: ${f.count}`).join('; '));
console.log(`${styles.length} deduplicated runtime style modules`);
