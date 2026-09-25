// "Choose your merchant of record coverage" dashboard graphic (page bundle module 83758:
// MerchantOfRecordGraphic `ar` + MerchantOfRecord `ai`).
//
// When the desktop graphic is first >=50% visible it plays, once, a filter demo on the table:
//   reset (transitions off, rows at natural height) -> "Managed Payments" chip spotlight (a conic sweep
//   rotates behind the chip, 1.4s) -> 600ms -> chip engages (fills, "+" becomes "-") while the
//   Refunded and Failed rows fade (0.5s) and collapse (max-height 0.9s cubic-bezier(.25,1,.5,1))
//   -> 900ms -> the replay button fades in.
// Replay (button) first re-expands the rows (900ms) and then runs the same sequence. A newer run
// cancels an older one at its next step. Transition timings live in the page CSS.
// With prefers-reduced-motion the graphic shows the filtered end state without the sequence.
//
// The table's dates are formatted in the viewer's time zone on the client (the server render used UTC).

import { type Cleanup, combine, listen, observeIntersection, prefersReducedMotion } from "../shared/runtime";

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Transaction timestamps (UTC ms) and refunded dates, in table order (module 83758 `ae`). */
const ROWS: [number, number | null][] = [
  [Date.UTC(2024, 8, 23, 8, 1), null],
  [Date.UTC(2024, 8, 20, 16, 6), null],
  [Date.UTC(2024, 8, 7, 9, 15), null],
  [Date.UTC(2024, 7, 25, 11, 40), Date.UTC(2024, 5, 17, 14, 22)],
  [Date.UTC(2024, 6, 21, 10, 23), null],
  [Date.UTC(2024, 6, 6, 19, 45), null],
  [Date.UTC(2024, 5, 17, 14, 22), null],
  [Date.UTC(2024, 4, 29, 15, 43), null],
  [Date.UTC(2024, 4, 4, 12, 5), null],
  [Date.UTC(2024, 3, 17, 23, 23), null],
];

function localizeDates(graphic: HTMLElement, locale: string): Cleanup {
  const fmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const rows = Array.from(graphic.querySelectorAll<HTMLElement>(".merchant-of-record-graphic__row:not(.merchant-of-record-graphic__row--header)"));
  const touched: [HTMLElement, string][] = [];
  rows.forEach((row, i) => {
    const data = ROWS[i];
    if (!data) return;
    const cells = row.querySelectorAll<HTMLElement>(".merchant-of-record-graphic__cell--date");
    data.forEach((ts, j) => {
      const cell = cells[j];
      if (!cell || ts === null) return;
      touched.push([cell, cell.textContent ?? ""]);
      cell.textContent = fmt.format(new Date(ts));
    });
  });
  return () => touched.forEach(([c, t]) => (c.textContent = t));
}

export function mountMerchantOfRecord(section: ParentNode, locale = "en-US"): Cleanup {
  const graphic = section.querySelector<HTMLElement>(".merchant-of-record-graphic-switch--desktop");
  if (!graphic) return () => {};
  const chip = graphic.querySelector<HTMLElement>(".merchant-of-record-graphic__filter-chip--active");
  const bar = chip?.querySelector<SVGElement>(".merchant-of-record-graphic__filter-icon-bar--vertical") ?? null;
  const collapses = Array.from(graphic.querySelectorAll<HTMLElement>(".merchant-of-record-graphic__row-collapse"));
  const replay = section.querySelector<HTMLButtonElement>(".merchant-of-record-graphic-frame__replay-button");

  const state = { engaged: false, resetting: false, spotlight: false, minus: false };
  const render = () => {
    chip?.classList.toggle("merchant-of-record-graphic__filter-chip--engaged", state.engaged);
    chip?.classList.toggle("merchant-of-record-graphic__filter-chip--resetting", state.resetting);
    chip?.classList.toggle("merchant-of-record-graphic__filter-chip--spotlight", state.spotlight);
    bar?.classList.toggle("merchant-of-record-graphic__filter-icon-bar--minus", state.minus);
    for (const c of collapses) {
      c.classList.toggle("merchant-of-record-graphic__row-collapse--exiting", state.engaged);
      c.classList.toggle("merchant-of-record-graphic__row-collapse--resetting", state.resetting);
    }
  };
  const setMaxHeight = (v: string | "natural") => collapses.forEach((c) => (c.style.maxHeight = v === "natural" ? `${c.scrollHeight}px` : v));
  const showReplay = (v: boolean) => replay?.classList.toggle("merchant-of-record-graphic-frame__replay-button--visible", v);

  let run = 0;
  let disposed = false;
  const play = async (reverse = false) => {
    run += 1;
    const id = run;
    const live = () => !disposed && run === id;
    showReplay(false);
    if (prefersReducedMotion()) {
      Object.assign(state, { engaged: true, resetting: false, spotlight: false, minus: true });
      render();
      setMaxHeight("0px");
      showReplay(true);
      return;
    }
    if (reverse) {
      state.engaged = false;
      state.minus = false;
      render();
      setMaxHeight("natural");
      await wait(900);
      if (!live()) return;
    }
    Object.assign(state, { resetting: true, engaged: false, minus: false });
    render();
    setMaxHeight("");
    await wait(0);
    if (!live()) return;
    setMaxHeight("natural");
    await wait(0);
    if (!live()) return;
    Object.assign(state, { resetting: false, spotlight: true });
    render();
    await wait(1400);
    if (!live()) return;
    state.spotlight = false;
    render();
    await wait(600);
    if (!live()) return;
    Object.assign(state, { engaged: true, minus: true });
    render();
    setMaxHeight("0px");
    await wait(900);
    if (!live()) return;
    showReplay(true);
  };

  let started = false;
  return combine([
    localizeDates(graphic, locale),
    observeIntersection(
      graphic,
      (v) => {
        if (v && !started) {
          started = true;
          void play();
        }
      },
      { threshold: 0.5 },
    ),
    replay ? listen(replay, "click", () => void play(true)) : undefined,
    () => {
      disposed = true;
    },
  ]);
}
