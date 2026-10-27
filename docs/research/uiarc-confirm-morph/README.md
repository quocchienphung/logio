# Confirm morph, hold mode (Skilled: Delete)

Observed 2026-10-23 on the public page <https://uiarc.dev/components/confirm-morph>. Only the rendered page was read: its documentation text, the DOM of its preview in every state, computed styles (light and dark), and what the preview paints every frame while real input drives it. No registry endpoint, install command, source tab, "Notes for AI" / markdown reference, production bundle, Pro source, prompt or API was used, and the app never requests UIArc at runtime. The code is independent: `src/components/sites/skilled/ui/ConfirmMorph.tsx`, `confirm-morph.css`, and the pure rules in `confirm-morph-model.ts` (tests: `confirm-morph.test.mjs`).

Used on `/skilled` as **Delete** on every skill card with `confirmMode="hold"`; see `docs/research/skilled-edit-delete/README.md`. Modes built: `press` and `hold`. The preview's `countdown` mode was not built (it was not asked for and its ring was not measured).

## What it is

A button that morphs in place into an inline question (prompt, Cancel, Confirm), then a spinner, then a result with Undo ("Deleted · Undo"), or an error face with Retry. Only the pill's width moves. In hold mode a solid copy of the Confirm button is revealed from the left as the button is held, and drains back if released early.

## Measured (traces outside the repository; fits in `fit.txt`, styles in `styles.json`, DOM per state in `states/`)

| What | Value |
| --- | --- |
| Hold | the fill (`clip-path: inset(0 X% 0 0 round 999px)` over a solid copy of the label) is a **straight line**: 0.0999-0.1004 %/ms, rms 0.1-0.3 %, **full in 996-1001 ms**. The question face turns into pending at the moment it fills (1012-1027 ms after the press, with the mouse and with Enter held). Used: 1000 ms |
| Early release | the fill drains on a critical spring, omega 18.5-21.7 rad/s (two recordings), empty in 315-394 ms. Used: 20 |
| Pill | width only. Opens (wider face) on a critical spring of 12.4 / 12.9 rad/s, closes (narrower face) on 15.6 / 16.6 rad/s: used 12.6 and 16. Natural widths in the preview: rest 145.6, question 266.6, pending 114.4, result 168.0, error 214.3 px (content dependent, so the build measures each face) |
| Parts | each part of a new face (prompt, Cancel, Confirm; or check + text, Undo) arrives in reading order, **0.22-0.23 s on `cubic-bezier(0.22, 1, 0.36, 1)`** from opacity 0 and a 4 px blur (tween fits better than a spring: rms 0.0012-0.0018), starting about 40-55 ms after the state change and 36 ms apart. The leaving face fades out in ~0.1 s where it stood |
| Result | disc (r 8 of 18, success green) pops from scale 0.5 on a critical spring of ~15 rad/s while it fades in (~0.14 s); the tick draws in ~0.22 s about 150 ms later |
| Undo | result -> pending ("Restoring") -> rest in about 0.5 s |
| Error | "Couldn't finish" + Retry (reruns the same handler) |
| Timeouts | an unanswered question returned to rest after **6.03 s**; a result stayed for the 14 s observed |
| Geometry | pill 36 px, radius 9999, `0 1px 2px oklch(0 0 0 / 0.035)` (dark 0.18); trigger padding 0 16 0 14, gap 8, 14 px / 500, icon 16 px muted; prompt padding 0 8 0 12; Cancel and Confirm 28 px high, padding 0 12; face padding 0 4, gap 2 |
| Colour | Confirm: danger `oklch(0.54 0.21 25)` text on 13 % of it (hover 18 %, while held 22 %), the fill solid danger with white text; dark `oklch(0.76 0.2 25)` with `oklch(0.19)` text. Cancel muted (0.46), hover 7 % ink; trigger hover 5 % ink; surface white (dark 0.24) |

From the documentation text (implemented, not measured by me): a press within 280 ms of the question opening and auto-repeated keys never confirm; Confirm takes focus when the question opens, the root while pending, Undo or Retry on a result, the trigger back at rest; Escape cancels a question and dismisses a result; a press outside cancels the question; timeouts pause while the pointer rests on the control and while the tab is hidden; in hold mode the button is described as "Press and hold" and letting go early announces that it needs a longer hold; reduced motion removes the width spring, blur and draw, but the hold fill still shows progress.

## Adaptations and gaps (honest)

* `size="sm"` (32 px pill, 24 px buttons, 13 px type) is mine, for the dense card row; the preview has one size (36 px, `size="md"`).
* The result stays until dismissed in the preview; `resultTimeout` (default 0 = stays) exists for hosts, and Skilled passes 8 s.
* In hold mode a press-and-release shorter than the hold does nothing; a pointer that leaves the button cancels the hold (a choice for a destructive control; the preview's behaviour for a drag off the button was not recorded). A screen reader's synthetic click does not confirm in hold mode.
* The two recordings differ by a few percent in the springs; the constants are their means. The error face's width and the exact Undo failure behaviour were not recorded (a failed Undo leaves the result in place).
* `InteractionRuntime` skips this component (`data-interaction-own`), so the shared press scale does not apply to Cancel / Confirm.
