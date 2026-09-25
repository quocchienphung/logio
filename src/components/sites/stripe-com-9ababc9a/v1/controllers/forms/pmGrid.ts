// Payment-methods hub grid: filtering by use case / payment family / business location / search text over
// the payment-method cards. Reference module: v1-Grid-MJLPPXEZ.js (PaymentMethodHubGrid, GridFilter,
// CardRenderer, PaymentMethodHubFilterText).
import { target } from "../lib";
import { Exec, Sequence, Waapi } from "./anim";
import type { ControlledFilter, FilterState, OptionConfig } from "./filters";
import type { SearchInput } from "./inputs";
import { childApi, childApis, classController, siteLocale } from "./util";

const EASE_IN_OUT_CUBIC = "cubic-bezier(0.65, 0, 0.35, 1)";
const CLEAR_HIDDEN = "PaymentMethodHubFilterText__clear--isHidden";
const SHOW_ALL_HIDDEN = "PaymentMethodHubGrid__showAllButton--hidden";

interface Country {
  name: string;
  countryCode: string;
}
interface PaymentMethod {
  identifier: string;
  name: string;
  localizedName?: string;
  type?: { title: string };
  useCases?: { name: string }[];
  countries?: Country[];
  featuredCountries?: Country[];
}

export class PaymentMethodHubFilterText {
  private readonly filterText: HTMLElement | null;
  private readonly clearBtn: HTMLElement | null;
  private readonly clearListeners = new Set<() => void>();
  private readonly initial: { text: string; btnClass: string };
  constructor(readonly el: HTMLElement) {
    this.filterText = target(el, "PaymentMethodHubFilterText", "filterText");
    this.clearBtn = target(el, "PaymentMethodHubFilterText", "clearFilterBtn");
    this.initial = { text: this.filterText?.textContent ?? "", btnClass: this.clearBtn?.className ?? "" };
  }
  private readonly onClear = () => {
    this.clearListeners.forEach((fn) => fn());
    this.updateFilterText(0, 0, 0);
  };
  connect(): void {
    this.clearBtn?.addEventListener("click", this.onClear);
  }
  disconnect(): void {
    this.clearBtn?.removeEventListener("click", this.onClear);
    this.clearListeners.clear();
    if (this.filterText) this.filterText.textContent = this.initial.text;
    if (this.clearBtn) this.clearBtn.className = this.initial.btnClass;
  }
  onClearInput(fn: () => void): () => void {
    this.clearListeners.add(fn);
    return () => this.clearListeners.delete(fn);
  }
  showNoResultsFilterText(): void {
    if (this.filterText) this.filterText.textContent = this.filterText.dataset.filterStateNoResults || "";
    this.clearBtn?.classList.remove(CLEAR_HIDDEN);
  }
  /** Picks data-filter-state-{single|plural}-{usecase,type,business} (or -showing-all) and fills the counts. */
  updateFilterText(useCases: number, types: number, business: number): void {
    const none = useCases + types + business === 0;
    let key = "filterState";
    if (none) key += "ShowingAll";
    else {
      if (useCases > 0) key += (useCases === 1 ? "Single" : "Plural") + "Usecase";
      if (types > 0) key += (types === 1 ? "Single" : "Plural") + "Type";
      if (business > 0) key += (business === 1 ? "Single" : "Plural") + "Business";
    }
    const tpl = this.filterText?.dataset[key] || "";
    if (this.filterText)
      this.filterText.textContent = tpl
        .replace("[use_case_count]", String(useCases))
        .replace("[type_count]", String(types))
        .replace("[business_count]", String(business));
    this.clearBtn?.classList.toggle(CLEAR_HIDDEN, none);
  }
}

function localeCompare(a: string, b: string): number {
  try {
    return a.localeCompare(b, siteLocale());
  } catch {
    return a.localeCompare(b);
  }
}
function by<K extends string>(key: K, localized = false) {
  return (x: Record<K, unknown>, y: Record<K, unknown>): number => {
    const a = x[key];
    const b = y[key];
    if (localized && typeof a === "string" && typeof b === "string") return localeCompare(a, b);
    return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0;
  };
}
const isActive = (s: FilterState) => Object.values(s).includes(true);

