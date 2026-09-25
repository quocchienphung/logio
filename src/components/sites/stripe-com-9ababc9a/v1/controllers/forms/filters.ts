// Filter dropdowns of the payment-methods hub. Reference modules:
//   ControlledFilterSelect .. v1-chunk-QQPCZ2NS.js (checkbox dropdown: options, group selects, label, open/close)
//   ControlledFilter ........ v1-chunk-UYNMLKL6.js (named wrapper, 100ms debounced change events)
import { target } from "../lib";
import { childApi, classController, debounce, Emitter } from "./util";

export interface OptionConfig {
  type: "OPTION" | "GROUP";
  name: string;
  label: string;
  checked?: boolean;
  children?: OptionConfig[];
}
export type FilterState = Record<string, boolean>;
export interface FilterChange {
  type: "FilterChange";
  state: FilterState;
}

// Markup of the reference's <template data-js-target="ControlledFilterSelect.optionTemplate|groupSelectTemplate">
// (the page generator drops <template> elements, so they are rebuilt here when absent).
const CHECK_SVG =
  '<svg class="CheckboxField__check" width="16" height="8" viewBox="0 0 8 7"><path d="M7.16.18L2.4 4.79 1.13 3.43a.7.7 0 0 0-.87-.04.61.61 0 0 0-.18.8l1.5 2.45c.15.22.41.36.69.36.28 0 .53-.14.68-.36C3.2 6.33 7.77.86 7.77.86c.6-.6-.13-1.15-.6-.68z" fill="var(--knockoutColor)"/></svg>';
const checkbox = (ctrl: string) =>
  `<label class="CheckboxField"><input class="CheckboxField__hiddenInput" id="" type="checkbox" value="value" name="name" data-js-target-list="${ctrl}.checkbox"><span class="CheckboxField__checkbox">${CHECK_SVG}<div class="CheckboxField__dash"></div></span><span class="CheckboxField__label"><p>label</p></span></label>`;
const OPTION_HTML = `<li class="ControlledFilterOption">${checkbox("ControlledFilterOption")}</li>`;
const GROUP_HTML = `<li class="ControlledFilterOption ControlledFilterOption--groupSelect">${checkbox("ControlledFilterGroupSelect")}<ul class="ControlledFilterGroupSelect__optionList" data-js-target="ControlledFilterGroupSelect.optionList"></ul></li>`;

function fromHtml(html: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.content.firstElementChild as HTMLElement;
}

abstract class OptionNode {
  children: OptionNode[] = [];
  parent: GroupNode | null = null;
  abstract readonly type: "OPTION" | "GROUP_SELECT";
  readonly checkboxEl: HTMLInputElement;
  protected readonly labelEl: HTMLElement;
  protected readonly emitter = new Emitter<void>();
  constructor(
    readonly el: HTMLElement,
    readonly config: OptionConfig,
    ctrl: string,
  ) {
    this.checkboxEl = el.querySelector(`[data-js-target-list="${ctrl}.checkbox"]`) as HTMLInputElement;
    this.labelEl = el.querySelector(".CheckboxField__label > *") as HTMLElement;
    this.labelEl.textContent = config.label;
    this.checkboxEl.addEventListener("click", this.onClick);
    this.disableFocusOnInputs();
  }
  /** The click is cancelled and the toggle applied on the next task (reference behaviour). */
  private readonly onClick = (e: Event) => {
    e.preventDefault();
    window.setTimeout(() => {
      this.toggle();
      this.emitter.emit();
    }, 0);
  };
  protected abstract toggle(): void;
  onChange(fn: () => void): void {
    this.emitter.listen(fn);
  }
  disconnect(): void {
    this.checkboxEl.removeEventListener("click", this.onClick);
    this.emitter.clear();
    this.children.forEach((c) => c.disconnect());
  }
  enableFocusOnInputs(): void {
    this.checkboxEl.removeAttribute("tabindex");
  }
  disableFocusOnInputs(): void {
    this.checkboxEl.setAttribute("tabindex", "-1");
  }
  get name(): string {
    return this.checkboxEl.getAttribute("name") || this.config.name;
  }
  set name(v: string) {
    this.checkboxEl.setAttribute("value", v);
    this.checkboxEl.setAttribute("name", v);
  }
  abstract get checked(): boolean;
  abstract set checked(v: boolean);
  updateCheckedStatus(): void {
    this.parent?.updateCheckedStatus();
  }
}

