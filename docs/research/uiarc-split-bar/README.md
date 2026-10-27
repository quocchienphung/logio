# Split bar under the Activity terrain (Repo)

Added 2026-10-23. Source of the idea: the public docs page <https://uiarc.dev/components/split-bar> ("Split bar", a Pro component of UIArc; its source and install are gated, its preview is open). Everything here was **measured from what that preview paints in a real browser** (text, DOM, computed style, and the clip-paths/transforms it writes every frame). No UIArc API, registry, CLI, MCP, downloaded bundle or Pro source was used. The code is an independent build on this workspace's tokens.

Code: `src/components/sites/skilled/split-bar/` (`SplitBar.tsx`, `split-bar-model.ts`, `split-bar.css`, `split-bar.test.mjs`); the Repo wiring is in `src/components/sites/skilled/terrain/` (`terrain-breakdown.ts`, `ActivityTerrain.tsx`, `terrain-engine.ts` `setFocus`, `terrain-draw.ts` `dim`). QA: `node scripts/qa/split-bar.mjs` (48 checks, screenshots in `qa/`). Unit tests: `npm test`.

## What it does on this page

Under "The shape of your week" the card now has **Where the week went**: one 100 % bar that splits whatever the terrain is showing (Operations, Deliveries or Errors, your activity or the sample week) three ways, chosen with *Split the week by*:

| Split | Parts | Notes |
| --- | --- | --- |
| Day | Mon to Sun | |
| Time of day | Night 00-06, Morning 06-12, Afternoon 12-18, Evening 18-24 | workspace clock (UTC+7), as the terrain |
| Action | Import, Save, Export, Transfer | only for the workspace's own week: the sample week is numbers by hour and has no actions |

The bar and the terrain are one instrument, so the bar is what makes the terrain readable:

* **Hover / arrow / legend on a part** lights its hours in the terrain: every other column fades 70 % of the way to the platform colour, on the bar's own spring (`terrain-engine.ts`, `FOCUS_*`).
* **An hour highlighted in the terrain** (pointer, keyboard, fly) lights the part of the bar that holds it (for Action: the action that counted most in that hour).
* **Switching a part off** (legend click, or Enter on the highlighted part) leaves those hours out of the terrain: its columns fold flat with the terrain's own "metric change" wave, and the total, change on last week, peak hours and busiest day follow what is still shown ("Operations in view", note "Left out of the terrain: Sat, Sun" with *Show all*). The numbers underneath are never changed; zero-value parts are not listed. The last visible part cannot be switched off.
* Changing the split, or the data source, starts again from the whole week.

Every number comes from the same recorded `skill-events` (or the labelled sample week); the three splits each add up to the terrain's total (tested for every metric).

## Measured from the preview

| What | Value | Where |
| --- | --- | --- |
| Edges | one critically damped spring; ω fitted per scenario (hide 14.0-14.1, show 14.0, hover 15.1, period change 14.6-14.8 rad/s, rms 0.6-1.4 % of the travel); settles in 330-500 ms. Used: stiffness 210, damping 29 (ω 14.49) | `fit.txt`, `SplitBar.tsx` `EDGE` |
| Hover | the part widens to `max(share + 4.5 % of the bar, what its name and share need)`, the others scale by `(1 - w) / (1 - s)` (recorded: Direct 24.8 -> 29.3 %, Organic 41.6 -> 39.08 %, Social to 14.68 % for its label); others dim to opacity 0.5 in 0.24 s | `split-bar-model.ts` `layoutSpans`, test |
| Fills | rest = 42 % of the part's colour over the surface, highlighted = 62 %; background 0.16 s, opacity 0.24 s, `cubic-bezier(0.22, 1, 0.36, 1)` | `split-bar.css` |
| Geometry | bar 44 px, radius 12; parts are full-width layers cut by `clip-path: inset(... round 4px)`, 1 px gap each side of a cut; 3 px cap at each part's right edge; labels inside the clipped layer, 10 px from the part's left edge | `SplitBar.tsx` `Layer` |
| Labels | name + share inside when the part is at least `name + share + 35 px` wide, share alone from 56 px, otherwise on the lane under the bar. Fitted over eight widths (1440 to 390 px, 40 decisions) and reproduced by the test; the 340 px row is not used (the preview's own layout breaks there) | `labelMode`, `labels-fit.json` |
| Lane | 40 px high, opens and closes on the spring; labels 18 px down, 12 px type, kept 16 px apart and 4 px from the bar's end (recorded 506.9 and 600.0 px, reproduced within 1.5 px); leader `M ax 0 C ax 10 lx 6 lx 15`, 1 px, `border-strong` | `placeOutside`, `leaderPath` |
| Readout | the total and the highlighted part swap in turn (wait mode): the old line rises 6 px and goes, the new one enters from 6 px down with a 2 px blur, 0.24 s; name 14 px, share 18 px / 500, value + unit muted | `SplitBar.tsx` |
| Legend | 32 px items, padding 6 / 10 / 6 / 8, radius 10, hover background = the track; swatch 12 px with a 3 px edge; off: hollow swatch, struck name, "Off" | `split-bar.css` |
| Digits | the same odometer as the terrain's counters (`AnimatedNumber`, whose structure matches the preview's digit wheels) | `terrain/AnimatedNumber.tsx` |
| Keys | arrows / Home / End move the highlight, Enter or Space switches the highlighted part off, Escape clears; polite live region ("Other hidden.", "Organic search is the only share shown, so it stays on.") | `onKeyDown` |