class GridFilter {
  state = { text: "", useCase: {} as FilterState, paymentMethodType: {} as FilterState, country: {} as FilterState };
  constructor(
    private readonly filters: ControlledFilter[],
    private readonly paymentMethods: PaymentMethod[],
    private readonly textInput: SearchInput,
    countryNames: Record<string, string>,
  ) {
    const types = new Set<string>();
    const useCases = new Set<string>();
    const countries: Country[] = [];
    for (const pm of paymentMethods) {
      pm.useCases?.forEach(({ name }) => useCases.add(name));
      pm.countries?.forEach((c) => countries.some((k) => k.countryCode === c.countryCode) || countries.push(c));
      if (pm.type) types.add(pm.type.title);
    }
    const toOptions = (s: Set<string>): OptionConfig[] => Array.from(s).map((n) => ({ type: "OPTION", name: n, label: n, checked: false }));
    this.filter("paymentMethodType")?.setOptions(toOptions(types));
    this.filter("useCase")?.setOptions(toOptions(useCases));
    this.filter("country")?.setOptions(
      countries
        .map((c): OptionConfig => ({ type: "OPTION", name: c.countryCode, label: countryNames[c.countryCode] || c.name, checked: false }))
        .sort(by("label", true)),
    );
  }
  filter(name: string): ControlledFilter | undefined {
    return this.filters.find((f) => f.name === name);
  }
  update(): void {
    this.state.useCase = this.filter("useCase")?.getState() ?? {};
    this.state.country = this.filter("country")?.getState() ?? {};
    this.state.paymentMethodType = this.filter("paymentMethodType")?.getState() ?? {};
    this.state.text = this.textInput.input.value;
  }
  getFilteredPaymentMethods(): PaymentMethod[] {
    // the reference sorts the shared list in place
    let list = this.paymentMethods.sort(by("name", true) as (a: PaymentMethod, b: PaymentMethod) => number);
    const s = this.state;
    if (isActive(s.useCase)) list = list.filter((pm) => !!pm.useCases?.some((u) => s.useCase[u.name]));
    if (isActive(s.paymentMethodType)) list = list.filter((pm) => !!pm.type && !!s.paymentMethodType[pm.type.title]);
    if (isActive(s.country)) {
      const selected = Object.keys(s.country).filter((c) => s.country[c]);
      const featured = (pm: PaymentMethod) => (pm.featuredCountries?.some((f) => selected.includes(f.countryCode)) ? 1 : 0);
      list = list.filter((pm) => !!pm.countries?.some((c) => s.country[c.countryCode])).sort((a, b) => featured(b) - featured(a));
    }
    if (s.text !== "") {
      const q = s.text.replace(/\W/g, "").toUpperCase();
      list = list.filter((pm) =>
        [pm.localizedName, pm.name, pm.type?.title, ...(pm.useCases?.map((u) => u.name) ?? []), ...(pm.countries?.map((c) => c.name) ?? [])].some(
          (v) => (v ?? "").replace(/\W/g, "").toUpperCase().includes(q),
        ),
      );
    }
    return list;
  }
  get isAnyFilterActive(): boolean {
    const s = this.state;
    return isActive(s.paymentMethodType) || isActive(s.useCase) || isActive(s.country) || s.text !== "";
  }
  clearAll(): void {
    this.filter("paymentMethodType")?.clear();
    this.textInput.clear();
    this.filter("useCase")?.clear();
    this.filter("country")?.clear();
    this.update();
  }
}

type GridState = "initial" | "showingAll" | "filtered";

export class PaymentMethodHubGrid {
  private _state: GridState = "initial";
  private readonly gridEl: HTMLElement;
  private readonly showAllBtn: HTMLElement | null;
  private readonly cardTemplate: HTMLTemplateElement | null;
  private readonly originalCards: Element[];
  private readonly initialCards: Element[];
  private paymentMethods: PaymentMethod[] = [];
  private filter: GridFilter | null = null;
  private mounted: (() => void)[] = [];
  private offs: (() => void)[] = [];
  private alive = true;
  private cardHtml: Readonly<Record<string, string>> | null = null;

