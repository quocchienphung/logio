// One-off patch runner: node _patch.mjs <patch.json>  where patch.json = [{file, from, to}] (from must match once)
import fs from "node:fs";
const patches = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const p of patches) {
  let s = fs.readFileSync(p.file, "utf8");
  const n = s.split(p.from).length - 1;
  if (n !== 1) {
    console.error(`SKIP ${p.file}: pattern found ${n} times:\n${p.from.slice(0, 120)}`);
    process.exitCode = 1;
    continue;
  }
  s = s.replace(p.from, () => p.to);
  fs.writeFileSync(p.file, s);
  console.log("patched", p.file);
}