## Chosen here, not measured

* **Colour.** The preview colours its parts with four hues and two neutrals. This workspace is monochrome (`docs/research/MONOCHROME_SYSTEM.md`), so parts use a seven-step grey ramp by OKLab lightness (and red for Errors), lighter-to-darker in light theme and the reverse in dark; the cap, legend swatch and the name keep every part identifiable without hue.
* **Hit testing.** The part under the pointer is decided on the un-widened layout, except that the highlighted part keeps the pointer while it is inside its own widened extent (no flicker at seams).
* **Entry and exit.** The preview's first paint and a change of ids were not recorded. Parts open from nothing where they will stand; a part that leaves the data folds up where it stands (380 ms) and fades. Outside labels fade in 0.24 s.
* **Terrain fade.** 70 % toward the platform on the bar's spring: designed for this page, not taken from any source.
* **Refusal shake** of the last visible legend item: the preview's shake could not be observed (no transform or Web Animation appeared on any element during the recorded click), so the amplitude (3 px, 0.32 s) is mine.
* **Odometer direction** and the percent texts follow `AnimatedNumber`, not a measurement of the preview's digit timing.

## Method (scripts in `scripts/forensics/`, rendered page only)

`uiarc-split-bar-inspect.mjs` (docs text, DOM, computed styles, screenshots) -> `uiarc-split-bar-motion.mjs` (per-frame clip-paths, caps, labels, readout while hovering, toggling, switching period, arrowing; raw traces are about 400 KB each and stay out of the repository: set `SPLIT_BAR_TRACES`) -> `uiarc-split-bar-fit.mjs` (spring fit, output in `fit.txt`) -> `uiarc-split-bar-legend.mjs` (legend, swatch, label, leader, readout styles in rest / hovered / off states, `legend-measure.json`) -> `uiarc-split-bar-labels.mjs` (label decisions at eight widths, `labels-fit.json`) -> `uiarc-split-bar-shake.mjs` (looked for the refusal shake: none found).

## Verification (2026-10-23, Chrome on this machine)

* `npm test` 375 pass (11 for the split-bar model, 7 for the breakdown, the 13 terrain tests unchanged and still passing), typecheck and lint clean.
* `node scripts/qa/split-bar.mjs` 48/48: shares fill the bar, hover widens by 4.5 points and the terrain fades, legend toggles collapse in place and the terrain total follows, the last part refuses, keyboard, terrain-to-bar link, the three splits, Errors in red, edge spring ω 16.2 on a 1.4-point travel (the recorded range for the preview is 14.0-15.7), sample week outside labels never overlap and stay inside the bar, empty week, reduced motion lands at once, phone 390 px (no overflow, tap highlights, tap elsewhere clears), dark theme, no console errors.
* `node scripts/qa/repo.mjs` 22/22 still passes.

## Limits (honest)

* Not tried: a physical phone, Safari/WebKit (the terrain engine was checked there earlier; the split bar uses `color-mix`, `oklch`, `clip-path`, all in current WebKit but not run here), a screen reader, wider cards than 1180 px.
* `scripts/qa/terrain.mjs` still opens `/skilled` (where the terrain used to be); it was already stale before this work.
* With real data concentrated in one day or one part of the day the bar is one whole part, which is what the data says.