  constructor(readonly el: HTMLElement) {
    this.gridEl = target(el, "PaymentMethodHubGrid", "gridEl") as HTMLElement;
    this.showAllBtn = target(el, "PaymentMethodHubGrid", "showAllButtonEl");
    this.cardTemplate = target<HTMLTemplateElement>(el, "PaymentMethodHubGrid", "cardTemplateEl");
    this.originalCards = Array.from(this.gridEl.children);
    this.initialCards = Array.from(this.gridEl.querySelectorAll(".PaymentMethodCard")).map((c) => c.cloneNode(true) as Element);
  }

  connect(): void {
    const pmEl = target(this.el, "PaymentMethodHubGrid", "paymentMethodEl");
    const namesEl = target(this.el, "PaymentMethodHubGrid", "countryNamesEl");
    this.paymentMethods = JSON.parse(pmEl?.innerHTML || "[]") as PaymentMethod[];
    const countryNames = JSON.parse(namesEl?.innerHTML || "{}") as Record<string, string>;
    const search = this.textFilterInput;
    const filters = childApis<ControlledFilter>(this.el, "ControlledFilter");
    if (!search) return;
    this.filter = new GridFilter(filters, this.paymentMethods, search, countryNames);
    const onChange = () => this.handleFilterChange();
    ["paymentMethodType", "useCase", "country"].forEach((n) => {
      const f = this.filter?.filter(n);
      if (f) this.offs.push(f.onChange(onChange));
    });
    this.offs.push(search.onChange(onChange));
    const onShowAll = () => this.setState("showingAll");
    this.showAllBtn?.addEventListener("click", onShowAll);
    this.offs.push(() => this.showAllBtn?.removeEventListener("click", onShowAll));
    const text = this.filterText;
    if (text) this.offs.push(text.onClearInput(() => this.setState("initial")));
  }

  disconnect(): void {
    this.alive = false;
    this.offs.forEach((f) => f());
    this.offs = [];
    this.mounted.forEach((f) => f());
    this.mounted = [];
    this.gridEl.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    this.gridEl.replaceChildren(...this.originalCards);
    this.originalCards.forEach((c) => (c as HTMLElement).style.removeProperty("opacity"));
    this.showAllBtn?.classList.remove(SHOW_ALL_HIDDEN);
  }

  private handleFilterChange(): void {
    if (!this.filter) return;
    this.filter.update();
    this.setState(this.filter.isAnyFilterActive ? "filtered" : "initial");
  }

  private setState(s: GridState): void {
    if (!this.filter || (s !== "filtered" && s === this._state)) return;
    if (s === "showingAll") {
      this.filter.clearAll();
      void this.renderAllCards();
      this.toggleShowAllButton(false);
    }
    if (s === "initial") {
      this.filter.clearAll();
      void this.renderInitialCards();
      this.toggleShowAllButton(true);
    }
    if (s === "filtered") {
      void this.renderFilteredCards();
      this.toggleShowAllButton(false);
    }
    this._state = s;
  }

  private toggleShowAllButton(show: boolean): void {
    this.showAllBtn?.classList.toggle(SHOW_ALL_HIDDEN, !show);
  }

  private updateFilterText(): void {
    const s = this.filter?.state;
    if (!s) return;
    const n = (o: FilterState) => Object.values(o).filter(Boolean).length;
    this.filterText?.updateFilterText(n(s.useCase), n(s.paymentMethodType), n(s.country));
  }

