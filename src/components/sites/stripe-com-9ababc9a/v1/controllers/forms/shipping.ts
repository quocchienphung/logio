// Checkout shipping-address demo. Reference modules:
//   ShippingField ........ v1-chunk-YMSKATN7.js (resetAnimation() / playAnimation(), driven by CheckoutAddressCard)
//   AddressAutoComplete .. v1-chunk-7UHPED3L.js (suggestion popover)
// All addresses are the reference's fictional sample data; nothing is looked up or sent anywhere.
import { target } from "../lib";
import { Delay, Exec, Group, Sequence, Type, Waapi, type Step } from "./anim";
import { childApi, classController, siteLocale } from "./util";

interface Suggestion {
  street: string;
  municipality: string;
  isSelected: boolean;
}

const SELECTED = "AddressAutoComplete__suggestion--selected";

/** Longest common prefix of two strings (reference helper p()). */
function commonPrefix(a: string, b: string): string {
  const [first, last] = [a, b].sort();
  let i = 0;
  while (i < first.length && first.charAt(i) === last.charAt(i)) i += 1;
  return first.substring(0, i);
}

export class AddressAutoComplete {
  isHidden = true;
  private readonly list: HTMLElement | null;
  private readonly template: HTMLTemplateElement | null;
  private readonly original: Node[];
  private anim: Waapi | null = null;
  constructor(readonly el: HTMLElement) {
    this.list = target(el, "AddressAutoComplete", "suggestionList");
    this.template = target<HTMLTemplateElement>(el, "AddressAutoComplete", "suggestionTemplate");
    this.original = this.list ? Array.from(this.list.childNodes) : [];
  }
  connect(): void {}
  disconnect(): void {
    this.anim?.cancel();
    this.list?.replaceChildren(...this.original);
    delete this.el.dataset.jsLoading;
  }
  private set isLoading(v: boolean) {
    if (v) this.el.dataset.jsLoading = "";
    else delete this.el.dataset.jsLoading;
  }
  private fade(show: boolean, duration: number): void {
    this.anim?.cancel();
    const a = { opacity: 1, transform: "translateY(0)" };
    const b = { opacity: 0, transform: "translateY(30px)" };
    this.anim = new Waapi({ el: this.el, keyframes: show ? [b, a] : [a, b], duration });
    void this.anim.play();
  }
  show(): void {
    this.isHidden = false;
    this.isLoading = true;
    this.fade(true, 500);
  }
  hide(animate = true): void {
    this.isHidden = true;
    this.isLoading = false;
    this.fade(false, animate ? 500 : 0);
  }
  /** Markup of the reference's <template data-js-target="AddressAutoComplete.suggestionTemplate">. */
  private suggestionNode(s: Suggestion): HTMLElement {
    const fromTemplate = this.template?.content.firstElementChild?.cloneNode(true);
    const row = fromTemplate instanceof HTMLElement ? fromTemplate : document.createElement("div");
    if (!(fromTemplate instanceof HTMLElement)) {
      row.className = "AddressAutoComplete__suggestion";
      const street = document.createElement("span");
      const muni = document.createElement("span");
      muni.className = "AddressAutoComplete__municipality";
      row.append(street, muni);
    }
    const [street, muni] = Array.from(row.children) as HTMLElement[];
    street.textContent = s.street;
    muni.textContent = s.municipality;
    row.querySelectorAll("[data-js-target]").forEach((n) => n.removeAttribute("data-js-target"));
    return row;
  }
  setSuggestions(items: Suggestion[], typed: string): void {
    if (!this.list) return;
    this.list.replaceChildren();
    if (this.isHidden) this.show();
    items.forEach((s) => {
      const row = this.suggestionNode(s);
      const street = row.firstElementChild as HTMLElement | null;
      const prefix = street ? commonPrefix(typed, street.textContent ?? "") : "";
      if (street && prefix) {
        const em = document.createElement("em");
        em.textContent = prefix;
        street.replaceChildren(em, (street.textContent ?? "").slice(prefix.length));
      }
      if (s.isSelected) row.classList.add(SELECTED);
      this.list?.appendChild(row);
    });
  }
}

const FOCUSED = "GraphicFormFieldInput--focused";
const sug = (rows: [string, string][]): Suggestion[] => rows.map(([street, municipality], i) => ({ street, municipality, isSelected: i === 0 }));

