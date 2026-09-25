// QA: CodeEditor (+LineNumbers) and DeveloperCentricCodeEditor / SnippetsCodeEditor tab switching.
// node scripts/forensics/products/qa/forms-code-editor.mjs [path=/payments] [width] [shotDir]
// SegmentedControl belongs to the core group; its "SegmentedControl:changed" contract is simulated here.
import { check, open, shotEl } from "./forms-lib.mjs";

const [path = "/payments", width = "1440", shotDir = ""] = process.argv.slice(2);
const { browser, page, errors } = await open(path, { width: +width });
const sel = "[data-js-controller=DeveloperCentricCodeEditor], [data-js-controller=SnippetsCodeEditor]";
const hasSwitcher = (await page.locator(sel).count()) > 0;
const editorSel = hasSwitcher ? `${sel.split(",")[0]} .CodeEditor, ${sel.split(",")[1].trim()} .CodeEditor` : ".CodeEditor";

const state = () =>
  page.evaluate((s) => {
    const ed = document.querySelector(s);
    const code = ed.querySelector("[data-js-target='CodeEditor.editor']");
    const nums = [...ed.querySelectorAll(".CodeEditorLineNumbers__number")].map((n) => n.textContent);
    return {
      cls: ed.className,
      text: code.textContent,
      lines: code.textContent.split("\n").length,
      tokens: [...new Set([...code.querySelectorAll(".token")].map((t) => t.className))].slice(0, 12),
      nums: nums.length,
      firstNums: nums.slice(0, 3).join(","),
      width: getComputedStyle(ed).getPropertyValue("--codeEditorLineNumbersWidth"),
    };
  }, editorSel.split(",")[0]);

const before = await state();
check("editor empty before entering viewport", before.text === "" && !before.cls.includes("CodeEditor--initialized"), before.cls);
await page.locator(editorSel.split(",")[0]).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const loading = await state();
check("loading class during the 1000ms loader window", loading.cls.includes("CodeEditor--loading"), loading.cls);
if (shotDir) await shotEl(page, hasSwitcher ? sel.split(",")[0] : ".CodeEditor", `${shotDir}/loading.png`);
await page.waitForTimeout(1100);
const ready = await state();
check("initialized after >=1000ms", ready.cls.includes("CodeEditor--initialized") && !ready.cls.includes("CodeEditor--loading"), ready.cls);
check("multi-line highlighted code", ready.lines > 3 && ready.tokens.length > 2, `${ready.lines} lines, tokens ${ready.tokens.join(" | ")}`);
check("line numbers match code lines", ready.nums >= ready.lines && ready.firstNums.startsWith("1,2"), `${ready.nums} numbers (${ready.firstNums}), width ${ready.width}`);
if (shotDir) await shotEl(page, hasSwitcher ? sel.split(",")[0] : ".CodeEditor", `${shotDir}/ready.png`);

if (hasSwitcher) {
  const langs = ["Ruby", "Python", "Go", "PHP", "Java", ".NET", "Node.js"];
  for (const [i, name] of [1, 2, 3, 4, 5, 6, 0].map((i, k) => [i, langs[k]])) {
    await page.evaluate(
      ([s, idx]) => document.querySelector(s).querySelector(".SegmentedControl").dispatchEvent(new CustomEvent("SegmentedControl:changed", { bubbles: true, detail: [idx] })),
      [sel.split(",")[0].trim(), i],
    );
    await page.waitForTimeout(150);
    const st = await state();
    check(`tab ${name}: code switched`, st.lines > 3 && st.text !== ready.text || i === 0, `${st.lines} lines: ${st.text.split("\n")[0].slice(0, 60)}`);
    if (shotDir && name === "Ruby") await shotEl(page, sel.split(",")[0], `${shotDir}/ruby.png`);
  }
  const back = await state();
  check("back to first tab restores original code", back.text === ready.text);
}
check("no console errors", errors.length === 0, errors.join(" / "));
await browser.close();
