import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const roots = ['src/components/sites/guide-navigation/GuideNavigation.tsx', 'src/components/sites/skilled/SkilledWorkspace.tsx', 'src/components/sites/command-palette/CommandPalette.tsx'];
const seen = new Set();
export const files = [];
function visitFile(file) {
  if (seen.has(file) || /stripe|\/i18n\//i.test(file)) return;
  seen.add(file);
  if (!fs.existsSync(file)) return;
  const source = fs.readFileSync(file, 'utf8');
  files.push(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function imports(node) {
    const importSource = ts.isImportDeclaration(node) ? node.moduleSpecifier : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : undefined;
    if (importSource && ts.isStringLiteral(importSource)) {
    const spec = importSource.text;
    if (!(spec.startsWith('.') || spec.startsWith('@/'))) return;
    const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : path.posix.join(path.posix.dirname(file), spec);
    const stem = base.replace(/\.(?:js|ts|tsx)$/, '');
    const target = [base, `${stem}.tsx`, `${stem}.ts`, `${base}/index.ts`, `${base}/index.tsx`].find(name => fs.existsSync(name) && fs.statSync(name).isFile());
    if (target && /\.tsx?$/.test(target)) visitFile(target);
    }
    ts.forEachChild(node, imports);
  }
  imports(ast);
}
roots.forEach(visitFile);

const entries = new Map();
function add(text, file, kind) {
  text = text.replace(/\s+/g, ' ').trim();
  if (!/[a-zA-Z]{2}/.test(text) || text.length > 1400) return;
  if (/^(?:https?:|\/|\.|@|#[\w-]|--|[\w-]+\/(?:[\w-]+\/)?)/.test(text)) return;
  if (/^[a-z][a-z0-9_-]*$/.test(text)) return;
  const item = entries.get(text) ?? { text, files: [], kinds: [] };
  if (!item.files.includes(file)) item.files.push(file);
  if (!item.kinds.includes(kind)) item.kinds.push(kind);
  entries.set(text, item);
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function walk(node) {
    if (ts.isJsxText(node)) add(node.text, file, 'jsx');
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!ts.isImportDeclaration(node.parent) && !ts.isLiteralTypeNode(node.parent)) add(node.text, file, 'string');
    } else if (ts.isTemplateExpression(node)) {
      add(node.head.text + node.templateSpans.map((span, index) => `{${index}}${span.literal.text}`).join(''), file, 'template');
    }
    ts.forEachChild(node, walk);
  }
  walk(ast);
}
fs.mkdirSync('docs/research/workspace-i18n', { recursive: true });
fs.writeFileSync('docs/research/workspace-i18n/inventory.json', JSON.stringify([...entries.values()], null, 2));
fs.writeFileSync('docs/research/workspace-i18n/files.json', JSON.stringify(files, null, 2));
console.log(JSON.stringify({ files: files.length, entries: entries.size, jsx: [...entries.values()].filter(x => x.kinds.includes('jsx')).length }));
