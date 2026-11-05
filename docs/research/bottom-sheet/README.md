# Bottom sheet (clone engine)

Source of the idea: the public preview of UIArc's **Bottom sheet** (`https://uiarc.dev/components/bottom-sheet`). Only the rendered page was read: visible text and the
behaviour notes printed on it, the DOM and the declared CSS of the sheet, computed styles, screenshots and **frame-by-frame recordings** of opening, dragging,
rubber-banding, releasing, flicking, keyboard control and dismissal (`source/`). No API, registry, Code tab, bundle or prompt was fetched and no source was copied;
`src/components/sites/bottom-sheet/` is written from those measurements.

## Method

1. **Record**: `bottom-sheet-inspect.mjs` (states, DOM, CSS, keyboard, dismissals), `bottom-sheet-drag.mjs` (a sweep of drags with known pointer paths: follow, rubber band,
   releases at rest, flicks of controlled speed), `bottom-sheet-detents.mjs` (where it rests for seven viewport sizes), `bottom-sheet-live.mjs` (live region, scroll lock, focus order).
2. **Fit**: `bottom-sheet-fit.mjs` fits the settle, opening and dismissal springs and reads the backdrop curve; the rubber band and the release rule were fitted from the sweeps
   (see below). Results in `source/spring-fit.json` and `drag-*.json`, pinned in `sheet-model.ts` and tested in `sheet-model.test.mjs` against the recorded numbers.
3. **Validate**: `scripts/qa/bottom-sheet.mjs` drives our sheets with real pointer input and compares them with the recordings.

## Measured values

| What | Measured | Used |
| --- | --- | --- |
| Layout | `min(100%, 36rem)` wide, `calc(max * 100dvh + 160px)` tall, anchored 160px **below** the viewport (so a drag past the top never shows a gap), radius 34px, header `8px 20px 16px` (16px under 40rem), grabber 56x20 with a 36x5 bar, title 18px/500, close 32px circle, body `4px 20px 24px` | `bottom-sheet.css` |
| Position | one value `y` (translateY): 0 is the tallest detent, rest = `(max - detent) * vh`, closed = `max * vh + 40`. In the preview the default detent shows 0.46 of the viewport at every height tested (600 to 1200px) | `layout()` |
| Backdrop | a function of position, not a timer: 1 at the tallest, **.78 at the smallest detent**, 0 when closed, linear between (the kink is at the smallest detent); `oklch(16% 0 0 / .34)`, dark `oklch(0 0 0 / .52)` | `backdropOpacity()` |
| Drag | the sheet follows the pointer 1:1 within its range; above the tallest detent an iOS-style rubber band, `x = D * (1 - 1 / (c * d / D + 1))` with c 0.6, D 116 (recorded 100px to 40, 320 to 72, 640 to 89.5; ours 39.5 / 72.3 / 89.1) | `followPointer()` |
| Release | the position projected **0.6s** along the release velocity, then the nearest of the detents and the closed position. At rest this puts the thresholds at the middle of each gap (recorded: 220 stays tall, 240 returns; 710 stays, 760 dismisses). A flick needs about 330-360px/s over 30px; a 1015px/s flick down from the tallest still only reaches the smallest detent | `resolveRelease()` |
| Springs | between detents stiffness 160, damping 25 (ratio 0.98, rmse 0.003-0.007 over 14 releases); dismissal 290 / 33.4 (rmse 0.0015), unmounted when it has settled, ~660ms; opening uses the settle spring (the recorded opening stalls 100ms mid-way, so it is not used for fitting) | `SHEET_SPRING` |
| Behaviour | header drags with any pointer; a finger on the content drags the sheet until it is fully open, then the content scrolls; grabber: ArrowUp/Down one detent, Home tallest, End smallest, Enter/Space toggle; Space/ArrowDown/PageDown on the sheet open it fully first; Escape and backdrop close; focus trap; focus returns to the opener; the page behind is inert and the body scroll is locked; live region "Sheet expanded" / "Sheet collapsed" | `BottomSheet.tsx` |

Fit quality in our QA: close curve rmse 0.0095 against the recording (gone 618ms after it starts moving, recording 659ms); opening rmse 0.009 against the fitted spring; rubber
band within 0.6px of the recorded 100/320/640px readings; every recorded release decision is reproduced by the model (`sheet-model.test.mjs`).

Not observable from the public page: whether the rubber band's `D` scales with the viewport (measured at 1000px only; a constant 116 is used), the exact velocity estimator
of the source (ours: the last three pointer samples inside 100ms; the threshold ~330-360px/s came out of that estimator), the backdrop value for a sheet with a single detent
(.78 is used at its only stop), and the reduced-motion timings (a 120ms fade is used).

## What it became here

* `BottomSheet` takes `open`/`onOpenChange`, `title`, `description`, `detents` (default `[0.45, 0.92]`), `initialDetent`, `onDetentChange`, `closeLabel`, `returnFocus`, and a
  `useBottomSheetClose()` hook for buttons inside it. It takes the theme of the page it opened from (it lives in the body). There is no `trigger` prop: the page owns the opener.
* On the Process page the **Saved processes** and **New process** dialogs are bottom sheets (`ProcessSheets.tsx`): detents `[0.5, 0.9]` and `[0.55, 0.92]`. Opened from the
  split button in the name pill (see `docs/research/split-button/`). Deleting a process is inline (Confirm morph, no dialog); in the Saved processes sheet the row's trash icon unfolds into the question.
* The page is given back (inert, scroll lock, focus) as soon as the sheet starts to leave, not when its spring has finished.

## QA

`node scripts/qa/bottom-sheet.mjs [base-url]` (16 checks: opening and closing against the recordings, 1:1 drag, rubber band, releases at rest and by flick, keyboard, focus trap,
live region, backdrop, dark, a phone finger on the content, reduced motion). `npm test` covers `sheet-model.test.mjs`.