const NUMBER_COMPLETE = sug([
  ["354 Moonbeam Drive", "Pacifica, CA, USA"],
  ["354 Starlight Avenue", "San Francisco, CA, USA"],
  ["354 Dreamcatcher Street", "San Francisco, CA, USA"],
  ["354 Silverbell Boulevard", "San Francisco, CA, USA"],
  ["354 Windchime Lane", "San Francisco, CA, USA"],
]);
const FINAL_US = sug([
  ["354 Oyster Point Blvd", "South San Francisco, CA, USA"],
  ["354 Oyster Bay Drive", "Brisbane, CA, USA"],
  ["354 Oyster Cove Lane", "Millbrae, CA, USA"],
  ["354 Oyster Shell Court", "San Bruno, CA, USA"],
  ["354 Oyster Rock Way", "Burlingame, CA, USA"],
]);
const FINAL_IE = sug([
  ["1 Grand Canal Street Lower", "Dublin 2, D02 H210, Ireland"],
  ["1 Grand Canal Wharf", "Dublin 2, D02 H210, Ireland"],
  ["1 Grand Canal Place", "Dublin 2, D02 H210, Ireland"],
  ["1 Grand Canal Square", "Dublin 2, D02 H210, Ireland"],
  ["1 Grand Canal View", "Dublin 2, D02 H210, Ireland"],
]);
/** Suggestions per typed length (index = characters typed - 1), reference autoCompleteSuggestions. */
function suggestionsByLength(final: Suggestion[]): Suggestion[][] {
  return [
    [],
    sug([
      ["3456 Whispering Hills Drive", "Daly City, CA, USA"],
      ["32 Sunset Harbor Boulevard", "San Francisco, CA, USA"],
      ["3891 Crystal Creek Street", "San Francisco, CA, USA"],
      ["3245 Meadowbrook Avenue", "Daly City, CA, USA"],
      ["3567 Rainbow Ridge Road", "San Bruno, CA, USA"],
    ]),
    sug([
      ["356 Cobblestone Court", "San Francisco, CA, USA"],
      ["359 Butterfly Gardens Way", "San Francisco, CA, USA"],
      ["352 Lighthouse Point Drive", "San Francisco, CA, USA"],
      ["358 Sandcastle Avenue", "San Francisco, CA, USA"],
      ["351 Seabreeze Terrace", "San Francisco, CA, USA"],
    ]),
    NUMBER_COMPLETE,
    sug([
      ["354 Oceanview Heights Drive", "San Mateo, CA, USA"],
      ["354 Orange Blossom Parkway", "Redwood City, CA, USA"],
      ["354 Owl Creek Road", "San Carlos, CA, USA"],
      ["354 Orchard View Avenue", "Burlingame, CA, USA"],
      ["354 Opal Ridge Street", "San Francisco, CA, USA"],
    ]),
    sug([
      ["354 Oyster Point Blvd", "South San Francisco, CA, USA"],
      ["354 Outer Sunset Way", "Berkeley, CA, USA"],
      ["354 Ocean Mist Avenue", "San Mateo, CA, USA"],
      ["354 Olive Tree Lane", "San Francisco, CA, USA"],
      ["354 Oakwood Heights Drive", "Redwood City, CA, USA"],
    ]),
    final,
    final,
    final,
  ];
}

type FieldKey = "name" | "firstAddressLine" | "secondAddressLine" | "city" | "state" | "country" | "zip";
const FIELD_KEYS: FieldKey[] = ["name", "firstAddressLine", "secondAddressLine", "city", "state", "country", "zip"];
const HIGHLIGHT_KEYS = ["firstAddressLine", "city", "zip", "state", "country"] as const;

export class ShippingField {
  readonly isUS = siteLocale() === "US";
  private readonly name: string;
  private readonly fields: Record<FieldKey, HTMLElement | null>;
  private readonly inputs: Record<FieldKey, HTMLElement | null>;
  private readonly highlights: HTMLElement[];
  private readonly suggestions: Suggestion[][];
  private readonly initialText: [HTMLElement, string][];
  private running: Step[] = [];

