// Dump the stats data-viz GLSL string modules from the index chunk to .glsl files.
import fs from "node:fs";
const s = fs.readFileSync("docs/research/stripe-com-9ababc9a/root-8a5edab2/scripts/index-598fe7b339d40ae3.js", "utf8");
const D = "docs/research/stripe-live/shaders/dataviz";
const ids = ["8891", "90258", "66003", "82231", "69500", "80957", "4663", "45244", "53628", "70538", "74820", "90761", "54333", "32832", "7249", "93649"];
for (const id of ids) {
  const i = s.indexOf(`${id}:function(e){e.exports="`);
  const re = new RegExp('e\\.exports="((?:[^"\\\\]|\\\\.)*)"', "y");
  re.lastIndex = s.indexOf("e.exports=", i);
  const m = re.exec(s);
  const src = JSON.parse('"' + m[1] + '"');
  fs.writeFileSync(`${D}/${id}.glsl`, src);
  console.log(id, src.length, src.split("\n").filter((l) => /^(uniform|attribute)/.test(l)).slice(0, 5).join(" | "));
}