  private async renderInitialCards(): Promise<void> {
    this.updateFilterText();
    await this.fadeOutCards();
    await this.fadeInCards(this.initialCards.map((c) => c.cloneNode(true) as Element));
  }
  private async renderFilteredCards(): Promise<void> {
    const list = this.filter?.getFilteredPaymentMethods() ?? [];
    if (list.length > 0) {
      this.updateFilterText();
      const cards = this.cardsFor(list);
      await this.fadeOutCards();
      await this.fadeInCards(await cards);
    } else {
      this.filterText?.showNoResultsFilterText();
      await this.fadeOutCards();
    }
  }
  private async renderAllCards(): Promise<void> {
    this.updateFilterText();
    const cards = this.cardsFor(this.paymentMethods);
    await this.fadeOutCards();
    await this.fadeInCards(await cards);
  }

  /** Clone each method's card from the card template (or the extracted template markup, loaded on demand). */
  private async cardsFor(list: PaymentMethod[]): Promise<Element[]> {
    const fromTemplate = (id: string) => this.cardTemplate?.content.querySelector(`[data-id="${CSS.escape(id)}"]`)?.cloneNode(true) as Element | undefined;
    if (!this.cardTemplate && !this.cardHtml) this.cardHtml = (await import("./data/pmCards")).PM_CARDS;
    const t = document.createElement("template");
    return list
      .map((pm) => {
        const c = fromTemplate(pm.identifier);
        if (c) return c;
        const html = this.cardHtml?.[pm.identifier];
        if (!html) return null;
        t.innerHTML = html;
        return t.content.firstElementChild;
      })
      .filter((c): c is Element => !!c);
  }

  /** Current cards fade out (320ms, easeInOutCubic), then the grid is emptied. */
  private async fadeOutCards(): Promise<void> {
    const cards = Array.from(this.gridEl.children);
    if (cards.length === 0) return;
    const fade = new Waapi({ el: cards, keyframes: [{ opacity: 1 }, { opacity: 0 }], easing: EASE_IN_OUT_CUBIC, duration: 320 });
    await new Sequence([
      fade,
      new Exec(() => {
        if (!this.alive) return;
        this.gridEl.replaceChildren();
        this.mounted.forEach((f) => f());
        this.mounted = [];
      }),
      new Exec(() => {
        cards.forEach((c) => ((c as HTMLElement).style.opacity = "0"));
        fade.animations.forEach((a) => a.cancel());
      }),
    ]).play();
  }

  /** New cards rise in: translateY(15px) scale(.95) -> none, opacity 0 -> 1, 360ms, 40ms stagger. */
  private async fadeInCards(cards: Element[]): Promise<void> {
    if (!this.alive || cards.length === 0) return;
    const fade = new Waapi({
      el: cards,
      keyframes: [
        { opacity: 0, transform: "translateY(15px) scale(0.95)" },
        { opacity: 1, transform: "translateY(0px) scale(1.0)" },
      ],
      easing: EASE_IN_OUT_CUBIC,
      duration: 360,
      delay: (i) => i * 40,
    });
    await new Sequence([
      new Exec(async () => {
        cards.forEach((c) => ((c as HTMLElement).style.opacity = "0"));
        // The reference framework mounts controllers on inserted nodes (MutationObserver); do the same for
        // the cloned cards (tooltips, card hover) before they enter the grid.
        const holder = document.createElement("div");
        holder.append(...cards);
        const { mountControllers } = await import("../registry");
        if (!this.alive) return;
        this.mounted.push(mountControllers(holder));
        this.gridEl.append(...cards);
      }),
      fade,
      new Exec(() => {
        cards.forEach((c) => ((c as HTMLElement).style.opacity = "1"));
        fade.animations.forEach((a) => a.cancel());
      }),
    ]).play();
  }

  get textFilterInput(): SearchInput | undefined {
    return childApi<SearchInput>(this.el, "SearchInput");
  }
  get filterText(): PaymentMethodHubFilterText | undefined {
    return childApi<PaymentMethodHubFilterText>(this.el, "PaymentMethodHubFilterText");
  }
}

export const pmGridControllers = {
  PaymentMethodHubFilterText: classController("PaymentMethodHubFilterText", (el) => new PaymentMethodHubFilterText(el)),
  PaymentMethodHubGrid: classController("PaymentMethodHubGrid", (el) => new PaymentMethodHubGrid(el)),
};
