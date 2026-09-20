// Wrap an extracted JSX subtree in a React component file.
// node gen-component.mjs "<selector>" <index> <Name> <out.tsx> [--children] [--client]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [sel, idx, name, out, ...flags] = process.argv.slice(2);
let jsx = execFileSync("node", ["scripts/forensics/extract-html.mjs", sel, idx, "--jsx"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
jsx = execFileSync("node", ["scripts/forensics/localize.mjs"], { input: jsx, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (flags.includes("--children")) {
  // drop the outer element, keep its children
  const lines = jsx.trimEnd().split("\n");
  jsx = lines.slice(1, -1).map((l) => l.replace(/^  /, "")).join("\n") + "\n";
}
const body = jsx.trimEnd().split("\n").map((l) => "      " + l).join("\n");
const src = `${flags.includes("--client") ? '"use client";\n\n' : ""}/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs "${sel}" ${idx}).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function ${name}() {
  return (
    <>
${body}
    </>
  );
}
`;
fs.writeFileSync(out, src);
console.log("wrote", out, src.length, "bytes");
