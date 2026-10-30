# Cookie consent (clone engine)

Source of the idea: the public preview of UIArc's **Cookie consent** (`https://uiarc.dev/components/cookie-consent`). Only the rendered page was read:
visible text and the public API/behaviour notes printed on the page, the DOM of each state, the CSS the page declares for the component's classes,
computed styles, screenshots and **frame-by-frame recordings of every morph** (`source/`). No API, registry, Code tab, bundle or prompt was fetched and no
source was copied; `src/components/sites/cookie-consent/` is written from those measurements.

## Method (clone engine)

1. **Record**: `scripts/forensics/cookie-consent-inspect.mjs` drives the preview (Customize, switch, Escape, Save, reopen, Ask again, Accept, Reject) and samples the
   surface's size, radius, shift and each face's opacity/blur on every `requestAnimationFrame`. `…-inspect2/3.mjs` add the entrance (from the first frame, warm
   cache: `…-entrance.mjs`), button/switch states, dark tokens; `…-switch-pixels.mjs` reads the colours the switch really shows from screenshot pixels.
2. **Fit**: critically damped / damped springs and tween curves are fitted to the recordings (`…-fit.mjs`, `…-joint.mjs`, `…-faces.mjs`, `…-faces2.mjs`,
   `…-entrance-fit.mjs`, `…-switch-fit.mjs`). Results are in `source/spring-*.json` and pinned in `consent-model.ts`.
3. **Validate**: `scripts/qa/cookie-consent.mjs` records *our* surface with the same sampler and compares it with the recordings.

## Measured values

| What | Measured | Used |
| --- | --- | --- |
| Shapes | bar 635 x 79 r22 (at a 635px layer), panel 420 x 448 r26, reopen button 44 x 44 r22; one surface morphs between them | `faceGeometry()` |
| Layer | 16px from the viewport edges, bar at most 660px, panel 420px, both clamped to the layer | `SIZE` |
| Growing | width, height, radius and shift share one progress: spring stiffness 120, damping 21 (ratio 0.96, a little bounce), rmse 0.009 | `SPRING.grow` |
| Shrinking | stiffness 190, damping 27.6 (ratio 1.00, flat, never overshoots), rmse 0.0012 over four recordings | `SPRING.shrink` |
| Faces | opacity and blur are one value (`blur = 4px * (1 - opacity)`). Outgoing: starts with the morph, exponential decay, tau ~18ms, 99% gone in ~70ms. Incoming: starts 31ms later, expo-out curve (.16, 1, .3, 1), 224ms (blur 264ms) | `FADE` |
| Entrance | opacity 0 to 1 in 130ms (expo-out); 24px rise and 0.98 scale settle with stiffness 190 / damping 33 | `SPRING.enter`, `FADE.enterOpacity` |
| Switch | 42 x 24 track in a 42 x 44 hit area, 18px thumb travels 18px with stiffness 315 / damping 35.5 (critical), track colour 160ms, thumb colour 240ms | `SPRING.thumb` |
| Buttons | 36px high pill, 14px/500, secondary hover `oklch(97.8%)`, pressed scale 0.97; primary is the foreground colour | `cookie-consent.css` |
| Tokens | light and dark values of surface, borders, text, shadows (`oklch`); switch on: `#1d1d1d` light, `#e8e8e8` dark | `cookie-consent.css` |
| Behaviour | non-modal dialogs; Escape closes the panel without saving and returns the focus; opening focuses the heading; saving focuses the reopen button; Save is described by "N of M optional categories allowed"; choice stored under a key with a version | `CookieConsent.tsx` |

Fit quality in our QA (width progress against the recordings): bar to panel 0.03, panel to button 0.01, button to panel 0.02. Face timing: bar gone at +67ms
(recording ~70), panel first visible +30ms (~36), full +170ms (~133).

Not observable from the public page: the exact easing of the face fade tails (fitted with a curve, rmse 0.03 for the outgoing face), the hover colour of the dark buttons
(`--surface-muted` is used), and what the component does without JavaScript.

## What it became here

* `src/components/sites/cookie-consent/`: `CookieConsent.tsx` (component with the documented API: `categories`, `value`/`defaultValue`/`onChange`, `storageKey`, `version`,
  `preferencesOpen`, `policy`, `position`, `strategy`, `showReopenButton`, `reopenSide`, `labels`, imperative `openPreferences/closePreferences/reset`),
  `consent-model.ts` (pure: categories, storage, geometry, springs; tested in `consent-model.test.mjs`), `cookie-consent.css`, `ConsentRoot.tsx`.
* `ConsentRoot` is mounted once in `src/app/layout.tsx`: storage key `logio-cookie-consent`, version `1`. It follows the dark theme (`html[data-theme=dark]`, `.dark`,
  `.crm-page[data-theme=dark]`), stays away from `/guide` (the full-screen intro) and wires the footer's **Cookie settings** link (and any element with
  `data-cookie-settings`) to open the preferences. The listener is on `window` in the capture phase because the page-transition runtime stops link clicks before they reach `document`.
* Read a saved choice anywhere with `readCookieConsent("logio-cookie-consent", "1")`. Nothing loads optional scripts yet: there are none. Gate them on `onChange` or that call.
* Dev-found pitfalls: measure face heights with the ResizeObserver's layout size (a `getBoundingClientRect` while the surface is still scaled 0.98 is too small and
  froze the panel 8px short); do not stop entrance and face animations when the target is re-measured; motion's `inert` is set on hidden faces so Tab skips them.

## QA

`node scripts/qa/cookie-consent.mjs [base-url]`: 23 checks (behaviour, storage and version, Escape/focus, keyboard, footer link, dark, phone, reduced motion, `/guide`,
Process page, WebKit, and the frame-by-frame comparison with the recordings). Screenshots in `qa/`. `npm test` covers the model.
