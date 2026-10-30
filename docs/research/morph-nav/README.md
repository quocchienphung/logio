# Homepage navigation motion

Reference: https://uiarc.dev/components/morph-nav, observed 2026-10-31.
Destination: `/` (the existing `Navigation` is shared by the Stripe product pages).
Scope: retain the existing Stripe header, menus, links, fonts, dimensions and breakpoints;
adapt Morph nav's pointer intent, content movement and transition timing.

## Evidence

Only the public rendered preview, computed styles, browser animation objects and its visible
documentation were inspected. No source-site API, gated source, downloaded bundle, iframe or
screenshot is used by the implementation. Reference screenshots are inspection artifacts only.

- `source-page.txt`: visible component documentation, including Motion and Responsive behavior.
- `source-*-frames.json`: rAF samples of surface dimensions, panel opacity/transform and
  browser-exposed animation timings. The first `face` can be the exiting panel during a switch;
  its zero opacity must not be interpreted as the entire surface becoming invisible.
- `source-open-styles.json`, `source-*.png`: computed styles and reference states.
- `before/`, `after/`: local production captures at 1440 × 1000, same Chrome/environment.
- `comparison.json`, `qa/diff-*.png`: settled geometry/content/style and pixel comparisons.
- `qa/results.json`: real pointer, keyboard, mobile and reduced-motion assertions.

## Observed motion and adaptation

| Property | Public evidence | Local use |
| --- | --- | --- |
| Pointer intent | Documentation: 60 ms mouse-only hover | 60 ms; clicks and keyboard remain immediate |
| Departure tolerance | Documentation: 180 ms | 180 ms, cancelled as soon as a trigger is re-entered |
| Incoming opacity | Browser animation: 240 ms, 40 ms delay, cubic-bezier(.16,1,.3,1) | Same |
| Outgoing opacity | Browser animation: 120 ms, cubic-bezier(.22,1,.36,1) | Same; remove outgoing content after its fade |
| Content travel | Sampled transforms: initial y = -4 px; switch exit x approaches -10 px | 4 px entry, directional 10 px switch |
| Spring easing | Highlight's computed transition: 580 ms `linear(...)`, already present in shared motion tokens | Reuse those tokens for height and translation |
| Reduced motion | Public documentation: short fades, no travel or scale | 120 ms fade, no transform |

The surface in the source uses spring-driven live height values. Its physical spring constants
are not exposed by the public DOM; no claim is made to have recovered them. The local surface
keeps the existing 580 ms CSS spring curve. Root scale and the permanent `will-change` were
removed to keep text at its native size. The source's content blur is omitted to avoid adding
filtered text painting to the existing large mega-menu. Search, the floating highlight and
the source's compact layout are outside the requested motion-only change.

## Root cause and correction

The old `ResizeObserver` measured a wrapper stretched to the animated popup's height, with
`height:100%` content inside. The observer repeatedly fed the current interpolated height back
into the transition target. For example, after Products → Solutions → Developers → Resources,
the original Resources popup remained about 578 px tall in the captured state, although its
standalone height was 289 px. Developers similarly inherited about 670 px instead of 319 px.

The desktop wrapper now measures at intrinsic height, independently of the popup. The existing
integer height rounding is preserved, and unchanged measurements do not create a new target.
There is one observer of the active content; popup status no longer resubscribes it. Closing
content is inert and removed after its 120 ms fade. Entry receives a painted initial frame;
reversing an exit continues the existing transition. Pending departure is cancelled before
the 60 ms intent delay, preventing an older close timer from cancelling a new hover.

## Verification

`morph-nav-compare.mjs` asserts deep equality of the settled header/trigger/popup/content/link
geometry, text, destinations and captured visual styles, excluding the deliberately changed
transition and `will-change`. All five states pass. Standalone popup heights remain exactly
692 / 439 / 319 / 289 px for Products / Solutions / Developers / Resources. Those heights now
also hold after switching in either direction, without continued drift.

Pixel differences are 0.0007–0.25% across menu captures, concentrated in text rasterization
after removal of the permanent compositing hint; this is not a claim of byte-identical images.
The idle header differs by 16 pixels (0.014%); its sign-in cutout overlays the moving hero.

Browser QA covers desktop 940 / 1024 / 1440 / 1920 px, mobile 390 / 768 / 939 px, fast pointer
passes, the gap to the panel, re-entry before and during close, Escape/focus restoration,
keyboard opening, outside click, repeated mobile toggling, overflow and reduced motion.
All 57 checks pass on the final production build. The existing local-navigation regression
also passes (9 live states and 14 HTTP destination checks). Typecheck and production build pass;
full lint has zero errors and 14 existing warnings in unrelated files. Targeted lint is clean.

Performance data in `before/performance.json` and `after/performance.json` are headless Chrome
rAF intervals and Long Animation Frame/long-task observations with the full homepage active.
They are not presented-frame FPS or a guarantee for every device. Use production for evaluation;
the `after-dev` capture also ran during build/lint and cannot support a production comparison.

Commands:

```powershell
node scripts/forensics/morph-nav-motion.mjs
node scripts/forensics/morph-nav-local-audit.mjs http://localhost:3001 after
node scripts/forensics/morph-nav-compare.mjs
node scripts/qa/morph-nav.mjs http://localhost:3001
npm run typecheck
npm run lint
npm run build
```

Implementation: `src/components/stripe/Navigation/Navigation.tsx` and the navigation block in
`src/styles/stripe/overrides.css`. Generated reference CSS remains untouched.
