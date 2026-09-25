# Motion — "carousels" controller group

Ports live in `src/components/sites/stripe-com-9ababc9a/v1/controllers/carousels/`, state CSS in
`src/styles/stripe/products/v1-ctl-carousels.css`. Reference modules are in
`/home/user/mirror/b.stripecdn.com/mkt-statics-srv/assets/` (read, never loaded). "from source" = constant read
in the module named; "inferred" = not in the source (our decision, reason given).

Shared reference helpers that the values below come from:

| Helper | Module | What it does |
|---|---|---|
| StripeScroll.scrollTo | v1-chunk-R4LGG24H.js | `track.scrollTo({behavior: "smooth"})` (native smooth scroll, browser-defined duration/easing); instant (`auto`) when reduced motion or `animate=false`. Fallback rAF tween (500 ms, bezier 0.25,1,0.5,1) only for browsers without native smooth scroll — not ported (all targets support it). |
| WAAPI wrapper | v1-chunk-4Q7ZI5NX.js | `el.animate(keyframes, {fill: "forwards", duration: 500, easing: "cubic-bezier(.165,.84,.44,1)"})` defaults. |
| ScrollObserver | v1-chunk-HMRIQCRQ.js | IntersectionObserver at one threshold; ratio ≥ threshold → "intersect", else "separate" (initial callback included). |
| Delay step | v1-chunk-PCZ6HXRS.js | rAF + `performance.now()` wait, pausable (keeps remaining time). |
| debounce | v1-chunk-423M6RNU.js | trailing `setTimeout`. |
| disableAmbientAnimations | v1-chunk-W54ZCUX6.js | reduced motion **or SwiftShader GPU**. Only the reduced-motion half is ported (the GPU check would disable motion in headless QA and on some real software-GL machines; inferred). |

