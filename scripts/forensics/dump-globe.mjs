// Dump the globe chunk: string-export shader modules to .glsl files and the main module to a readable file.
import fs from "node:fs";
const s = fs.readFileSync("docs/research/stripe-com-9ababc9a/root-8a5edab2/scripts/38639-81d74276c11dcb10.js", "utf8");
const D = "docs/research/stripe-live/shaders/globe";
fs.mkdirSync(D, { recursive: true });
const re = /(\d+):function\(e\)\{e\.exports="((?:[^"\\]|\\.)*)"\}/g;
let m;
while ((m = re.exec(s))) {
  const src = JSON.parse('"' + m[2] + '"');
  fs.writeFileSync(`${D}/${m[1]}.glsl`, src);
  const head = src.split("\n").filter((l) => /^(uniform|attribute)/.test(l)).slice(0, 8).join(" | ");
  console.log(m[1], src.length, head);
}
const start = s.indexOf("38639:function(e,t,a){");
const end = s.indexOf("48343:function(e,t,a){");
const mod = s.slice(start, end);
fs.writeFileSync(`${D}/main.js`, mod.replace(/;/g, ";\n"));
console.log("main", mod.length);
