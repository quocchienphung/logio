// DetailCodeSnippetCarousel — port of v1-DetailCodeSnippetCarousel-UBRLIT7R.js.
// Click-driven: a SegmentedControl click moves the child Track to that index and loads the matching
// hidden code snippet into the child CodeEditor (snippet 0 at mount). Track and CodeEditor are ported
// by other groups; they are reached through their exposed APIs and skipped when not (yet) available.
import type { Controller } from "../types";
import { childControllers, getApi, listen, targetList } from "../lib";

interface TrackApi {
  index?: number;
  setIndex?(index: number): void;
}
interface CodeEditorApi {
  setCode(html: string): void;
}

export const DetailCodeSnippetCarousel: Controller = (el) => {
  const snippets = targetList(el, "DetailCodeSnippetCarousel", "codeSnippets");
  const child = <T>(name: string): T | undefined => {
    const node = childControllers(el, name)[0];
    return node ? getApi<T>(node, name) : undefined;
  };
  const updateCodeEditor = (i: number) => {
    const editor = child<CodeEditorApi>("CodeEditor");
    if (editor && snippets[i]) editor.setCode(snippets[i].innerHTML);
  };
  const onSegment = (e: Event) => {
    const { index } = (e as CustomEvent<{ index: number }>).detail;
    const track = child<TrackApi>("Track");
    if (!track) return;
    if (typeof track.setIndex === "function") track.setIndex(index);
    else track.index = index;
    updateCodeEditor(index);
  };
  const off = listen(el, "SegmentedControl:buttonClicked", onSegment);
  updateCodeEditor(0);
  return off;
};
