// Contract harness for the carousels ports that depend on other groups' child controllers
// (AnimationSequence -> icon AnimationControllers, DetailCodeSnippetCarousel -> Track + CodeEditor,
// SegmentedControl -> HorizontalOverflowContainer, CaseStudyCarousel -> Video). The TypeScript sources
// are transpiled in memory and served to a blank page through Playwright request routing (no server);
// the child controllers are stand-in mocks that record calls.
// node scripts/forensics/products/qa/carousels-harness.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = "src/components/sites/stripe-com-9ababc9a/v1/controllers";
const files = { "lib.ts": join(ROOT, "lib.ts"), "types.ts": join(ROOT, "types.ts") };
for (const f of readdirSync(join(ROOT, "carousels"))) files[`carousels/${f}`] = join(ROOT, "carousels", f);
const served = {};
for (const [name, path] of Object.entries(files)) {
  const out = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  served[name.replace(/\.ts$/, ".js")] = out.replace(/from "(\.{1,2}\/[^"]+)"/g, 'from "$1.js"');
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("http://harness.local/**", (r) => {
  const p = new URL(r.request().url()).pathname.slice(1);
  if (p === "") return r.fulfill({ contentType: "text/html", body: "<!doctype html><body style='margin:0'></body>" });
  return served[p] ? r.fulfill({ contentType: "text/javascript", body: served[p] }) : r.fulfill({ status: 404, body: "" });
});
await page.goto("http://harness.local/");

const result = await page.evaluate(async () => {
  const { controllers } = await import("/carousels/index.js");
  const { exposeApi } = await import("/lib.js");
  const log = [];
  const t0 = performance.now();
  const at = () => Math.round(performance.now() - t0);
  const mount = (root) => {
    const nodes = [root, ...root.querySelectorAll("[data-js-controller]")].reverse();
    const offs = [];
    for (const n of nodes) for (const name of n.dataset.jsController.split(" ")) if (controllers[name]) offs.push(controllers[name](n));
    return () => offs.forEach((f) => f && f());
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1. AnimationSequence: three icons, mock animations of 400 ms that resolve play().
  document.body.innerHTML = `<div style="height:1600px"></div><div id="seq" data-js-controller="AnimationSequence">
    <svg data-js-controller="GearsIcon" id="a"></svg><svg data-js-controller="FastForwardIcon" id="b"></svg><svg data-js-controller="DocumentWithCheckmarkIcon" id="c"></svg></div>`;
  document.querySelectorAll("#seq svg").forEach((svg) => {
    let timer = 0, left = 400, started = 0;
    exposeApi(svg, svg.dataset.jsController, {
      play() {
        log.push(`${at()} play ${svg.id}`);
        started = performance.now();
        return new Promise((r) => { timer = setTimeout(() => { log.push(`${at()} done ${svg.id}`); r(); }, left); });
      },
      pause() { clearTimeout(timer); left -= performance.now() - started; log.push(`${at()} pause ${svg.id}`); },
      restart() { clearTimeout(timer); left = 400; log.push(`${at()} restart ${svg.id}`); },
    });
  });
  const off1 = mount(document.getElementById("seq"));
  await wait(500);
  log.push(`${at()} (offscreen so far: nothing should play)`);
  document.getElementById("seq").scrollIntoView();
  await wait(4000);
  scrollTo(0, 0);
  log.push(`${at()} scrolled away`);
  await wait(1500);
  document.getElementById("seq").scrollIntoView();
  log.push(`${at()} back in view`);
  await wait(7000);
  off1();
  const seqLog = [...log];

  // 2. DetailCodeSnippetCarousel + SegmentedControl + HorizontalOverflowContainer, with mocks.
  log.length = 0;
  document.body.innerHTML = `<div id="d" data-js-controller="DetailCodeSnippetCarousel">
    <div data-js-target-list="DetailCodeSnippetCarousel.codeSnippets" style="display:none">const a = 1;</div>
    <div data-js-target-list="DetailCodeSnippetCarousel.codeSnippets" style="display:none">const b = 2;</div>
    <nav class="SegmentedControl" data-js-controller="SegmentedControl" data-selection-mode="single" style="--segmentedControlSpacing:16px;--segmentedControlBorderRadius:16px">
      <div data-js-controller="HorizontalOverflowContainer" id="hoc"><div data-js-target="SegmentedControl.backButtonContainer"></div>
      <div data-js-target="SegmentedControl.items" style="display:flex;padding:0 16px"><button data-js-target-list="SegmentedControl.buttons">One</button><button data-js-target-list="SegmentedControl.buttons">Two</button></div></div>
    </nav>
    <div data-js-controller="Track" id="track"></div><div data-js-controller="CodeEditor" id="editor"></div></div>`;
  exposeApi(document.getElementById("hoc"), "HorizontalOverflowContainer", { makeSureElementIsInView: (el, s) => log.push(`inView ${el.textContent} ${s}`) });
  exposeApi(document.getElementById("track"), "Track", { set index(i) { log.push(`track.index=${i}`); } });
  exposeApi(document.getElementById("editor"), "CodeEditor", { setCode: (c) => log.push(`setCode ${c}`) });
  const off2 = mount(document.getElementById("d"));
  document.querySelectorAll('[data-js-target="SegmentedControl.items"] button')[1].click();
  await wait(50);
  const supporting = document.querySelectorAll('[data-js-target="SegmentedControl.backButtonContainer"] button').length;
  off2();
  const afterCleanup = document.querySelectorAll('[data-js-target="SegmentedControl.backButtonContainer"] button').length;
  const detailLog = [...log, `supporting buttons: ${supporting}, after cleanup: ${afterCleanup}`];

  // 3. DetailCodeSnippetCarousel without any child APIs (other groups not merged): must not throw.
  document.body.innerHTML = `<div id="e" data-js-controller="DetailCodeSnippetCarousel"><div data-js-target-list="DetailCodeSnippetCarousel.codeSnippets">x</div>
    <nav data-js-controller="SegmentedControl" data-selection-mode="single"><div data-js-target="SegmentedControl.backButtonContainer"></div><div data-js-target="SegmentedControl.items"><button data-js-target-list="SegmentedControl.buttons">A</button><button data-js-target-list="SegmentedControl.buttons">B</button></div></nav>
    <div data-js-controller="Track"></div><div data-js-controller="CodeEditor"></div></div>`;
  const off3 = mount(document.getElementById("e"));
  document.querySelectorAll('[data-js-target="SegmentedControl.items"] button')[1].click();
  off3();

  // 4. AnimationSequence without icon APIs: must not throw, loops through its 2.5 s gaps.
  document.body.innerHTML = `<div id="s" data-js-controller="AnimationSequence"><svg data-js-controller="GearsIcon"></svg></div>`;
  const off4 = mount(document.getElementById("s"));
  await wait(300);
  off4();
  return { seqLog, detailLog };
});
console.log("AnimationSequence:\n  " + result.seqLog.join("\n  "));
console.log("DetailCodeSnippetCarousel / SegmentedControl:\n  " + result.detailLog.join("\n  "));
console.log(errors.length ? "PAGE ERRORS:\n" + errors.join("\n") : "no page errors");
await browser.close();
