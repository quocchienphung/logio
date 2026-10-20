# Gradient Floor as the Guide me page background

A blurred colour gradient that glows up from the bottom edge, rebuilt from the public preview at <https://www.affectui.com/motion/gradient-floor> (observed 2026-10-20) and used as the background of the whole selector page `/personalize?browse=1` (the user's choice). Only the rendered public preview was observed: the component's code, install and usage examples are behind affectUI's Pro gate and were neither read nor used. Nothing is loaded from or sent to that site (the QA proves it).

## Evidence

| Evidence | File |
| --- | --- |
| Page text, DOM, screenshots (light/dark, four frames) | `source-text.txt`, `source-dom.html`, `source-page.png`, `source-frame-*.png`, `source-dark.png` |
| 9 s of path data of both layers (125 ms steps) and the fitted waves | `path-samples.json` (probe: `scripts/forensics/gradient-floor-probe.mjs`; page: `-inspect.mjs`) |
| Pixel comparison of the still pose, reference vs ours, 804 x 360 | `comparison/*` (`scripts/forensics/gradient-floor-compare.mjs`) |
| QA screenshots | `qa/*` |

Measured and followed: two SVG layers anchored to the bottom edge, sized in 1/2200 of the container width so the floor scales with the width. Colour layer: vertical gradient `#FF7700 -> #FF0055 (30.3 %) -> #0073FF (67.3 %)` through a blurred path; light layer: the same contour at 0.8427 scale, white at 80 % with `mix-blend-mode: plus-lighter`. The SVGs are drawn at a quarter size, blurred a quarter as much (145.65 / 122.74 units) and scaled x4. Both layers drift sideways on a 2.5 s ease-in-out beat (colour -120 / +100 units, light -100 / +85). The contour's five heights are sine waves with a 3 s period (the `speed` prop): rim and shelf plateaus 565.8 +/- 80, left, right and middle 297.3 / 361.2 / 428.9 +/- 110, each with its own phase (fitted to the samples, rms 1-1.5 units on a 1500-unit drawing, 0.1 against the preview's first frame). One requestAnimationFrame loop paints it and pauses while the floor is off screen; with reduced motion it holds one still pose; the background is `--gf-bg` (`#fafafa`, dark `#111113`).

## Our code (written from scratch)

| File | Responsibility |
| --- | --- |
| `src/components/sites/affectui-gradient-floor/GradientFloor.tsx` | Component: `colors` (crest down), `speed` (seconds per loop, 0 = still), `className`, optional children above the floor |
| `gradient-floor-model.ts` (+ `.test.mjs`, 9 tests) | The five waves, path builder, measured canvas sizes, gradient stops, still pose |
| `gradient-floor.css` | Layer geometry, blur, drift keyframes, pause, dark and reduced-motion rules |
| `src/components/sites/guide-navigation/*` | Mounts it as `.guide-floor` behind the stage (`pointer-events: none`, `--gf-bg: #fdfdfd` to match the page) |

## Differences and decisions

- The pixel comparison is of the **still pose** (both with reduced motion): 0.01 % of pixels differ (31 px, the preview panel's rounded corners), mean channel difference 0.22 of 255. The moving shape is checked by sampling the path: 3 s period, amplitudes, light = colour x 0.8427, drift 2.5 s, pause/resume, in `scripts/qa/gradient-floor.mjs`. Phases of the waves were fitted from 9 s of samples, so motion matches within about one pixel of drawing rather than being bit-identical; the starting pose is the preview's first frame.
- The floor covers the whole page, so it rises behind the lower list rows; the docs of the effect warn that a bright floor competes with small text. The row names are bold and large, but the grey of inactive rows (`#858585`) is a little weaker over the pink: if it bothers you, lower the floor with `--gf-bg` or give the floor a height instead of `inset: 0`.
- Page-level `--gf-bg` is `#fdfdfd` (the page colour), not the effect's default `#fafafa`.
- Not tested on real devices; blur-heavy effects can be heavier on low-end phones (the quarter-size trick keeps it cheap, and it pauses off screen).

## QA

`node scripts/qa/gradient-floor.mjs [base-url]` (6 checks: layers/stacking/colours, morph period + amplitudes + light layer + drift, pause and resume, reduced motion, 8 sizes in both orientations, selector still works and nothing leaves localhost). `node --experimental-strip-types --test src/components/sites/affectui-gradient-floor/*.test.mjs` for the unit tests. `node scripts/forensics/gradient-floor-compare.mjs` repeats the pixel comparison.