Monochrome: colours the JS applies are mapped with the generator's hue → luminance curve
(`scripts/forensics/products/mono.py` `mono_value`, ported as `monoHex` in `carousels/util.ts`).
Testimonial backgrounds (all `theme--Dark` cards, white copy) use the dark-surface role `monoDarkSurface`
(curve value compressed into `#1a1a1a…#555555`) — inferred: the raw curve maps light brand colours
(#52a9e3, #FFD100…) to `#c4c4c4–#d5d5d5`, where white copy is illegible.

---

## TestimonialCarousel — v1-TestimonialCarousel-GEEHKJ2T.js
Pages: payments (×3), authorization-boost, checkout, elements, financial-connections, payment-links,
revenue-recognition, sigma, tax, terminal.

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Scroll-driven** (native horizontal scroll-snap track: swipe/trackpad) + **click** (nav logos `navButtons`, indicator bars `indicators`) → smooth scroll to `index × el.width` | from source (`scrollTo`, `handleTriggerClick`, `handleIndicatorClick`) |
| Per scroll event | page = `floor((x − w/2)/w) + 1`; the current and neighbour pages get `opacity = share in view` on the card and its background photo; carousel `background-color` = linear mix of the two pages' colours by the current page's share | from source (`scrollProgress`, `handleScroll`, colour mix `v1-chunk-SPVZY72M.js`) |
| Active state | indicator `TestimonialCarousel__indicator--active` (CSS `scaleX(0→1)` bar); nav logo drops `variant--Flat` (colour logo) | from source (constants `p`, `u`) |
| Swipeable | always for horizontal orientation; vertical 2-card carousels only below 750 px (`data-js-swipeable` toggled by ResizeObserver; background transparent when not swipeable) | from source (`v = 750`, `handleResize`) |
| Duration / easing | browser smooth scroll; the cross-fade has no own timing (it follows scroll position) | from source |
| Autoplay | none | from source |
| Mobile | same; nav logos hidden by CSS, indicators remain | CSS |
| Keyboard / aria | indicators and logos are `<button>`s (Enter/Space); `aria-current` on the active ones and a `:focus-visible` ring are **added** (captured CSS sets `outline: none`) | inferred |
| Reduced motion | scroll becomes instant | from source (R4LGG24H) |

## FullWidthCarousel — v1-chunk-F635Q6IC.js
Pages: payments (×2, inside FullWidthFeatureCarousel), authorization-boost, checkout, elements, payment-links, sigma.

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Scroll-driven** track (CSS `scroll-snap-type: x mandatory`), **mouse drag** on non-touch devices, **click** on a slide or via the navs | from source |
| Drag | `mousedown` → snap off, `scrollLeft += Δx` per `mousemove`; it is a drag once the pointer moved > **8 px** (then link clicks are cancelled); on `mouseup`/`contextmenu` (or leaving the window) it goes to the next item if dragged forward > **7.5 %** of an item, the previous if dragged back > 7.5 %, else the current one; snap is restored once the scroll lands (`progress === 1` or at the end) | from source (`CLICK_THRESHOLD = 8`, `DRAG_THRESHOLD = .075`) |
| Slide click | smooth scroll to the item (clamped to the last index that still fills the view: `items − round(el.width / item.width)`), emits `FullWidthCarousel:slideClicked`; ignored on `<a>` | from source |
| Busy guard | programmatic moves are ignored while a scroll is in progress (50 ms idle timeout) except right after a drag | from source (`setTimeout(…, 50)`) |
| Offscreen | when the carousel leaves the viewport (ratio < 1e-4) it jumps (no animation) onto the item it shows if it was between items | from source (`g.create(1e-4)`, `onSeparate`) |
| Events | `itemEntered` (IntersectionObserver rooted at the carousel, thresholds 0/.25/.5/.75/1, when `data-enable-items-entering-observer`), `fractionalIndexUpdated` (every scroll when `data-enable-live-fractional-index`: `leftSpacer − item0.offsetLeft + scrollLeft / itemWidth`, clamped), `itemWidthUpdated` (resize; also sets `--fullWidthCarouselItemWidth`) | from source |
| Touch | native swipe (drag listeners are not attached when `ontouchstart` exists) | from source (`isTouchDevice`) |
| Reduced motion | scroll moves instant | from source |

## FullWidthFeatureCarousel / Nav / MobileNav — v1-FullWidthFeatureCarousel-I3VPVACF.js, v1-chunk-6VKPSPK2.js, v1-chunk-B23EYDOT.js
| Aspect | Value | Evidence |
|---|---|---|
| Nav (≥ 600 px) | prev/next buttons (`data-direction` −1/1) → `goToSlide(current ± 1)`; `FullWidthFeatureCarouselNav__button--inactive` on prev at index 0 and on next at the last in-bounds index (CSS: grey outline, `pointer-events: none`; 150 ms colour transition from the captured CSS) | from source |
| Mobile nav (< 600 px) | bars; clicking bar *i* → `goToSlide(i)`; during any scroll the active bar slides with the fractional index: bar ⌊t⌋ gets `--activeButtonXPosition: frac × 24px`, bar ⌊t⌋+1 gets `−(1 − frac) × 24px`, both carry `…ListItem--active` (accent fill), bars clip their overflow, so the fill appears to travel between bars | from source (`l = 24`) |
| Wiring | the parent listens to bubbling `FullWidthFeatureCarouselNav:buttonClicked`, `FullWidthCarousel:itemEntered`, `…MobileNav:buttonClicked`, `FullWidthCarousel:fractionalIndexUpdated` and calls the children's APIs | from source |
| Aria | `aria-disabled` on inactive prev/next and `aria-current` on active bars **added** | inferred |

## CaseStudyCarousel / CaseStudyCarouselNav — v1-CaseStudyCarousel-W42GOHLJ.js, v1-chunk-OMTU4XFQ.js
Pages: terminal, data-pipeline, payments/link, payments/payment-methods.

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Scroll-driven** snap track (swipe on touch) + **click** on customer logos → smooth scroll to `index × el.width` | from source |
| Accent line | 1 px line of one segment per visible logo (colour `data-js-accent-color`, mono-mapped); clip-path `inset(0 (100 − (p + 1/n)·100)% 0 p·100%)` with `p = scrollLeft / scrollWidth`, so the lit segment follows the scroll | from source (`scrollProgress` setter) |
| Page change | current logo loses `variant--Flat` (brand colours), mobile indicator gets `…indicator--active`; all child `Video`s are paused | from source (`updatePage`, `currentIndex` setter) |
| Mobile (< 450 px) | logos hidden; indicator bars (created by JS) show the page; swipe only | CSS + source |
| Video | calls the `Video` API `pause()` if exposed, else pauses the `<video>` element | port detail |
| Mono | active mobile bar in light themes uses `#111111` (accent--Teal maps to `#b9b9b9`, indistinguishable from the inactive 30 % black bars) | inferred (MONOCHROME_SYSTEM.md accent role) |

## StackedCarousel / StackedCarouselControl — v1-StackedCarousel-6EFTS2I2.js
Pages: payments/payment-methods, data-pipeline, payments/link, payments/payment-links.

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Time-driven** autoplay + click | from source |
| Autoplay | every **3500 ms** (`data-interval` overrides) the next step becomes active, looping; starts when ≥ **75 %** of the section is visible, stops below 75 % and restarts (interval reset) on re-entry | from source (`interval = 3500`, `p.create(.75)`) |
| Click | only at viewport ≥ **600 px**; selects the step and stops autoplay until the section re-enters | from source (`innerWidth < 600`) |
| Step state | `StackedCarousel__detailContainer--isActive` (captured CSS: title bar `scaleY` .6 s, icon colours .4 s, inactive steps greyed), `--stackedCarouselItemIndex` on the section | from source |
| Image swap | old image: opacity 1→0, translateY 0→**50 px**, **500 ms**, `cubic-bezier(0.62,0.05,0.89,0.97)`, no delay. New image: opacity 0→1, translateY **−50 px**→0, **500 ms**, `cubic-bezier(.165,.84,.44,1)`, delay **300 ms**; fill forwards | from source (`v = 50`, `S`, `f`, `g = 300`) |
| Reduced motion | image swaps become instant (duration 0); autoplay still cycles as in the reference | from source |
| Mobile | the section is taller than the viewport / 0.75 on phones, so autoplay never starts and clicks are disabled (< 600 px) — same as reference | from source + measured (390×844: max ratio 0.44) |
| Keyboard | steps made focusable (`tabindex=0`), Enter/Space = click, `aria-current`, focus ring — **added** | inferred |
| Hidden tab | interval also paused on `visibilitychange` — **added** | inferred (engineering rule) |

## SegmentedControl — v1-chunk-AB4NMJVR.js
Pages: payments (×2), checkout, data-pipeline, elements, financial-connections, invoicing, payment-links,
payment-methods, revenue-recognition, sigma, tax, terminal.

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Click** (and `mouseenter` event for parents) | from source |
| Single mode | at mount, plain copies of the labels are created in `backButtonContainer`; first click adds `SegmentedControl--singleModeActive` (button row becomes the accent pill layer, clicks pass through to the copies). The row's clip-path animates from the old button to the new: `inset(0.5px R px 0.5px L px round r)` with `L = offsetLeft − spacing`, `R = rowWidth − width − offsetLeft + spacing`, **350 ms**, `cubic-bezier(.165,.84,.44,1)`; resize re-applies it | from source (`updateMask`) |
| Multi mode | toggles `SegmentedControlButton--active` per button | from source |
| Events | `SegmentedControl:buttonClicked` {index, alreadyActive, identifiers}, `:changed` (only when the selection changed), `:buttonMouseEnter` | from source |
| Overflow | asks the child `HorizontalOverflowContainer` to bring the button into view with `spacing + spacingBetween + 40` px | from source |
| Reduced motion | pill jumps (duration 0) | from source |
| Keyboard / aria | copies are `tabindex=-1` (their container is `aria-hidden`); keyboard uses the original buttons, `aria-pressed` added; focus ring inside the button (visible within the pill) and mirrored onto the visible copy (`SegmentedControlButton--focusMirror`) | inferred |

## CyclingCardsAnimation / CyclingCard — v1-CyclingCardsAnimation-NB6257W4.js
Pages: tax ("facts", `data-js-step-delay=5000`, 3 visible, Up, Top), revenue-recognition (rules, same config).

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Time-driven** loop, started by visibility (IntersectionObserver ≥ 0.001) | from source |
| Intro | ~100 ms after mount: the visible cards (3) animate `translateY(pos + 40px) → pos`, opacity 0→1, scale per card, **500 ms**, `cubic-bezier(0.645,0.045,0.355,1)`, stagger **150 ms**; the intro step lasts **2000 ms** | from source (`U = 2e3`, `$ = 150`, `F = 40`, `O = 500`, `L`) |
| Step | every `stepDelay` (**5000 ms** here; default 3000): the stack slides up by one card (+ spacing 24 px): top card fades out while moving up, next card enters from below fading in; the second card becomes active (`--isActive`, `--index` = rising z-index; inactive cards `--isInactive` → body opacity .5, small shadow); scales: active 1, others **0.92**; **500 ms**, same easing; cards outside the window get `--isHidden` | from source (`E = .92`, `createSlideAnimation`) |
| Layout | element height = sum of the visible cards + spacing; mask `top` = −(tallest window − visible height); recomputed on width change (debounced **300 ms**) | from source |
| Offscreen | a step running when the stack leaves completes, the next does not start; on re-entry the last step is replayed (reference behaviour: the index only advances while visible) | from source (`handleAnimationDone`, `playAnimation`) |
| Hidden tab | treated like offscreen | inferred (the reference's rAF delay stalls in hidden tabs) |
| Reduced motion | static stack: first 3 cards, top one active, scales 1 / 0.92 (CSS switches cards to `position: relative`). The reference's `setupNoMotion` reads `offsetIndex` before it is set and throws for Up stacks; the port uses 0 (its evident intent) | from source + fix (inferred) |

## DetailCodeSnippetCarousel — v1-DetailCodeSnippetCarousel-UBRLIT7R.js
Page: financial-connections. **Click-driven**: `SegmentedControl:buttonClicked` → child `Track.index = i` and
`CodeEditor.setCode(codeSnippets[i].innerHTML)`; snippet 0 is loaded at mount. Track/CodeEditor are other
groups' ports: called through their exposed APIs (`index` setter or `setIndex`, `setCode`), skipped when absent
(from source; API names are the relayed contract).

## AnimationSequence — v1-AnimationSequence-5L57BFU6.js (+ v1-chunk-DSWZA3DI.js sequence)
Page: revenue-recognition ("What's included" icons).

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | **Time-driven** loop, runs while ≥ **1 %** visible | from source (`l.create(.01)`) |
| Sequence | for each child AnimationController (icons, document order): play its animation, then wait **2500 ms**; after the last wait, every icon is restarted and the loop begins again with no extra gap | from source (`duration: 2500`, `AnimationSequence:main` done → recreate/restart/play) |
| Offscreen | pauses the current step (icon animation or remaining wait) and resumes it on re-entry | from source (`handleSeparate` → `pause`) |
| Hidden tab | paused as offscreen | inferred |
| Reduced motion | never starts | from source (`disableAmbientAnimations`) |
| Children | icon controllers (core group) expose `{play(), pause(), restart()}` (or under `.animation`); completion = `play()` promise or `AnimationStep:done` dispatched on the icon element | contract |

## Verification (QA scripts in `scripts/forensics/products/qa/carousels-*.mjs`)
- `carousels-testimonial.mjs`, `carousels-fullwidth.mjs`, `carousels-casestudy.mjs`, `carousels-stacked.mjs`,
  `carousels-segmented.mjs`, `carousels-cycling.mjs`: click / keyboard / drag / scroll / timing samples on the
  live pages; frames in `docs/design-references/products/<slug>/<viewport>-<section>-carousel-<state>.png`.
- `carousels-harness.mjs`: transpiles the ports and runs them on a blank page with mock child APIs (icons,
  Track, CodeEditor, HorizontalOverflowContainer) to check the sequencing and contracts.
