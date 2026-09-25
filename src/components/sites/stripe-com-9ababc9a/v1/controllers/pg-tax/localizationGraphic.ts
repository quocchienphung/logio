// TaxLocalizationGraphic — port of v1-LocalizationGraphic-EROJWZJK.js.
// A receipt that shows prices "excluding tax" / "including tax" depending on the child
// SegmentedControl. Once 80 % visible it waits 2 s, then toggles the control every 5 s. A user click
// stops the autoplay and restarts it 10 s later.
import type { Controller } from "../types";
import { childControllers, getApi, listen, targetList } from "../lib";
import { Clock, disableAmbientAnimations, gateClock, scrollObserver } from "./motion";

const FIRST_CHANGE_MS = 2000;
const CHANGE_EVERY_MS = 5000;
const RESUME_AFTER_CLICK_MS = 10000;

/** The SegmentedControl port's API (carousels group); both reference and port member names accepted. */
export interface SegmentedControlLike {
  readonly selectedIndices?: number[];
  readonly selectedButtonIndices?: number[];
  toggleButton(index: number): void;
}

export function segmentedControlApi(root: Element): SegmentedControlLike | undefined {
  const node = childControllers(root, "SegmentedControl")[0];
  return node ? getApi<SegmentedControlLike>(node, "SegmentedControl") : undefined;
}

export function selectedIndex(api: SegmentedControlLike | undefined, fallback: number): number {
  return (api?.selectedIndices ?? api?.selectedButtonIndices ?? [fallback])[0] ?? fallback;
}

export const TaxLocalizationGraphic: Controller = (el) => {
  const N = "TaxLocalizationGraphic";
  const excludes = targetList(el, N, "excludesTax");
  const includes = targetList(el, N, "includesTax");
  const initial = [...excludes, ...includes].map((n) => [n, n.hasAttribute("hidden")] as const);
  let localIndex = 0; // used only when the SegmentedControl port is absent

  const apply = (t: number) => {
    localIndex = t;
    excludes.forEach((n) => n.toggleAttribute("hidden", t === 1));
    includes.forEach((n) => n.toggleAttribute("hidden", t === 0));
  };

  const offs: (() => void)[] = [
    listen(el, "SegmentedControl:changed", (e) => {
      const detail = (e as CustomEvent<number[]>).detail;
      if (Array.isArray(detail)) apply(detail[0] ?? 0);
    }),
  ];

  const clock = new Clock();
  let cancelChange: (() => void) | undefined;
  let cancelRestart: (() => void) | undefined;

  const nextStateChange = () => {
    const api = segmentedControlApi(el);
    const t = selectedIndex(api, localIndex) === 1 ? 0 : 1;
    if (api) api.toggleButton(t);
    else apply(t);
    cancelChange = clock.after(CHANGE_EVERY_MS, nextStateChange);
  };

  offs.push(
    listen(el, "SegmentedControl:buttonClicked", () => {
      if (disableAmbientAnimations()) return;
      cancelChange?.();
      cancelRestart?.();
      cancelRestart = clock.after(RESUME_AFTER_CLICK_MS, nextStateChange);
    }),
  );

  if (!disableAmbientAnimations()) {
    offs.push(
      scrollObserver(el, 0.8, () => {
        cancelChange?.();
        cancelChange = clock.after(FIRST_CHANGE_MS, nextStateChange);
      }, undefined, true),
      gateClock(clock, el),
    );
  }

  return () => {
    offs.forEach((off) => off());
    clock.dispose();
    initial.forEach(([n, hidden]) => n.toggleAttribute("hidden", hidden));
  };
};
