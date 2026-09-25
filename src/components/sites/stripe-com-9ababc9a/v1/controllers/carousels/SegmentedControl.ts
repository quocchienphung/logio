// SegmentedControl — port of v1-chunk-AB4NMJVR.js.
// Click-driven tabs. Single-select mode: after the first click the button row becomes a solid pill
// layer whose clip-path slides from the old to the new button (350 ms, easeOutQuart); plain copies
// of the labels ("supporting" buttons) sit behind it and receive the clicks. Multi-select toggles
// SegmentedControlButton--active per button. Parents listen for SegmentedControl:buttonClicked /
// :changed / :buttonMouseEnter.
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, listen, prefersReducedMotion, target, targetList } from "../lib";
import { EASE_OUT_QUART, play } from "./util";

const SINGLE_ACTIVE = "SegmentedControl--singleModeActive";
const BUTTON_ACTIVE = "SegmentedControlButton--active";
const FOCUS_MIRROR = "SegmentedControlButton--focusMirror";
const MASK_MS = 350;

export interface SegmentedControlApi {
  readonly selectedIndices: number[];
  toggleButton(index: number): void;
}
interface OverflowApi {
  makeSureElementIsInView(el: HTMLElement, spacing?: number, mode?: "eager" | "lazy"): void;
}

export const SegmentedControl: Controller = (el) => {
  const N = "SegmentedControl";
  const buttons = targetList<HTMLButtonElement>(el, N, "buttons");
  const items = target(el, N, "items");
  const back = target(el, N, "backButtonContainer");
  if (!buttons.length || !items) return;

  const multi = el.dataset.selectionMode === "multi";
  const supporting: HTMLButtonElement[] = [];
  let selected: number[] = [];
  let mask: Animation | undefined;

  const cssNumber = (name: string) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;
  const spacingAround = () => cssNumber("--segmentedControlSpacing");
  const spacingBetween = () => cssNumber("--segmentedControlSpacingBetweenItems");
  const selectedButtons = () => selected.map((i) => buttons[i]);
  const indexOf = (b: EventTarget | null) => {
    const i = buttons.indexOf(b as HTMLButtonElement);
    return i >= 0 ? i : supporting.indexOf(b as HTMLButtonElement);
  };

  const insetFor = (b: HTMLElement, width: number, spacing: number, radius: number) =>
    `inset(0.5px ${width - b.offsetWidth - b.offsetLeft + spacing}px 0.5px ${b.offsetLeft - spacing}px round ${radius}px)`;

  const updateMask = (t: number) => {
    const from = buttons[selected[0] ?? 0];
    const to = buttons[t];
    const spacing = spacingAround();
    const radius = cssNumber("--segmentedControlBorderRadius");
    const width = items.offsetWidth;
    const a = insetFor(from, width, spacing, radius);
    const b = insetFor(to, width, spacing, radius);
    mask?.cancel();
    mask = play(items, [{ clipPath: a }, { clipPath: b }], { easing: EASE_OUT_QUART, duration: prefersReducedMotion() ? 0 : MASK_MS });
  };

  const syncAria = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(selected.includes(i))));

  const toggleButton = (t: number) => {
    const already = selected.includes(t);
    if (multi) {
      buttons[t].classList.toggle(BUTTON_ACTIVE, !already);
      selected = already ? selected.filter((i) => i !== t) : [...selected, t];
    } else {
      el.classList.add(SINGLE_ACTIVE);
      updateMask(t);
      selected = [t];
    }
    syncAria();
    const overflow = childControllers(el, "HorizontalOverflowContainer")[0];
    const api = overflow ? getApi<OverflowApi>(overflow, "HorizontalOverflowContainer") : undefined;
    api?.makeSureElementIsInView(buttons[t], spacingAround() + spacingBetween() + 40);
    if (!already) el.dispatchEvent(new CustomEvent("SegmentedControl:changed", { bubbles: true, detail: selected }));
  };

  const onClick = (e: MouseEvent) => {
    const index = indexOf(e.currentTarget);
    if (index < 0) return;
    const alreadyActive = selected.includes(index);
    toggleButton(index);
    const identifiers = selectedButtons().map((b) => b.dataset.jsIdentifier);
    el.dispatchEvent(new CustomEvent("SegmentedControl:buttonClicked", { bubbles: true, detail: { index, alreadyActive, identifiers } }));
  };
  const onEnter = (e: MouseEvent) => {
    const index = indexOf(e.currentTarget);
    if (index < 0) return;
    const identifiers = selectedButtons().map((b) => b.dataset.jsIdentifier);
    el.dispatchEvent(new CustomEvent("SegmentedControl:buttonMouseEnter", { bubbles: true, detail: { index, alreadyActive: selected.includes(index), identifiers } }));
  };

  const offs = buttons.flatMap((b) => [listen(b, "click", onClick), listen(b, "mouseenter", onEnter)]);

  if (!multi) {
    selected = [0];
    // Supporting labels behind the clipped pill layer (the container is aria-hidden, so they are
    // kept out of the tab order; keyboard users operate the original buttons).
    buttons.forEach((b) => {
      const s = document.createElement("button");
      s.innerText = b.innerText.trim();
      s.classList.add("SegmentedControlButton");
      s.tabIndex = -1;
      offs.push(listen(s, "click", onClick), listen(s, "mouseenter", onEnter));
      back?.appendChild(s);
      supporting.push(s);
    });
    // Once the pill layer is clipped, a focused original button is only visible inside the pill, so
    // its focus ring is mirrored onto the supporting copy that is visible in its place.
    buttons.forEach((b, i) => {
      offs.push(
        listen(b, "focus", () => supporting[i].classList.toggle(FOCUS_MIRROR, b.matches(":focus-visible"))),
        listen(b, "blur", () => supporting[i].classList.remove(FOCUS_MIRROR)),
      );
    });
  }
  syncAria();

  const ro = new ResizeObserver(() => {
    if (el.classList.contains(SINGLE_ACTIVE)) updateMask(selected[0]);
  });
  ro.observe(el);

  const api: SegmentedControlApi = {
    get selectedIndices() {
      return [...selected];
    },
    toggleButton,
  };
  exposeApi(el, N, api);

  return () => {
    offs.forEach((off) => off());
    ro.disconnect();
    mask?.cancel();
    supporting.forEach((s) => s.remove());
    el.classList.remove(SINGLE_ACTIVE);
  };
};
