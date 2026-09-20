// Extract authored rules whose selectors reference any of the given class prefixes.
// node extract-css.mjs prefix [prefix...] [--out file]  (prefix matches ".prefix" at a class boundary)
import fs from "node:fs";
import postcss from "postcss";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const out = oi >= 0 ? args[oi + 1] : null;
const prefixes = args.filter((a, i) => a !== "--out" && i !== oi + 1);
const css = fs.readFileSync("docs/research/stripe-live/css/all.css", "utf8");
const root = postcss.parse(css);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regexes = prefixes.filter((p) => p.startsWith("re:")).map((p) => new RegExp(p.slice(3)));
const classes = prefixes.filter((p) => !p.startsWith("re:"));
const re = classes.length ? new RegExp(`\\.(${classes.map(esc).join("|")})(?![\\w-])`) : null;
const matches = (sel) => (re && re.test(sel)) || regexes.some((r) => r.test(sel));

const result = postcss.root();
const seen = new Set();
function keep(rule) {
  if (!matches(rule.selector)) return;
  const chain = [];
  let p = rule.parent;
  while (p && p.type === "atrule") {
    chain.push(p);
    p = p.parent;
  }
  let target = result;
  for (const at of chain.reverse()) {
    const key = at.name + " " + at.params;
    let existing = target.nodes?.find((n) => n.type === "atrule" && n.name + " " + n.params === key);
    if (!existing) {
      existing = postcss.atRule({ name: at.name, params: at.params });
      target.append(existing);
    }
    target = existing;
  }
  const sig = chain.map((a) => a.params).join("|") + "::" + rule.selector + "::" + rule.nodes.map(String).join(";");
  if (seen.has(sig)) return;
  seen.add(sig);
  target.append(rule.clone());
}
root.walkRules(keep);
const text = result
  .toString()
  .replace(/\}\s*/g, "}\n")
  .replace(/\{\s*/g, "{\n  ")
  .replace(/;(?=[^\n])/g, ";\n  ");
if (out) fs.writeFileSync(out, text);
else process.stdout.write(text);
console.error(`${result.nodes.length} top-level nodes`);