class OptionLeaf extends OptionNode {
  readonly type = "OPTION" as const;
  constructor(el: HTMLElement, config: OptionConfig) {
    super(el, config, "ControlledFilterOption");
    this.name = config.name;
    this.checked = !!config.checked;
  }
  protected toggle(): void {
    this.checked = !this.checked;
  }
  get checked(): boolean {
    return this.checkboxEl.checked;
  }
  set checked(v: boolean) {
    if (v === this.checkboxEl.checked) return;
    this.checkboxEl.checked = v;
    this.parent?.updateCheckedStatus();
  }
}

type GroupState = "checked" | "unchecked" | "indeterminate";
class GroupNode extends OptionNode {
  readonly type = "GROUP_SELECT" as const;
  readonly optionListEl: HTMLElement | null;
  constructor(el: HTMLElement, config: OptionConfig) {
    super(el, config, "ControlledFilterGroupSelect");
    this.optionListEl = el.querySelector('[data-js-target="ControlledFilterGroupSelect.optionList"]');
  }
  protected toggle(): void {
    this.state = this.state === "checked" ? "unchecked" : "checked";
  }
  // The reference's group node has no `checked` of its own (it reads false); options are addressed by name.
  get checked(): boolean {
    return false;
  }
  set checked(v: boolean) {
    void v;
  }
  private updateChildren(s: GroupState): void {
    for (const c of this.children) {
      if (c instanceof OptionLeaf) c.checked = s === "checked";
      if (c instanceof GroupNode) c.state = s;
    }
  }
  updateCheckedStatus(): void {
    const on = this.children.filter((c) => (c instanceof GroupNode ? c.state === "checked" : c.checked));
    const mixed = this.children.filter((c) => c instanceof GroupNode && c.state === "indeterminate");
    if (this.children.length === on.length) this.state = "checked";
    else if (on.length > 0 || mixed.length > 0) this.state = "indeterminate";
    else this.state = "unchecked";
    super.updateCheckedStatus();
  }
  get state(): GroupState {
    return this.checkboxEl.checked ? "checked" : this.checkboxEl.indeterminate ? "indeterminate" : "unchecked";
  }
  set state(s: GroupState) {
    this.checkboxEl.checked = s === "checked";
    this.checkboxEl.indeterminate = s === "indeterminate";
    if (s !== "indeterminate") this.updateChildren(s);
  }
}

const walk = (n: OptionNode, fn: (n: OptionNode, depth: number) => void, depth = 1) => {
  fn(n, depth);
  n.children.forEach((c) => walk(c, fn, depth + 1));
};

const CLOSE_DELAY_MS = 700;

export class ControlledFilterSelect {
  private roots: OptionNode[] = [];
  private closeTimer = 0;
  private readonly emitter = new Emitter<FilterChange>();
  private readonly trigger: HTMLButtonElement;
  private readonly rootOptionList: HTMLElement;
  private readonly label: HTMLElement | null;
  private readonly optionTemplate: HTMLTemplateElement | null;
  private readonly groupTemplate: HTMLTemplateElement | null;
  private readonly initial: { label: string; disabled: boolean; listClass: string };

  constructor(readonly el: HTMLElement) {
    this.trigger = target<HTMLButtonElement>(el, "ControlledFilterSelect", "trigger") as HTMLButtonElement;
    this.rootOptionList = target(el, "ControlledFilterSelect", "rootOptionList") as HTMLElement;
    this.label = target(el, "ControlledFilterSelect", "label");
    this.optionTemplate = target<HTMLTemplateElement>(el, "ControlledFilterSelect", "optionTemplate");
    this.groupTemplate = target<HTMLTemplateElement>(el, "ControlledFilterSelect", "groupSelectTemplate");
    this.initial = { label: this.label?.textContent ?? "", disabled: this.trigger.disabled, listClass: this.rootOptionList.className };
  }

