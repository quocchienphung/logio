// Pipe JSX/HTML through this to rewrite remote asset URLs to local /stripe paths (asset-map.json).
import fs from "node:fs";
const map = JSON.parse(fs.readFileSync("docs/research/stripe-live/asset-map.json", "utf8"));
let s = fs.readFileSync(0, "utf8");
const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
for (const [url, local] of entries) {
  s = s.split(url).join(local);
  s = s.split(url.replace(/&/g, "&amp;")).join(local);
}
process.stdout.write(s);
