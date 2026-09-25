// AnimatedCodeEditor (v1-chunk-SKTU2ZC5.js): a vim-like editor state machine driven by commands, rendering
// through its child CodeEditor. DevelopersCodeEditor (v1-DevelopersCodeEditor-MTQ4JEO4.js): feeds it the
// Sigma "select … from balance_transactions" script once the editor is ready and in view.
import { onIntersect } from "../lib";
import { humanizeDuration, sleep } from "./anim";
import type { CodeEditor, EditingMode } from "./codeEditor";
import { childApi, classController, disableAmbientAnimations } from "./util";

const INDENT_WIDTH = 2;

interface EditorState {
  code: string[];
  isFocused: boolean;
  editingMode: EditingMode;
  line: number;
  column: number;
  indentationLevel: number;
  timeToSleep: number;
  autocompleteVisible: boolean;
  autocompleteSuggestions: string[];
  autocompleteSuggestionsNeedUpdate: boolean;
  autocompleteHighlightedIndex: number;
}

export type EditorCommand =
  | ["SET_EDIT_MODE", { string: EditingMode }]
  | ["SET_FOCUSED", { boolean: boolean }]
  | ["SET_SLEEP", { number: number }]
  | ["INSERT_MULTIPLE_CHARS", { string: string }]
  | ["INSERT_SINGLE_CHAR", { string: string }]
  | ["INSERT_COMBO", { string: string }]
  | ["PASTE", { string: string }]
  | ["INSERT_NEW_LINE", Record<string, never>]
  | ["INCREASE_INDENT", Record<string, never>]
  | ["DECREASE_INDENT", Record<string, never>]
  | ["SET_AUTO_COMPLETE_VISIBLE", { boolean: boolean }]
  | ["SET_AUTO_COMPLETE_SUGGESTIONS", { strings: string[] }]
  | ["SET_AUTO_COMPLETE_HIGHLIGHTED_INDEX", { number: number }]
  | ["SET_CURSOR_POSITION", { line?: number; column?: number }]
  | ["REMOVE_CHARS", { numberOfChars: number }];

const spaces = (n: number) => " ".repeat(Math.max(0, n));
const insertAt = (s: EditorState, text: string, advance: number): EditorState => ({
  ...s,
  column: s.column + advance,
  code: s.code.map((l, i) => (i === s.line ? l.slice(0, s.column) + text + l.slice(s.column) : l)),
});

/** Pure reducer: returns the next state and the sub-commands to run (reference function I). */
function reduce(s: EditorState, cmd: EditorCommand): [EditorState, EditorCommand[]] {
  switch (cmd[0]) {
    case "SET_EDIT_MODE":
      return [{ ...s, editingMode: cmd[1].string }, []];
    case "SET_FOCUSED":
      return [{ ...s, isFocused: cmd[1].boolean }, []];
    case "SET_SLEEP":
      return [{ ...s, timeToSleep: cmd[1].number }, []];
    case "INSERT_MULTIPLE_CHARS":
      // one character per step, then a humanised pause: 25ms (+0..50%) after a space, 5ms otherwise
      return [
        s,
        cmd[1].string.split("").flatMap((ch): EditorCommand[] => [
          ["INSERT_SINGLE_CHAR", { string: ch }],
          ["SET_SLEEP", { number: humanizeDuration(ch === " " ? 25 : 5) }],
        ]),
      ];
    case "INSERT_SINGLE_CHAR":
      return [insertAt(s, cmd[1].string, cmd[1].string.length), []];
    case "INSERT_COMBO":
      return [insertAt(s, cmd[1].string, 1), []];
    case "PASTE":
      return [s, [["INSERT_SINGLE_CHAR", { string: cmd[1].string }]]];
    case "INSERT_NEW_LINE": {
      const indent = INDENT_WIDTH * s.indentationLevel;
      const closing = INDENT_WIDTH * Math.max(s.indentationLevel - 1, 0);
      const code = s.code.flatMap((l, i) => {
        if (i !== s.line) return [l];
        const rest = l.slice(s.column);
        return rest === "" ? [l.slice(0, s.column), spaces(indent)] : [l.slice(0, s.column), spaces(indent), spaces(closing) + rest];
      });
      return [{ ...s, line: s.line + 1, column: indent, code }, []];
    }
    case "INCREASE_INDENT":
      return [{ ...s, indentationLevel: s.indentationLevel + 1 }, []];
    case "DECREASE_INDENT":
      return [{ ...s, indentationLevel: s.indentationLevel - 1 }, []];
    case "SET_AUTO_COMPLETE_VISIBLE":
      return [
        {
          ...s,
          autocompleteVisible: cmd[1].boolean,
          autocompleteSuggestions: cmd[1].boolean ? s.autocompleteSuggestions : [],
          autocompleteHighlightedIndex: -1,
        },
        [],
      ];
    case "SET_AUTO_COMPLETE_SUGGESTIONS":
      return [{ ...s, autocompleteSuggestionsNeedUpdate: true, autocompleteSuggestions: cmd[1].strings }, []];
    case "SET_AUTO_COMPLETE_HIGHLIGHTED_INDEX": {
      const n = cmd[1].number;
      const distance = Math.abs(n - s.autocompleteHighlightedIndex);
      const up = n < s.autocompleteHighlightedIndex;
      if (distance >= 2) {
        // walk through every intermediate row, 50ms apart
        return [
          s,
          Array.from({ length: distance }, (_, d): EditorCommand[] => [
            ["SET_AUTO_COMPLETE_HIGHLIGHTED_INDEX", { number: s.autocompleteHighlightedIndex + (up ? -1 : 1) * (d + 1) }],
            ["SET_SLEEP", { number: 50 }],
          ]).flat(),
        ];
      }
      return [{ ...s, autocompleteHighlightedIndex: n }, []];
    }
    case "SET_CURSOR_POSITION":
      // the reference ignores 0 (falsy) for both fields
      return [{ ...s, line: cmd[1].line || s.line, column: cmd[1].column || s.column }, []];
    case "REMOVE_CHARS": {
      const n = cmd[1].numberOfChars;
      return [{ ...s, code: s.code.map((l, i) => (i === s.line ? l.slice(0, s.column) + l.slice(s.column + n) : l)) }, []];
    }
  }
}