  private readonly onTriggerClick = () => (this.isOpen = !this.isOpen);
  private readonly onMouseLeave = () => {
    this.closeTimer = window.setTimeout(() => (this.isOpen = false), CLOSE_DELAY_MS);
  };
  private readonly onMouseEnter = () => window.clearTimeout(this.closeTimer);
  private readonly onBodyClick = (e: MouseEvent) => {
    const t = e.target as Node | null;
    if (t && !this.el.contains(t) && this.isOpen) this.isOpen = false;
  };
  private readonly onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.isOpen) this.isOpen = false;
  };
  private readonly onPopupOpen = (e: Event) => {
    if ((e as CustomEvent<{ dispatcher: unknown }>).detail?.dispatcher !== this && this.isOpen) this.isOpen = false;
  };
  private readonly onOptionChange = () => {
    this.emitter.emit({ type: "FilterChange", state: this.getOptions() });
    this.updateLabel();
  };

  connect(): void {
    this.trigger.addEventListener("click", this.onTriggerClick);
    this.rootOptionList.addEventListener("mouseleave", this.onMouseLeave);
    this.rootOptionList.addEventListener("mouseenter", this.onMouseEnter);
    document.body.addEventListener("click", this.onBodyClick);
    document.addEventListener("keydown", this.onKeydown);
    document.body.addEventListener("popup:open", this.onPopupOpen);
  }
  disconnect(): void {
    this.trigger.removeEventListener("click", this.onTriggerClick);
    this.rootOptionList.removeEventListener("mouseleave", this.onMouseLeave);
    this.rootOptionList.removeEventListener("mouseenter", this.onMouseEnter);
    document.body.removeEventListener("click", this.onBodyClick);
    document.removeEventListener("keydown", this.onKeydown);
    document.body.removeEventListener("popup:open", this.onPopupOpen);
    window.clearTimeout(this.closeTimer);
    this.roots.forEach((r) => r.disconnect());
    this.roots = [];
    this.emitter.clear();
    this.rootOptionList.replaceChildren();
    this.rootOptionList.className = this.initial.listClass;
    this.rootOptionList.hidden = true;
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.disabled = this.initial.disabled;
    if (this.label) this.label.textContent = this.initial.label;
  }

  onChange(fn: (e: FilterChange) => void): () => void {
    return this.emitter.listen(fn);
  }

  getOptions(): FilterState {
    const out: FilterState = {};
    this.roots.forEach((r) => walk(r, (n) => n.type === "OPTION" && (out[n.name] = n.checked)));
    return out;
  }

  setOptions(options: OptionConfig[]): void {
    this.roots.forEach((r) => walk(r, (n) => n.disableFocusOnInputs()));
    this.roots = options.map((o) => this.create(o, null));
    this.roots.forEach((r) => this.render(r));
    if (this.maxDepth() > 1) this.rootOptionList.classList.add("ControlledFilterSelect__rootOptionList--nested");
    this.disabled = false;
  }

  private create(config: OptionConfig, parent: GroupNode | null): OptionNode {
    const tpl = config.type === "GROUP" ? this.groupTemplate : this.optionTemplate;
    const cloned = tpl?.content.firstElementChild?.cloneNode(true);
    const el = cloned instanceof HTMLElement ? cloned : fromHtml(config.type === "GROUP" ? GROUP_HTML : OPTION_HTML);
    const node: OptionNode = config.type === "GROUP" ? new GroupNode(el, config) : new OptionLeaf(el, config);
    node.onChange(this.onOptionChange);
    if (config.children && node instanceof GroupNode) node.children = config.children.map((c) => this.create(c, node));
    node.parent = parent;
    return node;
  }

  private render(n: OptionNode): void {
    n.children.forEach((c) => this.render(c));
    if (n.parent?.optionListEl) n.parent.optionListEl.appendChild(n.el);
    else this.rootOptionList.appendChild(n.el);
  }

  private maxDepth(): number {
    let d = 0;
    this.roots.forEach((r) => walk(r, (_n, depth) => (d = Math.max(d, depth))));
    return d;
  }

  setValue(name: string, checked: boolean): void {
    let found: OptionNode | null = null;
    this.roots.forEach((r) => walk(r, (n) => n.name === name && (found = n)));
    if (found) (found as OptionNode).checked = checked;
    this.updateLabel();
  }
  setValues(values: FilterState): void {
    Object.entries(values).forEach(([k, v]) => this.setValue(k, v));
  }
  clear(): void {
    const off: FilterState = {};
    Object.keys(this.getOptions()).forEach((k) => (off[k] = false));
    this.setValues(off);
  }

  /** "Use case" when nothing is selected, else data-selected with [amount] replaced by the count. */
  updateLabel(): void {
    let count = 0;
    this.roots.forEach((r) => walk(r, (n) => n.type === "OPTION" && n.checked && (count += 1)));
    const text = (count === 0 ? this.el.dataset.label : this.el.dataset.selected) ?? "";
    if (this.label) this.label.textContent = text.replace("[amount]", String(count));
  }

  get isOpen(): boolean {
    return !this.rootOptionList.hasAttribute("hidden");
  }
  set isOpen(open: boolean) {
    this.trigger.setAttribute("aria-expanded", String(open));
    this.rootOptionList.toggleAttribute("hidden", !open);
    if (open) {
      this.roots.forEach((r) => walk(r, (n) => n.enableFocusOnInputs()));
      document.body.dispatchEvent(new CustomEvent("popup:open", { bubbles: true, detail: { dispatcher: this } }));
    } else {
      this.roots.forEach((r) => walk(r, (n) => n.disableFocusOnInputs()));
      this.trigger.focus();
    }
  }
  get filterName(): string | undefined {
    return this.el.dataset.name;
  }
  get disabled(): boolean {
    return this.trigger.disabled;
  }
  set disabled(v: boolean) {
    this.trigger.disabled = v;
  }
}

