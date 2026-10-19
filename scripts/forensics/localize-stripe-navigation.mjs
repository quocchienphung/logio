/** Context-aware source migration. Run with Node >=22.18 or --experimental-strip-types. */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { normalizeStripeNavigation } from "../../src/lib/stripe-navigation.ts";

const navigationKey = /^(?:href|action|formAction|url|docsUrl|redirectUrl|submissionUrl|destination|data-(?:href|url|submission-url|redirect-url))$/i;
const manifest = [];
const checkOnly = process.argv.includes("--check");
function replaceDestination(value, file, context) {
  const destination = normalizeStripeNavigation(value);
  if (destination !== value) manifest.push({ file: file.replaceAll("\\", "/"), context, from: value, to: destination });
  return destination;
}
function structured(value, file, context = "JSON") {
  if (Array.isArray(value)) return value.map(item => structured(item, file, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      typeof item === "string" && navigationKey.test(key) ? replaceDestination(item, file, `${context}.${key}`) : structured(item, file, `${context}.${key}`),
    ]));
  }
  return value;
}
function embedded(value, file) {
  if (/^\s*[\[{]/.test(value)) {
    try { return JSON.stringify(structured(JSON.parse(value), file, "embedded JSON")); } catch { /* HTML below */ }
  }
  return value.replace(/\b(href|action|formaction|data-(?:href|url|submission-url|redirect-url))\s*=\s*(["'])(.*?)\2/gi,
    (match, attribute, quote, destination) => {
      const next = replaceDestination(destination, file, `HTML ${attribute}`);
      return next === destination ? match : `${attribute}=${quote}${next}${quote}`;
    });
}
let changedFiles = 0;
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!/\.(?:tsx?|json)$/.test(file) || /(?:stripe-navigation|StripeNavigationScript)\./.test(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    if (!/(?:stripe\.com|stripedemos\.com|stripe\.link|link\.com)/i.test(source)) continue;
    let next = source;
    if (file.endsWith(".json")) {
      const value = JSON.parse(source);
      const before = manifest.length;
      const result = structured(value, file);
      if (manifest.length > before) next = `${JSON.stringify(result, null, 2)}\n`;
    } else {
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      const edits = [];
      function visit(node) {
        if (ts.isStringLiteralLike(node) && /(?:stripe\.com|stripedemos\.com|stripe\.link|link\.com)/i.test(node.text)) {
          let parent = node.parent;
          if (ts.isJsxExpression(parent)) parent = parent.parent;
          const key = parent.name?.getText?.(ast)?.replace(/^["']|["']$/g, "") || "";
          const isNavigation = (ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent)) && navigationKey.test(key);
          const before = manifest.length;
          const replacement = isNavigation ? replaceDestination(node.text, file, `${key}:${ast.getLineAndCharacterOfPosition(node.pos).line + 1}`) : embedded(node.text, file);
          if (manifest.length > before) {
            const literal = ts.isJsxAttribute(node.parent) ? `"${replacement.replaceAll('"', '&quot;')}"` : JSON.stringify(replacement);
            edits.push({ start: node.getStart(ast), end: node.end, literal });
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
      for (const edit of edits.sort((a, b) => b.start - a.start)) next = next.slice(0, edit.start) + edit.literal + next.slice(edit.end);
    }
    if (next !== source) { if (!checkOnly) fs.writeFileSync(file, next); changedFiles += 1; }
  }
}
walk("src");
if (manifest.length && !checkOnly) {
  fs.mkdirSync("docs/research/local-navigation", { recursive: true });
  const manifestFile = "docs/research/local-navigation/stripe-destinations.json";
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")).destinations : [];
  const destinations = [...previous, ...manifest];
  fs.writeFileSync(manifestFile, `${JSON.stringify({ changedFiles: new Set(destinations.map(item => item.file)).size, changedDestinations: destinations.length, destinations }, null, 2)}\n`);
}
console.log(JSON.stringify({ changedFiles, changedDestinations: manifest.length }));
if (checkOnly && manifest.length) { console.error(manifest); process.exitCode = 1; }
