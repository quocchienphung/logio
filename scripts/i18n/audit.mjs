import fs from 'node:fs';
import ts from 'typescript';

const catalog = new Map(), duplicates = [];
for (const name of fs.readdirSync('src/components/sites/i18n').filter(name => /^vi-.+\.ts$/.test(name))) {
  const ast = ts.createSourceFile(name, fs.readFileSync(`src/components/sites/i18n/${name}`, 'utf8'), ts.ScriptTarget.Latest, true);
  function read(node) {
    if (ts.isNoSubstitutionTemplateLiteral(node)) for (const line of (ts.isTaggedTemplateExpression(node.parent) && node.parent.tag.getText(ast) === 'String.raw' ? node.rawText : node.text).trim().split('\n')) {
      const at = line.indexOf('\t');
      if (at < 1) throw new Error(`${name}: missing tab ${line}`);
      const key = line.slice(0, at), value = line.slice(at + 1);
      if (catalog.has(key) && catalog.get(key) !== value) duplicates.push({ key, before: catalog.get(key), after: value, file: name });
      catalog.set(key, value);
    }
    ts.forEachChild(node, read);
  }
  read(ast);
}
const missing = new Map();
const files = JSON.parse(fs.readFileSync('docs/research/workspace-i18n/files.json', 'utf8'));
for (const file of files.filter(f => f.endsWith('.tsx'))) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function add(key) {
    key = key.replace(/\s+/g, ' ').trim();
    if (!/[a-z]{2}/i.test(key) || catalog.has(key)) return;
    const item = missing.get(key) ?? { key, files: [] };
    if (!item.files.includes(file)) item.files.push(file);
    missing.set(key, item);
  }
  function argumentsOf(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text);
    else if (ts.isTemplateExpression(node)) add(node.head.text + node.templateSpans.map((span, i) => `{${i}}${span.literal.text}`).join(''));
    else if (ts.isConditionalExpression(node)) { argumentsOf(node.whenTrue); argumentsOf(node.whenFalse); }
    else if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node) && !ts.isJsxFragment(node)) ts.forEachChild(node, argumentsOf);
  }
  function walk(node) {
    if (ts.isCallExpression(node) && ['uiText', 't'].includes(node.expression.getText(ast))) node.arguments.forEach(argumentsOf);
    ts.forEachChild(node, walk);
  }
  walk(ast);
}
fs.writeFileSync('docs/research/workspace-i18n/audit.json', JSON.stringify({ entries: catalog.size, duplicates, missing: [...missing.values()] }, null, 2));
console.log(JSON.stringify({ entries: catalog.size, duplicates, missing: missing.size }));
if (process.argv.includes('--list')) console.log([...missing.keys()].join('\n'));
