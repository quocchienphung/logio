// CodeEditor and its child controllers. Reference modules (read-only):
//   CodeEditor ............ v1-chunk-IUMYW46Q.js   CodeEditorLineNumbers .. v1-chunk-GLXFB3WF.js
//   CodeEditorCursor ...... v1-chunk-OM5R4HSS.js   CodeEditorAutocomplete . v1-chunk-O7IJKZBV.js
//   CodeEditorStatusBar ... v1-chunk-BK2LZS3H.js
import { target } from "../lib";
import { Delay, Sequence, Type } from "./anim";
import { highlight, SUPPORTED_LANGUAGES } from "./highlight";
import { loadSources, restoreSource, sourcesLoaded } from "./sources";
import { childApi, classController, cssNumber, lastTarget } from "./util";

export interface CursorState {
  lineNumber: number;
  columnNumber: number;
  totalLines: number;
}
export interface Position {
  line: number;
  column: number;
}

const INITIALIZED = "CodeEditor--initialized";
const LOADING = "CodeEditor--loading";
const INSERT_MODE = "CodeEditor--insertMode";
const FOCUSED = "CodeEditor--focused";
/** Minimum time the ASCII loader shows after the editor scrolls into view (reference: Math.max(1e3 - loadTime, 0)). */
const MIN_LOADING_MS = 1000;
const LINE_HEIGHT = 24;