export class AnimatedCodeEditor {
  private state: EditorState = {
    code: [""],
    isFocused: true,
    editingMode: "normal",
    line: 0,
    column: 0,
    indentationLevel: 0,
    timeToSleep: 0,
    autocompleteVisible: false,
    autocompleteSuggestions: [],
    autocompleteSuggestionsNeedUpdate: false,
    autocompleteHighlightedIndex: -1,
  };
  private alive = true;
  constructor(readonly el: HTMLElement) {}
  connect(): void {}
  disconnect(): void {
    this.alive = false;
  }

  /** Apply one command; sub-commands run one per animation frame (plus their sleeps), updating the UI each time. */
  async runCommand(cmd: EditorCommand): Promise<void> {
    const [next, queue] = reduce(this.state, cmd);
    this.state = next;
    while (queue.length && this.alive) {
      this.state = reduce(this.state, queue.shift() as EditorCommand)[0];
      await sleep(this.state.timeToSleep);
      this.state.timeToSleep = 0;
      this.updateUI();
    }
    if (!this.alive) return;
    await sleep(this.state.timeToSleep);
    this.state.timeToSleep = 0;
    this.updateUI();
  }

  private updateUI(): void {
    const ed = this.codeEditor;
    if (!ed || !this.alive) return;
    ed.cursorState = { lineNumber: this.state.line, columnNumber: this.state.column, totalLines: this.state.code.length };
    ed.editingMode = this.state.editingMode;
    void ed.setCode(this.state.code.join("\n"), false);
    ed.focused = this.state.isFocused;
    const ac = ed.autocompleteComponent;
    if (!ac) return;
    ac.visible = this.state.autocompleteVisible;
    ac.highlightedIndex = this.state.autocompleteHighlightedIndex;
    if (this.state.autocompleteSuggestionsNeedUpdate) {
      ac.options = this.state.autocompleteSuggestions;
      this.state.autocompleteSuggestionsNeedUpdate = false;
    }
  }

  get codeEditor(): CodeEditor | undefined {
    return childApi<CodeEditor>(this.el, "CodeEditor");
  }
}

