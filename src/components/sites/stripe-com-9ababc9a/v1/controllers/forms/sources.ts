// The generated page markup collapses whitespace inside the hidden elements that hold the code editors'
// source (CodeEditor.finalCode, *.snippets, *.codeSnippets), so their line breaks are lost. The original
// texts are extracted from the captured HTML (scripts/forensics/products/qa/forms-extract-data.py) and
// loaded on demand, in the same window where the reference loads Prism. A collapsed text is restored by a
// whitespace-normalised lookup; text that still has its line breaks is returned unchanged.

let table: Map<string, string> | null = null;
let pending: Promise<void> | null = null;

const key = (s: string) => s.split(/\s+/).filter(Boolean).join(" ");

export function loadSources(): Promise<void> {
  if (!pending) {
    pending = import("./data/codeSources").then((m) => {
      table = new Map(m.CODE_SOURCES.map((s) => [key(s), s]));
    });
  }
  return pending;
}

export function sourcesLoaded(): boolean {
  return table !== null;
}

export function restoreSource(text: string): string {
  if (!table || text.includes("\n")) return text;
  const orig = table.get(key(text));
  if (orig === undefined) return text;
  return text === text.trim() ? orig.trim() : orig;
}