const lineCount = (s: string) => s.split(/\r\n|\r|\n/).length;
/** Reference replaceHiddenLines(): a "// 3 hidden lines" comment token becomes a pill. */
const replaceHiddenLines = (html: string) =>
  html.replace(/<span class="[\w ]+">(#|\/\/) (\d hidden lines?)<\/span>/, '<span class="CodeEditor__hiddenLines">$2</span>');

/** Lazily cached CSS custom property (the reference caches the first truthy read). */
class CssVar {
  private v = 0;
  constructor(
    private readonly el: Element,
    private readonly prop: string,
  ) {}
  get value(): number {
    return this.v || (this.v = cssNumber(this.el, this.prop));
  }
}

export class CodeEditorLineNumbers {
  private numbered = 0;
  private alive = true;
  private readonly container: HTMLElement | null;
  private readonly first: HTMLElement | null;
  private readonly original: Node[];
  private readonly vPad: CssVar;
  constructor(readonly el: HTMLElement) {
    this.container = target(el, "CodeEditorLineNumbers", "lineNumbersContainer");
    this.first = target(el, "CodeEditorLineNumbers", "firstLineNumber");
    this.original = this.container ? Array.from(this.container.childNodes) : [];
    this.vPad = new CssVar(el, "--codeEditorVerticalPadding");
  }
  connect(): void {
    this.createLines(this.numberOfLinesForHeight);
  }
  disconnect(): void {
    this.alive = false;
    this.container?.replaceChildren(...this.original);
  }
  private createLines(count: number, numbered = 0): void {
    if (!this.container || !this.first) return;
    const spans: HTMLElement[] = [];
    for (let i = 0; i < count; i += 1) {
      const s = document.createElement("span");
      s.className = this.first.className;
      s.textContent = i < numbered ? `${i + 1}` : "~";
      spans.push(s);
    }
    this.container.replaceChildren(...spans);
  }
  updateNumberOfLines(n: number): void {
    if (!this.alive || n === this.numbered) return;
    this.createLines(Math.max(n, this.numberOfLinesForHeight), n);
    this.numbered = n;
  }
  get numberOfLinesForHeight(): number {
    return Math.floor((this.el.offsetHeight - this.vPad.value * 2) / LINE_HEIGHT);
  }
}

export class CodeEditorCursor {
  private readonly lineSpacing: CssVar;
  private readonly charWidth: CssVar;
  private readonly vPad: CssVar;
  private readonly hPad: CssVar;
  constructor(readonly el: HTMLElement) {
    this.lineSpacing = new CssVar(el, "--codeEditorLineSpacing");
    this.charWidth = new CssVar(el, "--codeEditorSingleCharWidth");
    this.vPad = new CssVar(el, "--codeEditorVerticalPadding");
    this.hPad = new CssVar(el, "--codeEditorHorizontalPadding");
  }
  connect(): void {}
  disconnect(): void {
    this.el.style.removeProperty("top");
    this.el.style.removeProperty("left");
  }
  set position(p: Position) {
    this.el.style.top = `${5 + this.vPad.value + p.line * this.lineSpacing.value}px`;
    this.el.style.left = `${this.hPad.value + p.column * this.charWidth.value}px`;
  }
}

const AC_VISIBLE = "CodeEditorAutocomplete--visible";
const AC_ITEM = "CodeEditorAutocomplete__listItem";
const AC_HIGHLIGHTED = "CodeEditorAutocomplete__listItem--highlighted";
const AC_VISIBLE_ROWS = 5;
const AC_ROW_HEIGHT = 22;

export class CodeEditorAutocomplete {
  private firstVisibleIndex = 0;
  private previouslyHighlighted: number | undefined;
  private readonly list: HTMLElement | null;
  private readonly lineSpacing: CssVar;
  private readonly charWidth: CssVar;
  private readonly vPad: CssVar;
  private readonly hPad: CssVar;
  constructor(readonly el: HTMLElement) {
    this.list = target(el, "CodeEditorAutocomplete", "list");
    this.lineSpacing = new CssVar(el, "--codeEditorLineSpacing");
    this.charWidth = new CssVar(el, "--codeEditorSingleCharWidth");
    this.vPad = new CssVar(el, "--codeEditorVerticalPadding");
    this.hPad = new CssVar(el, "--codeEditorHorizontalPadding");
  }
  connect(): void {}
  disconnect(): void {
    this.el.classList.remove(AC_VISIBLE);
    this.list?.replaceChildren();
    this.list?.style.removeProperty("transform");
    this.el.style.removeProperty("top");
    this.el.style.removeProperty("left");
  }
  set visible(v: boolean) {
    this.el.classList.toggle(AC_VISIBLE, v);
  }
  set options(items: string[]) {
    this.setFirstVisibleIndex(0);
    this.list?.replaceChildren(
      ...items.map((text) => {
        const s = document.createElement("span");
        s.textContent = text;
        s.className = AC_ITEM;
        return s;
      }),
    );
  }
  // The reference swaps the paddings here (top uses the horizontal one); kept as is.
  set position(p: Position) {
    this.el.style.top = `${(p.line + 1) * this.lineSpacing.value + this.hPad.value}px`;
    this.el.style.left = `${p.column * this.charWidth.value + this.vPad.value}px`;
  }
  set highlightedIndex(i: number) {
    if (i === this.previouslyHighlighted || !this.list) return;
    Array.from(this.list.children).forEach((c, idx) => c.classList.toggle(AC_HIGHLIGHTED, idx === i));
    const prev = this.previouslyHighlighted;
    if (prev !== undefined && i > prev) {
      if (i - this.firstVisibleIndex > AC_VISIBLE_ROWS - 2)
        this.setFirstVisibleIndex(Math.min(this.firstVisibleIndex + 1, this.list.childElementCount - AC_VISIBLE_ROWS));
    } else if (i <= this.firstVisibleIndex) {
      this.setFirstVisibleIndex(this.firstVisibleIndex - 1);
    }
    this.previouslyHighlighted = i;
  }
  private setFirstVisibleIndex(i: number): void {
    // A negative index produces an invalid transform in the reference, which the browser ignores.
    if (i >= 0 && this.list) this.list.style.transform = `translateY(-${i * AC_ROW_HEIGHT}px)`;
    this.firstVisibleIndex = i;
  }
}

export type EditingMode = "normal" | "insert";

export class CodeEditorStatusBar {
  private readonly prompt: HTMLElement | null;
  private readonly modeLabel: HTMLElement | null;
  private readonly downProgress: HTMLElement | null;
  private readonly lineInfo: HTMLElement | null;
  private readonly currentColumn: HTMLElement | null;
  private readonly initialText: [HTMLElement, string][];
  private current: Sequence | null = null;
  executingCommand: string | undefined;
  constructor(readonly el: HTMLElement) {
    this.prompt = lastTarget(el, "CodeEditorStatusBar", "prompt");
    this.modeLabel = target(el, "CodeEditorStatusBar", "modeLabel");
    this.downProgress = target(el, "CodeEditorStatusBar", "downProgress");
    this.lineInfo = target(el, "CodeEditorStatusBar", "lineInfo");
    this.currentColumn = target(el, "CodeEditorStatusBar", "currentColumn");
    this.initialText = [this.prompt, this.modeLabel, this.downProgress, this.lineInfo, this.currentColumn]
      .filter((n): n is HTMLElement => n !== null)
      .map((n) => [n, n.textContent ?? ""]);
  }
  connect(): void {
    this.mode = "normal";
  }
  disconnect(): void {
    this.current?.cancel();
    this.initialText.forEach(([n, t]) => (n.textContent = t));
  }
  set cursorState(s: CursorState) {
    if (this.currentColumn) this.currentColumn.textContent = `${s.columnNumber + 1}`;
    if (this.downProgress) this.downProgress.textContent = `${Math.ceil(((s.lineNumber + 1) / s.totalLines) * 100)}%`;
    if (this.lineInfo) this.lineInfo.textContent = `${s.lineNumber + 1}/${s.totalLines}`;
  }
  set fileName(name: string) {
    if (this.prompt) this.prompt.textContent = name;
  }
  set mode(m: EditingMode) {
    if (this.modeLabel) this.modeLabel.textContent = m === "insert" ? "INSERT" : "NORMAL";
  }
  /** Types `command` into the prompt (60ms/char, or instantly), holds 400ms, then reports it and restores the file name. */
  executeCommand(command: string, animate = true): Promise<void> {
    const fileName = this.prompt?.textContent ?? "";
    this.executingCommand = command;
    this.current?.cancel();
    const seq = new Sequence([
      new Type({ endString: command || "", speed: animate ? 60 : 0, onUpdate: (v) => this.prompt && (this.prompt.textContent = v) }),
      new Delay(400),
    ]);
    this.current = seq;
    return seq.play().then(() => {
      if (this.current !== seq || !seq.isFinished) return;
      this.el.dispatchEvent(new CustomEvent("CodeEditorStatusBar:commandExecuted", { bubbles: true, detail: { command: this.executingCommand } }));
      this.executingCommand = undefined;
      if (this.prompt) this.prompt.textContent = fileName;
    });
  }
}

export class CodeEditor {
  readonly initialLanguage: string;
  private readonly editor: HTMLElement | null;
  private readonly scrollContainer: HTMLElement | null;
  private readonly finalCode: HTMLElement | null;
  private readonly initialClassName: string;
  private io: IntersectionObserver | null = null;
  private timer = 0;
  private alive = true;

  constructor(readonly el: HTMLElement) {
    const lang = el.dataset.jsLanguageMode;
    if (!lang) throw new Error("No data-code-language found on component");
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) throw new Error(`Unsupported language: ${lang}`);
    this.initialLanguage = lang;
    this.editor = target(el, "CodeEditor", "editor");
    this.scrollContainer = target(el, "CodeEditor", "scrollContainer");
    this.finalCode = target(el, "CodeEditor", "finalCode");
    this.initialClassName = el.className;
  }

  connect(): void {
    this.io = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].intersectionRatio >= 0.1) {
          this.io?.disconnect();
          this.onEnterViewport();
        }
      },
      { threshold: 0.1 },
    );
    this.io.observe(this.el);
  }

  disconnect(): void {
    this.alive = false;
    this.io?.disconnect();
    window.clearTimeout(this.timer);
    if (this.editor) this.editor.innerHTML = "";
    this.el.className = this.initialClassName;
    this.el.style.removeProperty("--codeEditorLineNumbersWidth");
    this.el.dispatchEvent(new CustomEvent("CodeEditor:removed", { bubbles: true }));
  }

  private async onEnterViewport(): Promise<void> {
    const t0 = performance.now();
    this.loading = true;
    await loadSources();
    if (!this.alive) return;
    const wait = Math.max(MIN_LOADING_MS - (performance.now() - t0), 0);
    this.timer = window.setTimeout(() => {
      if (!this.alive) return;
      this.loading = false;
      this.initialized = true;
      const code = this.finalCode ? restoreSource(this.finalCode.textContent ?? "") : "";
      if (code) {
        void this.setCode(code);
        const n = lineCount(code);
        this.cursorState = { lineNumber: n - 1, columnNumber: 0, totalLines: n };
      }
    }, wait);
  }

  /** Warm the source table (the reference preloads the Prism grammar on tab hover). */
  loadLanguage(): Promise<void> {
    return loadSources();
  }

  async setCode(code: string, resetScroll = true, language: string = this.initialLanguage): Promise<void> {
    if (!sourcesLoaded()) {
      this.initialized = false;
      this.loading = true;
      await loadSources();
      if (!this.alive) return;
      this.initialized = true;
      this.loading = false;
    }
    if (!this.alive || !this.editor) return;
    const src = restoreSource(code);
    this.editor.innerHTML = replaceHiddenLines(highlight(src, language));
    if (resetScroll && this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
      this.scrollContainer.scrollLeft = 0;
    }
    const ln = this.lineNumbersComponent;
    if (ln) {
      ln.updateNumberOfLines(lineCount(src));
      this.el.style.setProperty("--codeEditorLineNumbersWidth", `${ln.el.offsetWidth}px`);
    }
  }

  set initialized(v: boolean) {
    if (v) {
      this.el.classList.add(INITIALIZED);
      this.el.dispatchEvent(new CustomEvent("CodeEditor:ready", { bubbles: true }));
    } else {
      if (this.editor) this.editor.innerHTML = "";
      this.lineNumbersComponent?.updateNumberOfLines(0);
      this.cursorState = { lineNumber: 0, totalLines: 1, columnNumber: 0 };
      this.el.classList.remove(INITIALIZED);
      this.el.dispatchEvent(new CustomEvent("CodeEditor:removed", { bubbles: true }));
    }
  }
  get initialized(): boolean {
    return this.el.classList.contains(INITIALIZED);
  }
  set loading(v: boolean) {
    this.el.classList.toggle(LOADING, v);
  }
  set cursorState(s: CursorState) {
    const bar = this.statusBarComponent;
    if (!bar) return;
    bar.cursorState = s;
    const cursor = this.cursorComponent;
    if (!cursor) return;
    cursor.position = { line: s.lineNumber, column: s.columnNumber };
    const ac = this.autocompleteComponent;
    if (ac) ac.position = { line: s.lineNumber, column: s.columnNumber };
  }
  set editingMode(m: EditingMode) {
    this.el.classList.toggle(INSERT_MODE, m === "insert");
    const bar = this.statusBarComponent;
    if (bar) bar.mode = m;
  }
  set focused(v: boolean) {
    this.el.classList.toggle(FOCUSED, v);
  }
  get lineNumbersComponent(): CodeEditorLineNumbers | undefined {
    return childApi<CodeEditorLineNumbers>(this.el, "CodeEditorLineNumbers");
  }
  get statusBarComponent(): CodeEditorStatusBar | undefined {
    return childApi<CodeEditorStatusBar>(this.el, "CodeEditorStatusBar");
  }
  get cursorComponent(): CodeEditorCursor | undefined {
    return childApi<CodeEditorCursor>(this.el, "CodeEditorCursor");
  }
  get autocompleteComponent(): CodeEditorAutocomplete | undefined {
    return childApi<CodeEditorAutocomplete>(this.el, "CodeEditorAutocomplete");
  }
}

export const codeEditorControllers = {
  CodeEditor: classController("CodeEditor", (el) => new CodeEditor(el)),
  CodeEditorLineNumbers: classController("CodeEditorLineNumbers", (el) => new CodeEditorLineNumbers(el)),
  CodeEditorCursor: classController("CodeEditorCursor", (el) => new CodeEditorCursor(el)),
  CodeEditorAutocomplete: classController("CodeEditorAutocomplete", (el) => new CodeEditorAutocomplete(el)),
  CodeEditorStatusBar: classController("CodeEditorStatusBar", (el) => new CodeEditorStatusBar(el)),
};
