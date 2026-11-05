# Public UIArc observations

Inspected 2026-11-02 with the repository's clone-website workflow. Source pages:

- https://uiarc.dev/components/hold-to-confirm
- https://uiarc.dev/components/prompt-cache

Only public rendered previews, DOM, declared CSS, computed styles, documentation and calls to `Element.animate` were observed. Prompt cache's implementation is Pro gated; its Code tab, registry, private APIs and production JavaScript bundles were not read. These captures are reference evidence, not component source.

Reproduce with `node scripts/forensics/queue-arc-inspect.mjs`, then `node scripts/forensics/queue-arc-fit.mjs`. The second command checks the fitted curves against the frame samples. Raw per-frame JSON is gzip compressed; `node:zlib.gunzipSync` reads it. Screenshot-only styles hide everything outside the preview so sticky library navigation does not cover its contents. DOM/style measurements and motion recording are performed without that screenshot style.

## Hold to confirm

Observed desktop geometry: button 44px high, 18px corner radius, 20px horizontal padding, Inter 14px/19.6px at weight 500, 18px icon and 8px face gap. The initial label has a 90.8594px measured width; after confirmation it has a 50.4688px width. The button as a whole changes from 158.8594px to 118.4688px for the preview's English labels.

The public docs specify a 1200ms default hold. Captured frames show linear progress via `clip-path`, a press scale of .97, an early-release rewind and a drawn check with the confirmed label. A keyboard Space hold was used for the completion recording; a mouse hold released after 540ms was used for the rewind recording. The docs also specify Enter, pointer capture, cancellation beyond 24px outside, cancellation on blur, quick re-press resumption, reduced motion and optional touch vibration. These latter contracts are documented observations, not all independently tested on physical devices.

Recorded label/icon exit: 160ms, cubic-bezier(.22,1,.36,1), opacity 1→0 and blur 0→2px. Label entrance: 240ms, cubic-bezier(.16,1,.3,1), opacity 0→1 and blur 4→0px; icon entrance 160ms. `hold-to-confirm-animations.json` contains the actual browser animation calls.

The following are **least-squares critically damped approximations of the rendered motion**, not claims about private implementation constants. With mass 1, stiffness = omega² and damping = 2×omega. `spring-fit.json` records exact results and errors from the most recent capture.

| Follow | Fitted omega (s⁻¹) | Equivalent stiffness / damping | Initial recording normalized max error |
| --- | --- | --- | --- |
| Early-release progress rewind | 13.1 | 171.61 / 26.2 | 0.00380 |
| Press to scale .97 | 20.1 | 404.01 / 40.2 | 0.00476 |
| Confirmed label width | 12.5 | 156.25 / 25 | 0.01725 |

The fit command requires rewind max error below .012 and width max error below .03; scheduler timing may change the latest fitted values slightly. Rewind takes roughly 700ms to settle, pressing roughly 250ms, and the completion width roughly 700ms. These describe observed settling, not arbitrary animation delays.

## Prompt cache

Card: 24px padding, 20px gap, 34px corners; body Inter 14px/19.6px; heading 16px/17.6px weight 500. Bars: 10px high, 2px gaps, 3px corners. Cached segments blend their color at 28% with the surface and use a 55% inset outline. The side cache panel is 12rem wide; the main columns become one below **660px container width**, moving the panel above the requests. Below **480px container width**, each request uses label/status, bar, then three values. Captures cover 1440×1000, 390×844 and 1920×1100, plus dark theme.

Recorded behavior: Pause, Reset, next request, second-request hit, and a changed-system partial hit. The preview is an AI cache explainer with illustrative model prices and first-token estimates; its arithmetic is not evidence of a real cache service. The source shows four fixed request slots, aligned numeric columns, a segmented cache panel, a ring, captions and two footer totals.

Declared and directly observed motion:

- Processing fills each needed segment linearly. The first request's write flies from its row into the cache using **`--fly: 460ms`**, cubic-bezier(.22,1,.36,1). Its translation and destination dimensions are calculated from the actual layout.
- Cache-read bands sweep once for **520ms**, cubic-bezier(.65,0,.35,1).
- Clear/reset opacity lasts **240ms**. Cache segment opacity lasts **180ms**, with each segment delayed by index×30ms when clearing.
- Standard easing is cubic-bezier(.22,1,.36,1), enter is (.16,1,.3,1), exit is (.7,0,.84,0). Fast token is **160ms**, standard **240ms**.
- Recorded status crossfades include 100ms exits and 160ms entrances. The docs describe a critically damped ring follow and rolling numbers, but no private spring constants were inferred for those.

## Product adaptation and limits

Queue must use this visual and motion vocabulary with real upload records, byte sizes and actual stored/deleted results. Tokens, simulated cost savings, sample latency, five-minute expiry and AI prefix matching do not describe workbook storage and must not be presented as real Queue metrics. Similarly, a staggered reveal of the four Excel steps is a product adaptation using observed UIArc timing/easing; these source previews do not contain that exact four-step reveal.

No local application code is owned by this evidence task. No assertion of pixel perfection, physical-phone verification or real backend persistence follows from these source captures alone.
