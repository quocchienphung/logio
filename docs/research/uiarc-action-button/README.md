# Action button (Skilled: Save changes)

Observed 2026-10-23 on the public page <https://uiarc.dev/components/action-button>. Only the rendered page was read: its documentation text, the DOM of its preview, computed styles, and what the preview paints every frame while real input drives it. No registry endpoint, install command, source tab, "Notes for AI" / markdown reference, production bundle, Pro source or API was used, and the app never requests UIArc at runtime. The code is independent: `src/components/sites/skilled/ui/ActionButton.tsx` + `action-button.css`.

Used on `/skilled` as **Save changes** in the skill editor (`SkillEditor.tsx`); see `docs/research/skilled-edit-delete/README.md`.

## What it is

A call-to-action button with a trailing arrow that runs an async action and morphs on the button itself: idle ("Save changes →") → pending ("Saving", spinner, `aria-busy`, still focused) → success ("Saved", a check that draws itself) → back to idle. The pending state lasts until the promise settles; a rejection returns the button to idle and reports the error to the caller.

## Measured (traces kept outside the repository, `UIARC_TRACES`; fits in `fit.txt`, styles in `styles.json`)

| What | Value |
| --- | --- |
| Timeline | press -> pending 5-10 ms after the click; pending lasted 431 ms (the demo's own delay); success stayed **2.40 s** before idle (2401 ms; used as the default `resetAfterMs`) |
| Geometry | 44 px high, radius 18, padding 0 20, border 1 px of its own colour; 14 px / 500, letter-spacing -0.16 px; content gap 8; arrow 17 px, stroke 2. Light: ink background, white text. Dark: near-white background, dark text |
| States | hover (fine pointers only): `0 1px 2px oklch(0 0 0 / 0.035)` over 0.16 s; focus-visible ring 2 px at 72 % ink, offset 2 px; colours, border, shadow and opacity ease over 0.16 s on `cubic-bezier(0.22, 1, 0.36, 1)` |
| Label | the leaving text fades in ~0.1 s, the entering text rises from 2 px below while it fades in over ~0.13 s (tween on the curve above fits better than a spring: rms 0.003 to 0.009) |
| Width | only the label's width springs, critical omega **27-28 rad/s** idle -> pending and success -> idle (rms 0.9 to 1.7 %), 17.5 for the small pending -> success change |
| Icons | the arrow leaves forward (to x +8 px) while it fades and blurs 2 px; the new icon enters from scale 0.6 and a 2 px blur over ~0.14 s, scale on a spring of roughly 22 rad/s (rough fit); coming back the arrow arrives from x -6 px; the check's tick draws (stroke-dasharray, pathLength 1) in ~0.22 s starting ~75 ms after the change |
| Press | scale **0.97**, down in ~110 ms; released, it returns on a spring of about 19.5 rad/s |
| Repeats | a second press while pending is ignored; keyboard Enter behaves the same and focus stays on the button |

From the documentation text (not measured by me): the visible label is `aria-hidden` and a visually hidden copy names the button; a `role="status"` region announces the pending and success labels; reduced motion drops the press scale, width spring and stroke draw and swaps with a quick fade.

## Adaptations and gaps (honest)

* `size="sm"` (36 px high, radius 14, padding 0 16) is mine, for the editor's footer; the preview has one size (44 px, `size="md"`).
* The spinner is a plain ring (the pending icon was not read from the DOM); the pending -> success scale fit is rough (rms about 6 %).
* The preview has no failing demo: the error behaviour (back to idle, caller notified) is the documented one, not an observed one.
* The shared `InteractionRuntime` also animates any button's width and press by itself. It would fight this component's own springs (it pinned the Save button at 112 px for 0.6 s in the first QA run), so it now skips anything inside `data-interaction-own`, which both new components set.
* Colours come from the workspace tokens (`--sk-ink`, `--sk-surface`), not the preview's.