  constructor(readonly el: HTMLElement) {
    const t = (n: string) => target(el, "ShippingField", n);
    this.fields = Object.fromEntries(FIELD_KEYS.map((k) => [k, t(`${k}Field`)])) as Record<FieldKey, HTMLElement | null>;
    this.inputs = Object.fromEntries(FIELD_KEYS.map((k) => [k, t(`${k}Input`)])) as Record<FieldKey, HTMLElement | null>;
    this.highlights = HIGHLIGHT_KEYS.map((k) => t(`${k}AutoFillHighlight`)).filter((n): n is HTMLElement => n !== null);
    this.name = this.fields.name?.dataset.jsValue ?? "";
    this.suggestions = suggestionsByLength(this.isUS ? FINAL_US : FINAL_IE);
    this.initialText = FIELD_KEYS.map((k) => this.inputs[k])
      .filter((n): n is HTMLElement => n !== null)
      .map((n) => [n, n.textContent ?? ""]);
  }
  connect(): void {}
  disconnect(): void {
    this.running.forEach((s) => s.cancel());
    this.running = [];
    this.initialText.forEach(([n, t]) => (n.textContent = t));
    FIELD_KEYS.forEach((k) => this.fields[k]?.classList.remove(FOCUSED));
    this.highlights.forEach((h) => h.getAnimations().forEach((a) => a.cancel()));
  }
  private get autoComplete(): AddressAutoComplete | undefined {
    return childApi<AddressAutoComplete>(this.el, "AddressAutoComplete");
  }
  private track<T extends Step>(s: T): T {
    this.running = [...this.running.filter((r) => r.isPlaying), s];
    return s;
  }
  /** TypeAnimation:update handler: write the value; once 2+ address characters are typed, show suggestions. */
  private update(key: FieldKey, value: string): void {
    const input = this.inputs[key];
    if (!input) return;
    input.textContent = value;
    if (key === "firstAddressLine" && value.length >= 2) this.autoComplete?.setSuggestions(this.suggestions[value.length - 1] ?? [], value);
  }

  /** Clear every field and focus ring, hide the popover instantly, zero the autofill highlights. */
  resetAnimation(): Step {
    return this.track(
      new Group([
        new Exec(() => FIELD_KEYS.forEach((k) => this.inputs[k] && ((this.inputs[k] as HTMLElement).textContent = ""))),
        new Exec(() => FIELD_KEYS.forEach((k) => this.fields[k]?.classList.remove(FOCUSED))),
        new Exec(() => this.autoComplete?.hide(false)),
        ...this.highlights.map((h) => new Waapi({ el: h, keyframes: [{ opacity: 0 }], duration: 0, easing: "linear" })),
      ]),
    );
  }

  /** Type the name (90ms/char), move focus, type the start of the address (100ms/char), pick the suggestion,
   * autofill the rest and flash the autofill highlights (opacity .1 -> 0 over 1500ms). */
  playAnimation(): Step {
    const f = this.fields;
    const fill = this.isUS
      ? { firstAddressLine: "354 Oyster Point Blvd", city: "South San Francisco", state: "California", country: "United States", zip: "94080" }
      : { firstAddressLine: "1 Grand Canal Street Lower", city: "Dublin 2", state: "", country: "Ireland", zip: "D02 H210" };
    return this.track(
      new Sequence([
        new Exec(() => f.name?.classList.add(FOCUSED)),
        new Type({ endString: this.name, speed: 90, onUpdate: (v) => this.update("name", v) }),
        new Delay(300),
        new Exec(() => {
          f.name?.classList.remove(FOCUSED);
          f.firstAddressLine?.classList.add(FOCUSED);
        }),
        new Delay(300),
        new Type({ endString: this.isUS ? "354 Oyste" : "1 Grand Ca", speed: 100, onUpdate: (v) => this.update("firstAddressLine", v) }),
        new Delay(500),
        new Exec(() => {
          this.autoComplete?.hide();
          const set = (k: FieldKey, v: string) => this.inputs[k] && ((this.inputs[k] as HTMLElement).textContent = v);
          set("firstAddressLine", fill.firstAddressLine);
          f.firstAddressLine?.classList.remove(FOCUSED);
          set("city", fill.city);
          set("state", fill.state);
          set("country", fill.country);
          set("zip", fill.zip);
        }),
        new Group(this.highlights.map((h) => new Waapi({ el: h, keyframes: [{ opacity: 0.1 }, { opacity: 0 }], duration: 1500, easing: "linear" }))),
      ]),
    );
  }
}

export const shippingControllers = {
  ShippingField: classController("ShippingField", (el) => new ShippingField(el)),
  AddressAutoComplete: classController("AddressAutoComplete", (el) => new AddressAutoComplete(el)),
};
