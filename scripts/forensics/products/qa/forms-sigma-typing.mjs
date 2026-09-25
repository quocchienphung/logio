// QA: Sigma DevelopersCodeEditor -> AnimatedCodeEditor typing script, cursor, autocomplete and status bar.
// node scripts/forensics/products/qa/forms-sigma-typing.mjs [width] [shotDir] [reduced=0]
import { check, open, shotEl } from "./forms-lib.mjs";

const [width = "1440", shotDir = "", reduced = "0"] = process.argv.slice(2);
const { browser, page, errors } = await open("/sigma", { width: +width, reducedMotion: reduced === "1" ? "reduce" : "no-preference" });
const root = "[data-js-controller=DevelopersCodeEditor]";

const sample = () =>
  page.evaluate((r) => {
    const el = document.querySelector(r);
    const ed = el.querySelector(".CodeEditor");
    const ac = el.querySelector(".CodeEditorAutocomplete");
    const cur = el.querySelector(".CodeEditorCursor");
    return {
      t: Math.round(performance.now()),
      cls: ed.className.replace(/CodeEditor /g, "").trim(),
      code: el.querySelector("[data-js-target='CodeEditor.editor']").textContent,
      mode: el.querySelector("[data-js-target='CodeEditorStatusBar.modeLabel']").textContent,
      lineInfo: el.querySelector("[data-js-target='CodeEditorStatusBar.lineInfo']").textContent,
      col: el.querySelector("[data-js-target='CodeEditorStatusBar.currentColumn']").textContent,
      pct: el.querySelector("[data-js-target='CodeEditorStatusBar.downProgress']").textContent,
      acVisible: ac.classList.contains("CodeEditorAutocomplete--visible"),
      acItems: [...ac.querySelectorAll(".CodeEditorAutocomplete__listItem")].map((n) => n.textContent + (n.classList.contains("CodeEditorAutocomplete__listItem--highlighted") ? "*" : "")),
      cursor: `${cur.style.top}/${cur.style.left}`,
      curDisplay: getComputedStyle(cur).display,
    };
  }, root);

await page.locator(root).scrollIntoViewIfNeeded();
const samples = [];
const t0 = Date.now();
let shots = 0;
while (Date.now() - t0 < 16000) {
  const s = await sample();
  samples.push(s);
  if (shotDir && shots === 0 && s.acVisible && s.acItems.length > 3) {
    await shotEl(page, root, `${shotDir}/autocomplete.png`);
    shots++;
  }
  if (shotDir && shots === 1 && s.code.includes("currency") && !s.acVisible) {
    await shotEl(page, root, `${shotDir}/typing.png`);
    shots++;
  }
  await page.waitForTimeout(40);
}
const last = samples[samples.length - 1];
const firstCode = samples.find((s) => s.code.length > 0);
const insert = samples.find((s) => s.mode === "INSERT");
const done = samples.find((s) => s.code.includes("balance_transactions") && s.mode === "NORMAL");
console.log("first code at +%dms, insert at +%dms, done at +%dms", firstCode && firstCode.t - samples[0].t, insert && insert.t - samples[0].t, done && done.t - samples[0].t);
const expected = "select\n  id,\n  amount,\n  currency,\n  source_id,\nfrom balance_transactions\n"; // the reference script types the trailing comma
if (reduced === "1") {
  check("reduced motion: pasted final query, no insert mode", last.code.startsWith("select\n  id,") && !insert, JSON.stringify(last.code));
} else {
  check("typing enters INSERT mode", !!insert);
  check("autocomplete shown with suggestions", samples.some((s) => s.acVisible && s.acItems.includes("amount*")), "");
  check("autocomplete lists 9 customers.* suggestions", samples.some((s) => s.acItems.length === 9));
  check("final code", last.code === expected, JSON.stringify(last.code));
  check("final state NORMAL + unfocused", last.mode === "NORMAL" && !last.cls.includes("CodeEditor--focused"), last.cls);
  check("status bar line info", last.lineInfo === "7/7" && last.pct === "100%", `${last.lineInfo} ${last.pct} col ${last.col}`);
  check("cursor visible after init", last.curDisplay !== "none", `${last.cursor} ${last.curDisplay}`);
}
if (shotDir) await shotEl(page, root, `${shotDir}/final.png`);
check("no console errors", errors.length === 0, errors.join(" / "));
await browser.close();
