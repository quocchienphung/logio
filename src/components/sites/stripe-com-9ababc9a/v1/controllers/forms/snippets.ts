// SnippetsCodeEditor (v1-SnippetsCodeEditor-FYZGHIMX.js) and DeveloperCentricCodeEditor
// (v1-DeveloperCentricCodeEditor-WUJ6UP7W.js): identical controllers. A SegmentedControl (core group) above the
// editor emits "SegmentedControl:changed" (detail = selected indices) and "SegmentedControl:buttonMouseEnter"
// (detail.index); the selected snippet is shown in the child CodeEditor in that tab's language.
import { targetList } from "../lib";
import type { CodeEditor } from "./codeEditor";
import { childApi } from "./util";
import type { Controller } from "../types";

const LANGUAGES = ["javascript", "ruby", "python", "go", "php", "java", "dotnet"];

function snippetsController(name: string): Controller {
  return (el) => {
    const snippets = targetList(el, name, "snippets");
    const editor = () => childApi<CodeEditor>(el, "CodeEditor");
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<number[]>).detail;
      const i = Array.isArray(detail) ? detail[0] : undefined;
      const snippet = i === undefined ? undefined : snippets[i];
      const text = snippet?.textContent;
      const ed = editor();
      if (ed && text) void ed.setCode(text.trim(), true, LANGUAGES[i as number]);
    };
    const onMouseEnter = () => void editor()?.loadLanguage();
    el.addEventListener("SegmentedControl:changed", onChanged);
    el.addEventListener("SegmentedControl:buttonMouseEnter", onMouseEnter);
    return () => {
      el.removeEventListener("SegmentedControl:changed", onChanged);
      el.removeEventListener("SegmentedControl:buttonMouseEnter", onMouseEnter);
    };
  };
}

export const snippetsControllers = {
  SnippetsCodeEditor: snippetsController("SnippetsCodeEditor"),
  DeveloperCentricCodeEditor: snippetsController("DeveloperCentricCodeEditor"),
};
