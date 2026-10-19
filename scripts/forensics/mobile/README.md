# Phone / responsive QA

Playwright scripts (system Chrome; `webkit.mjs` needs `npx playwright install webkit`). All take a base URL
first (default `http://localhost:3000`, use a production `next start` for timing) and write images to
`docs/design-references/mobile/` (generated, not committed).

| Script | Checks |
| --- | --- |
| `scan.mjs [base] [route] [widths]` | horizontal overflow (page + culprit elements), height and console errors from 320 to 1024px |
| `shoot.mjs` + `pairs.py` / `strips.py` | full-page capture at a phone width, side by side with `docs/research/stripe-live/full-<w>.png` (note: Chromium repeats the top of the page beyond 16384px, so both images are only valid above that) |
| `mono-audit.mjs` | rules in `mono.css` / `overrides.css` that apply at every width to selectors the reference only styles under a media query (see below) |
| `menu.mjs`, `menu-all.mjs`, `menu-hit.mjs`, `landscape.mjs` | the hamburger menu: every panel, opacity of the overlay, taps landing on the page behind it, phone held sideways |
| `transition.mjs` | the page transition recorded slowed down on a phone, starting from the open menu |
| `hydration.mjs`, `console.mjs` | every console error / warning (hydration mismatches, invalid keyframes) per route and width |
| `cls.mjs [base] [w] [route] [delayMs]` | layout shifts; with `delayMs` every image is held back, so images arrive while their section is on screen |
| `height-drift.mjs`, `book-size.mjs` | page / section heights at load vs after a scroll sweep; the reserved cover box vs the reference rules |
| `resize-sync.mjs`, `resize-anim.mjs`, `devtools-emulate.mjs` | resizing a loaded page (DevTools responsive mode, rotation) ends in the same layout as a fresh load |
| `swipe.mjs` | raw touch swipes on every horizontal scroller, and on the page |
| `phone-checks.mjs` | viewport meta, input font sizes (iOS zooms below 16px), tap targets |
| `first-seconds.mjs`, `viewport-shots.mjs` | what a phone shows over the first seconds / down the page at DPR 2 |
| `webkit.mjs`, `duo-probe.mjs` | the page in WebKit as an iPhone; where the iPhone Duo's CSS3D screen lands in Chromium vs WebKit |
| `hero-probe.mjs` | hero headline parts and animation state at one width |

Playwright's WebKit on Windows has no accelerated compositing, so CSS 3D is flattened: the iPhone Duo's
screen (a CSS3D layer) renders black / tiny there, which is not evidence about iOS Safari.

`mono-audit.mjs` currently flags 17 declarations that were reviewed and are fine: the stats gradients (their
per-breakpoint variants are re-declared in `mono.css`), the hero title colours (same value for every gamut),
reduced-motion variants and the desktop popup transitions in `overrides.css` (already inside `min-width: 940px`).