// DevelopersCodeEditor script (reference constants a / m).
const suggest = (strings: string[]): EditorCommand[] => [
  ["SET_AUTO_COMPLETE_SUGGESTIONS", { strings }],
  ["SET_AUTO_COMPLETE_VISIBLE", { boolean: true }],
  ["SET_SLEEP", { number: 50 }],
  ["SET_AUTO_COMPLETE_HIGHLIGHTED_INDEX", { number: 0 }],
];
const STATIC_SCRIPT: EditorCommand[] = [
  ["PASTE", { string: "select\n  id,\n  amount,\n  currency,\n  source_id\nfrom balance_transactions" }],
  ["SET_FOCUSED", { boolean: false }],
];
const TYPING_SCRIPT: EditorCommand[] = [
  ["SET_SLEEP", { number: 200 }],
  ["SET_EDIT_MODE", { string: "insert" }],
  ["SET_SLEEP", { number: 150 }],
  ["INSERT_MULTIPLE_CHARS", { string: "select" }],
  ["SET_SLEEP", { number: 250 }],
  ["INCREASE_INDENT", {}],
  ["INSERT_NEW_LINE", {}],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "id" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest(["id"]),
  ["SET_SLEEP", { number: 250 }],
  ["SET_AUTO_COMPLETE_VISIBLE", { boolean: false }],
  ["INSERT_SINGLE_CHAR", { string: "," }],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_NEW_LINE", {}],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "amount" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest(["amount", "amount_due", "amount_off", "amount_refunded", "amount_reversed"]),
  ["SET_SLEEP", { number: 250 }],
  ["SET_AUTO_COMPLETE_VISIBLE", { boolean: false }],
  ["INSERT_SINGLE_CHAR", { string: "," }],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_NEW_LINE", {}],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "cu" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest([
    "customers",
    "customers.account_balance",
    "customers.business_vat_id",
    "customers.created",
    "customers.currency",
    "customers.default_source_id",
    "customers.delinquent",
    "customers.description",
    "customers.discount_coupon_id",
  ]),
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "rr" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest(["currency", "current_period_end", "current_period_start"]),
  ["SET_SLEEP", { number: 250 }],
  ["INSERT_MULTIPLE_CHARS", { string: "ency" }],
  ["SET_SLEEP", { number: 50 }],
  ["SET_AUTO_COMPLETE_VISIBLE", { boolean: false }],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_SINGLE_CHAR", { string: "," }],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_NEW_LINE", {}],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "sourc" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest(["source_id", "source_transaction_id", "source_transfer_id", "source_type", "sources", "sources_metadata", "sources_metadata.key"]),
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "e_" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest(["source_id", "source_transaction_id", "source_transfer_id", "source_type"]),
  ["SET_SLEEP", { number: 250 }],
  ["SET_AUTO_COMPLETE_VISIBLE", { boolean: false }],
  ["PASTE", { string: "id" }],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_SINGLE_CHAR", { string: "," }],
  ["SET_SLEEP", { number: 50 }],
  ["DECREASE_INDENT", {}],
  ["INSERT_NEW_LINE", {}],
  ["SET_SLEEP", { number: 50 }],
  ["INSERT_MULTIPLE_CHARS", { string: "from balance_tr" }],
  ["SET_SLEEP", { number: 50 }],
  ...suggest([
    "balance_transactions",
    "balance_transactions.amount",
    "balance_transactions.automatic_transfer_id",
    "balance_transactions.available_on",
    "balance_transactions.created",
    "balance_transactions.currency",
  ]),
  ["SET_SLEEP", { number: 250 }],
  ["SET_AUTO_COMPLETE_VISIBLE", { boolean: false }],
  ["PASTE", { string: "ansactions" }],
  ["SET_SLEEP", { number: 200 }],
  ["INSERT_NEW_LINE", {}],
  ["SET_SLEEP", { number: 50 }],
  ["SET_EDIT_MODE", { string: "normal" }],
  ["SET_SLEEP", { number: 400 }],
  ["SET_FOCUSED", { boolean: false }],
];

export class DevelopersCodeEditor {
  private readonly queue: EditorCommand[];
  private isExecuting = false;
  private isPaused = false;
  private inView = false;
  private alive = true;
  private offIo: (() => void) | null = null;
  private offVis: (() => void) | null = null;
  constructor(readonly el: HTMLElement) {
    this.queue = [...(disableAmbientAnimations() ? STATIC_SCRIPT : TYPING_SCRIPT)];
  }
  private readonly onReady = () => {
    const anim = this.animated;
    if (anim && !this.isPaused) void this.next(anim);
  };
  connect(): void {
    this.el.addEventListener("CodeEditor:ready", this.onReady);
    // reference: IntersectionObserver threshold .1 (requireThreshold), not once
    this.offIo = onIntersect(
      this.el,
      (_v, e) => {
        this.inView = e.intersectionRatio >= 0.1;
        if (this.inView) this.enter();
        else this.isPaused = true;
      },
      { threshold: 0.1 },
    );
    // rAF-driven sleeps already stop in a hidden tab; also stop queueing commands and resume on return.
    const onVis = () => {
      if (document.hidden) this.isPaused = true;
      else if (this.inView && this.offIo) this.enter();
    };
    document.addEventListener("visibilitychange", onVis);
    this.offVis = () => document.removeEventListener("visibilitychange", onVis);
  }
  disconnect(): void {
    this.alive = false;
    this.el.removeEventListener("CodeEditor:ready", this.onReady);
    this.offIo?.();
    this.offVis?.();
  }
  private enter(): void {
    this.isPaused = false;
    const ed = childApi<CodeEditor>(this.el, "CodeEditor");
    const anim = this.animated;
    if (ed && anim && ed.initialized && !this.isExecuting) void this.next(anim);
  }
  private async next(anim: AnimatedCodeEditor): Promise<void> {
    if (!this.alive) return;
    const cmd = this.queue.shift();
    this.isExecuting = true;
    if (cmd) await anim.runCommand(cmd);
    this.isExecuting = false;
    if (!this.alive) return;
    if (this.queue.length) {
      if (!this.isPaused) void this.next(anim);
    } else {
      this.offIo?.();
      this.offIo = null;
    }
  }
  private get animated(): AnimatedCodeEditor | undefined {
    return childApi<AnimatedCodeEditor>(this.el, "AnimatedCodeEditor");
  }
}

export const animatedCodeEditorControllers = {
  AnimatedCodeEditor: classController("AnimatedCodeEditor", (el) => new AnimatedCodeEditor(el)),
  DevelopersCodeEditor: classController("DevelopersCodeEditor", (el) => new DevelopersCodeEditor(el)),
};
