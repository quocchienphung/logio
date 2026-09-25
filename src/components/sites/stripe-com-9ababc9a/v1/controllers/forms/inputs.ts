// Plain inputs. Reference modules:
//   TextInput .......... v1-chunk-RAMTD5VS.js   SelectInput ......... v1-chunk-KLNLGD7H.js
//   SearchInput ........ v1-chunk-S7CJVUIA.js   CountrySelectInput .. v1-chunk-QACUWFLV.js
//   Email .............. v1-chunk-FZRWTWAU.js
import { target } from "../lib";
import { Waapi, type Step } from "./anim";
import { classController, debounce, disableAmbientAnimations, Emitter } from "./util";

const TEXT_TOUCHED = "TextInput__input--touched";
const stripTrailing = (s: string) => s.trim().replace(/\/+$/, "");

/** Marks the field "touched" on blur (shows :invalid styling); optional trailing-slash stripping on paste/blur. */
export class TextInput {
  constructor(readonly el: HTMLInputElement | HTMLTextAreaElement) {}
  private readonly onPaste = (e: Event) => {
    const raw = (e as ClipboardEvent).clipboardData?.getData("text") || "";
    const clean = stripTrailing(raw);
    if (clean === raw) return;
    e.preventDefault();
    const start = this.el.selectionStart ?? this.el.value.length;
    const end = this.el.selectionEnd ?? start;
    const v = this.el.value;
    this.el.value = v.slice(0, start) + clean + v.slice(end);
    const caret = start + clean.length;
    this.el.setSelectionRange(caret, caret);
    this.el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  private readonly onBlur = () => {
    if (this.el.dataset.stripTrailing === "true") this.el.value = stripTrailing(this.el.value || "");
    this.el.classList.add(TEXT_TOUCHED);
  };
  connect(): void {
    this.el.addEventListener("blur", this.onBlur);
    if (this.el.dataset.stripTrailing === "true") this.el.addEventListener("paste", this.onPaste);
  }
  disconnect(): void {
    this.el.removeEventListener("blur", this.onBlur);
    this.el.removeEventListener("paste", this.onPaste);
  }
  isValid(): boolean {
    return this.el.validity.valid;
  }
  forceErrors(on: boolean): void {
    this.el.classList.toggle(TEXT_TOUCHED, on);
  }
  setDisabled(on: boolean): void {
    this.el.disabled = on;
  }
}

const SELECT_TOUCHED = "SelectInput__input--touched";

/** Marks the select "touched" on input and re-broadcasts the event on document as "SelectInput:input". */
export class SelectInput {
  constructor(readonly el: HTMLSelectElement) {}
  private readonly onInput = (e: Event) => {
    this.el.classList.add(SELECT_TOUCHED);
    document.dispatchEvent(new CustomEvent("SelectInput:input", { detail: { forwardedEvent: e } }));
  };
  connect(): void {
    this.el.addEventListener("input", this.onInput);
  }
  disconnect(): void {
    this.el.removeEventListener("input", this.onInput);
  }
  isValid(): boolean {
    return this.el.validity.valid;
  }
  forceErrors(on: boolean): void {
    this.el.classList.toggle(SELECT_TOUCHED, on);
  }
  setDisabled(on: boolean): void {
    this.el.disabled = on;
  }
}

export interface QueryChange {
  type: "QueryChange";
  query: string;
}

/** Emits the query to listeners 160ms after typing stops. */
export class SearchInput {
  readonly input: HTMLInputElement;
  private readonly emitter = new Emitter<QueryChange>();
  private readonly debounced: (e: QueryChange) => void;
  private readonly cancelDebounce: () => void;
  constructor(readonly el: HTMLElement) {
    this.input = target<HTMLInputElement>(el, "SearchInput", "input") as HTMLInputElement;
    [this.debounced, this.cancelDebounce] = debounce((e: QueryChange) => this.emitter.emit(e), 160);
  }
  private readonly onInput = () => this.debounced({ type: "QueryChange", query: this.input.value });
  onChange(fn: (e: QueryChange) => void): () => void {
    return this.emitter.listen(fn);
  }
  clear(): void {
    this.input.value = "";
  }
  connect(): void {
    this.input?.addEventListener("input", this.onInput);
  }
  disconnect(): void {
    this.input?.removeEventListener("input", this.onInput);
    this.cancelDebounce();
    this.emitter.clear();
  }
}

export interface SelectChange {
  type: "SelectChange";
  state: { countryCode: string };
}
const HAS_PLACEHOLDER_FLAG = "CountrySelectInput--hasPlaceholderFlag";
const FLAG_PREFIX = "Flag--country";

/** Country <select> with a flag: swaps the Flag--country<CODE> class on change and notifies listeners. */
export class CountrySelectInput {
  private readonly select: HTMLSelectElement | null;
  private readonly flag: HTMLElement | null;
  private readonly emitter = new Emitter<SelectChange>();
  private readonly initial: { root: string; flag: string };
  constructor(readonly el: HTMLElement) {
    this.select = target<HTMLSelectElement>(el, "CountrySelectInput", "select");
    this.flag = target(el, "CountrySelectInput", "flag");
    this.initial = { root: el.className, flag: this.flag?.className ?? "" };
  }
  private readonly onChangeEvent = (e: Event) => {
    const code = (e.target as HTMLSelectElement).value;
    this.el.classList.remove(HAS_PLACEHOLDER_FLAG);
    if (this.flag) {
      [...this.flag.classList].forEach((c) => c.startsWith(FLAG_PREFIX) && this.flag?.classList.remove(c));
      this.flag.classList.add(`${FLAG_PREFIX}${code}`);
    }
    this.emitter.emit({ type: "SelectChange", state: { countryCode: code } });
  };
  connect(): void {
    this.select?.addEventListener("change", this.onChangeEvent);
  }
  disconnect(): void {
    this.select?.removeEventListener("change", this.onChangeEvent);
    this.emitter.clear();
    this.el.className = this.initial.root;
    if (this.flag) this.flag.className = this.initial.flag;
  }
  onChange(fn: (e: SelectChange) => void): () => void {
    return this.emitter.listen(fn);
  }
  get selectedValue(): string {
    return this.select?.value ?? "";
  }
}

/** Invoicing email card: parents play animateIn()/animateOut() (1000ms, +300ms delay, easeOutCubic). */
export class Email {
  readonly isStatic = disableAmbientAnimations();
  private readonly header: HTMLElement | null;
  constructor(readonly el: HTMLElement) {
    this.header = target(el, "Email", "header");
  }
  connect(): void {}
  disconnect(): void {
    this.el.getAnimations().forEach((a) => a.cancel());
    this.header?.getAnimations().forEach((a) => a.cancel());
  }
  animateIn(): Step {
    return new Waapi({
      el: this.el,
      keyframes: [
        { opacity: 0, transform: "scale(.9)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      duration: this.isStatic ? 0 : 1000,
      delay: this.isStatic ? 0 : 300,
      easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    });
  }
  animateOut(): Step {
    return new Waapi({
      el: this.header ?? this.el,
      keyframes: [{ opacity: 1 }, { opacity: 0 }],
      duration: this.isStatic ? 0 : 1000,
      delay: this.isStatic ? 0 : 300,
      easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    });
  }
}

export const inputControllers = {
  TextInput: classController("TextInput", (el) => new TextInput(el as HTMLInputElement)),
  SelectInput: classController("SelectInput", (el) => new SelectInput(el as HTMLSelectElement)),
  SearchInput: classController("SearchInput", (el) => new SearchInput(el)),
  CountrySelectInput: classController("CountrySelectInput", (el) => new CountrySelectInput(el)),
  Email: classController("Email", (el) => new Email(el)),
};