const OPTION_DEBOUNCE_MS = 100;

export class ControlledFilter {
  readonly name: string;
  private readonly emitter = new Emitter<FilterChange>();
  private readonly debounced: (e: FilterChange) => void;
  private readonly cancelDebounce: () => void;
  private unsubscribe: (() => void) | null = null;
  constructor(readonly el: HTMLElement) {
    this.name = el.dataset.name ?? "";
    [this.debounced, this.cancelDebounce] = debounce((e: FilterChange) => this.emitter.emit(e), OPTION_DEBOUNCE_MS);
  }
  connect(): void {
    const select = this.controlledFilterSelect;
    this.unsubscribe = select.onChange(this.debounced);
    const json = target(this.el, "ControlledFilter", "JSON");
    if (json) this.setOptions(JSON.parse(json.textContent || "[]") as OptionConfig[]);
    if (this.el.dataset.usesQueryParam === "true") this.initWithQueryParams();
  }
  disconnect(): void {
    this.unsubscribe?.();
    this.cancelDebounce();
    this.emitter.clear();
  }
  onChange(fn: (e: FilterChange) => void): () => void {
    return this.emitter.listen(fn);
  }
  setOptions(options: OptionConfig[]): void {
    this.controlledFilterSelect.setOptions(options);
    this.controlledFilterSelect.disabled = false;
  }
  private initWithQueryParams(): void {
    const values = new URLSearchParams(window.location.search).getAll(this.name);
    this.controlledFilterSelect.setValues(Object.fromEntries(values.map((v) => [v, true])));
  }
  getState(): FilterState {
    return this.controlledFilterSelect.getOptions();
  }
  get active(): boolean {
    return Object.values(this.getState()).includes(true);
  }
  clear(): void {
    this.controlledFilterSelect.clear();
  }
  get controlledFilterSelect(): ControlledFilterSelect {
    const s = childApi<ControlledFilterSelect>(this.el, "ControlledFilterSelect");
    if (!s) throw new Error("Missing ControlledFilterSelect child component!");
    return s;
  }
}

export const filterControllers = {
  ControlledFilterSelect: classController("ControlledFilterSelect", (el) => new ControlledFilterSelect(el)),
  ControlledFilter: classController("ControlledFilter", (el) => new ControlledFilter(el)),
};
