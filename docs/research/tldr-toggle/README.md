# TL;DR toggle (clone for Flip)

Source: the open preview of UIArc's **TL;DR toggle** (`https://uiarc.dev/components/tldr-toggle`, a Pro component). Only the rendered page was read: the DOM in every
state, the declared CSS, the public docs (API reference, Keyboard, Accessibility, Motion, Responsive, Performance) and recordings of the preview running. No
registry, bundle or Pro source was read and nothing was copied from one. The code is ours: `src/components/sites/flip/TldrToggle.tsx`, `tldr-toggle.css`,
`tldr-model.ts` (pure), `primitives.tsx` (segmented control, slider, tooltip, shimmer, button).

## Evidence (`source/`)
`visible.txt` (page text and docs), `declared-styles.css` (72 rules), `shared-*/declared-styles.css` (segmented control, slider, text shimmer, button, avatar),
`dom-*.html` (full, summary, points, streaming, stopped, error, slider dragging, regenerate hover…), `timeline-*.json` (DOM mutations, `document.getAnimations()`
and per-frame samples). Scripts: `scripts/forensics/tldr-toggle-timeline.mjs`, `-2`, `-3`, `tldr-toggle-motion.mjs`.

## Measured in the recordings, and what this build does (same method on both: time from the first 1% of movement)
| What | Recorded | This build (`scripts/qa/flip.mjs`, dev server) |
|---|---|---|
| chunks | 3 to 8 words, one every 30 to 40 ms (31 to 41 observed) | fields in groups of 3 to 8 for delimited text, words otherwise; mean 33.6 to 35.9 ms, min 31 ms |
| thinking before the first chunk | 700 ms (+ swap) | about 790 ms from the click |
| chunk fade | 140 ms `cubic-bezier(.22,1,.36,1)` | 140 ms (`tt-fade`) |
| view swap | old out 100 ms, new in 160 ms | 100 / 160 ms |
| card height | one critically damped spring, t50 67 ms, t90 183 ms | t50 67 to 84 ms, t90 183 ms, no overshoot |
| mode pill | spring, t50 112 ms, t90 288 ms | stiffness 160, damping 25.6: t50 114 to 120, t90 297 to 300 |
| slider thumb / fill | spring, t50 67 ms, t90 183 ms | stiffness 360, damping 38: t50 66 to 83, t90 183 to 200 |
| readout digits | each digit a column, glyph at (digit - value) em x 1.05, opacity 1 - |y|^1.5, blur 3 px per step; entering characters 700 ms spring opacity + 240 ms blur 4 to 0, leaving 120 ms ease-out blur 2 | same formulas, the column value follows the thumb's spring; "6 to 8 counts through 7" is a check |
| bubble | opens on press (scale .6 to 1, 6 px rise, fast spring), stays about 0.7 s after release, 120 ms exit | same; leaves 0.83 s after release |
| jump | waits for the height to settle (about 97%), highlight in 160 ms, out 600 ms after 1.8 s, focus moves to the paragraph | highlight 456 to 459 ms after the click (recorded 426), same fades |
| results | cached per mode and length, a saved result appears whole | same (a check) |
| Stop | Escape stops a running stream and keeps what arrived | same; works while focus is in the card or nowhere |

## Inferred (not read directly)
Which easing the pill uses (fitted: critically damped, omega 12.6); the thumb follows the pointer 1:1 while held and settles on a spring at release (the recording
of a fast scripted drag is ambiguous); the opacity curve of a rolling digit (fitted to 40 samples); the tooltip look (read off a screenshot).

## Not cloned
The "Simulate a failure" switch (outside the component in the preview), the sample article and its authored summaries, the Radix tooltip (own `Tip` in the body),
the Copy button's own component (an icon swap with the same states), Claude's mark. The LLM is never called: `summarize` is whatever the caller passes.

## Adapted for Flip
Mode labels `Sheet / CSV (or TSV…) / Notes`, the slider counts lines of the delimited text (4, 6, 8, 11, 13) or notes (3 to 7); the "article" is the first 13 rows of the
sheet as the reader serves them, each row a paragraph with its own Excel row number; the summary is the real delimited text, the key points are facts computed
from the cells (`flip-plan.ts`, each tied to the first row it comes from, and each jump goes back to that row). `layout="lines"` draws delimited text as it is, in a
fixed-width face, scrolling sideways instead of widening the card.
