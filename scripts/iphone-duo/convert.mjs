// Convert the prepared iPhone Duo USDC to the homepage's glTF and status glyph.
//   node scripts/iphone-duo/convert.mjs temp/iphone-duo
// Writes public/sites/iphone-duo/{iphone-duo.glb,status-ring.png}. Needs Chrome (Playwright channel
// "chrome") and network access for three r186 from jsDelivr; meshes are compressed with
// gltf-transform's meshopt (names are kept: the screens are found by mesh name).
import { execFileSync } from "node:child_process";
import { copyFileSync, createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const work = resolve(process.argv[2] ?? join(root, "temp/iphone-duo"));
if (!existsSync(join(work, "iPhone_Duo_Render.usdc"))) throw new Error(`Run prepare.py first: ${work}`);
copyFileSync(join(root, "scripts/iphone-duo/convert.html"), join(work, "convert.html"));

const types = { ".html": "text/html", ".usdc": "application/octet-stream", ".avif": "image/avif", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  const file = join(work, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(work) || !existsSync(file) || !statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const { port } = server.address();

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error(e.message));
await page.goto(`http://127.0.0.1:${port}/convert.html`);
await page.waitForFunction(() => window.__result, null, { timeout: 300_000 });
const { glb, ring, measures } = await page.evaluate(() => window.__result);
await browser.close();
server.close();

const raw = join(work, "iphone-duo.raw.glb");
writeFileSync(raw, Buffer.from(glb, "base64"));
const out = join(root, "public/sites/iphone-duo");
mkdirSync(out, { recursive: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const gt = (...args) => execFileSync(npx, ["-y", "@gltf-transform/cli@4.2.1", ...args], { stdio: "inherit", shell: process.platform === "win32" });
gt("dedup", raw, join(work, "dedup.glb"));
gt("meshopt", join(work, "dedup.glb"), join(out, "iphone-duo.glb"), "--level", "medium");
writeFileSync(join(out, "status-ring.png"), Buffer.from(ring.split(",")[1], "base64"));
console.log(JSON.stringify(measures, null, 2));
