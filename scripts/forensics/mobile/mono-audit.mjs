// Finds rules in mono.css / overrides.css that apply UNCONDITIONALLY to a selector whose reference rules are
// conditional (inside @media / @supports): they are unlayered, so they beat the reference at every width and can
// switch on desktop-only styling on phones (or flatten a per-breakpoint variant).
// node scripts/forensics/mobile/mono-audit.mjs [mono.css|overrides.css|both]
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = "src/styles/stripe";
const gen = [];
const walkDir = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walkDir(p); else if (p.endsWith(".css")) gen.push(p); } };
walkDir(path.join(root, "generated"));

const norm = (s) => s.replace(/\s+/g, " ").replace(/\s*([>+~,])\s*/g, "$1").trim();
const squash = (c) => c.replace(/\s+/g, "").toLowerCase();
const family = (prop) => {
  const p = prop.toLowerCase();
  if (p.startsWith("--")) return p;
  if (p === "background" || p.startsWith("background-")) return "background";
  if (p.startsWith("border") && /color|^border$|-(top|bottom|left|right)$/.test(p)) return "border-color";
  return p;
};
const conditionsOf = (node) => {
  const c = [];
  for (let n = node.parent; n && n.type !== "root"; n = n.parent) if (n.type === "atrule" && /^(media|supports|container)$/.test(n.name)) c.unshift(`@${n.name} ${n.params}`);
  return c;
};
const originals = new Map(); // `${selector}|${family}` -> [{cond, value, file}]
for (const file of gen) {
  const css = postcss.parse(fs.readFileSync(file, "utf8"));
  css.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const cond = conditionsOf(rule);
    for (const sel of rule.selectors || []) {
      rule.walkDecls((d) => {
        if (d.parent !== rule) return;
        const key = `${norm(sel)}|${family(d.prop)}`;
        if (!originals.has(key)) originals.set(key, []);
        originals.get(key).push({ cond: cond.join(" && "), value: d.value, prop: d.prop, file: path.basename(file) });
      });
    }
  });
}

const which = process.argv[2] || "both";
const files = which === "both" ? ["mono.css", "overrides.css"] : [which];
let flagged = 0;
for (const f of files) {
  const css = postcss.parse(fs.readFileSync(path.join(root, f), "utf8"));
  css.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const cond = conditionsOf(rule).join(" && ");
    for (const sel of rule.selectors || []) {
      rule.walkDecls((d) => {
        if (d.parent !== rule) return;
        const key = `${norm(sel)}|${family(d.prop)}`;
        const orig = originals.get(key);
        if (!orig) return;
        const conds = new Set(orig.map((o) => o.cond));
        const known = new Set(orig.map((o) => squash(o.cond)));
        // flag: our rule has no (or different) condition, and the reference sets this property only under conditions
        // or differently per condition
        const allConditional = orig.every((o) => o.cond);
        const varied = conds.size > 1;
        if ((allConditional && !known.has(squash(cond))) || (varied && !cond)) {
          flagged++;
          console.log(`${f}:${d.source?.start?.line}  ${norm(sel).slice(0, 90)} { ${d.prop}: ${d.value.slice(0, 70)} }${cond ? "  [" + cond + "]" : ""}`);
          for (const o of orig.slice(0, 4)) console.log(`      ref ${o.file}: ${o.cond || "(always)"}  ${o.prop}: ${o.value.slice(0, 80)}`);
        }
      });
    }
  });
}
console.log(`\n${flagged} flagged declarations`);
