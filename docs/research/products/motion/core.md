# Core controller group: ported behaviours

Code: `src/components/sites/stripe-com-9ababc9a/v1/controllers/core/`. Reference modules are in
`/home/user/mirror/b.stripecdn.com/mkt-statics-srv/assets/` (read-only). Every value is **from source** unless
marked *inferred*. "Frame" means one 60 fps frame (16.67 ms) of the reference's per-frame increments.

Shared reference helpers the ports reuse (`core/util.ts`):

- **ScrollObserver** (`v1-chunk-HMRIQCRQ.js`): an IntersectionObserver that calls `onIntersect` when
  `intersectionRatio >= threshold`, otherwise `onSeparate`. It has an optional `onlyOnce` and a `rootMargin`.
- **`disableAmbientAnimations()`** (`v1-chunk-W54ZCUX6.js`): returns true when `prefers-reduced-motion: reduce`
  is set **or** when the WebGL `UNMASKED_RENDERER_WEBGL` matches `/swiftshade/i`. `disableGPUAnimations()` is the
  SwiftShader test on its own. Headless Chromium uses SwiftShader, so it takes the reference's static/disabled
  paths. The QA scripts can report a spoofed hardware renderer string so the animated paths also get checked.
- **Easings** (`v1-chunk-XZAD27SG.js`): `easeInOutCubic`, `easeOutQuart`. **debounce** (`v1-chunk-423M6RNU.js`).

## Page-level behaviours (reference `Page` controller)

Source: `v1-chunk-XMLK457N.js`. The reference puts this controller on `<html data-js-controller="Page">`. The
generated pages render `<html>`/`<body>` as `.MktRoot`/`.MktBody` inside `.v1-root` and drop that attribute. The
core group therefore mounts these behaviours once per `.v1-root` from the Gradient controller entry (`core/page.ts`,
reference-counted). Gradient is present on all 14 legacy pages.

| Behaviour | Trigger | Effect | Evidence |
|---|---|---|---|
| Keyboard focus rings | `keydown` Tab on body | adds `keyboard-navigation` to `.MktBody`; `mousedown` removes it | `g.TAB` → `t.classList.add("keyboard-navigation")` |
| Escape broadcast | `keydown` Escape | dispatches `CustomEvent("escape:keydown")` on `document.body` (other groups' selects/dropdowns listen there) | `t.dispatchEvent(new CustomEvent("escape:keydown"))` |
| Scrollbar detection | mount + body ResizeObserver | `innerWidth − body.clientWidth > 5` → `has-scrollbar` on body, `--scrollbarWidth: min(17, diff)px` on `.MktRoot`; else `0px` | `scrollbarWidthMin = 5`, `scrollbarWidthMax = 17` |
| iOS ≥ 16 orientation fix | `screen.orientation` change | body `display: flow-root` for one rAF | `IOS_FIX_VERSION_NUMBER = 16` |

Not ported: analytics/page tracking, experiment exposure, `__`-query propagation. `data-loading` removal is also
not ported, because the generated markup never has `data-loading`, so `.MktRoot[data-loading]` rules never apply.
Other reveal classes: none found. The only page-wide JavaScript classes in the bundle are the ones above plus
`is-globe-dragging` (Globe).

## Gradient (hero mesh gradient)

Source: `v1-Gradient-LLG4DJZK.js` → `v1-chunk-EPX4ZC6Y.js` (controller, the "MiniGL" renderer and the GLSL).

| Item | Value |
|---|---|
| Trigger | ScrollObserver threshold 0.1 on the canvas: intersect → add window scroll/mousedown/mouseup/keydown listeners, add `isLoaded`, play; separate → remove listeners, pause |
| Geometry | plane `innerWidth × 600`; segments `ceil(w·0.06) × ceil(600·0.16)`; orthographic camera; canvas pixels = CSS px (the reference ignores DPR, which is under the ≤ 2 cap) |
| Colours | `--gradientColorZero…Three`, read with `getComputedStyle(canvas)` on the first rAF, retried each rAF until `--gradientColorOne` contains `#` (max 200 retries, then the reference's fallback palette, here converted to greys by luminance). The CSS build already maps the flavour colours to greys |
| Vertex deform | `noiseFreq [3,4]`, `noiseAmp 320`, `noiseSpeed 10`, `noiseFlow 3`, `seed 5`, `incline 0`, `offsetTop/Bottom −0.5`; global `noiseFreq [14e-5, 29e-5]`, `noiseSpeed 5e-6` |
| Colour layers | i = 1..3: `noiseFreq [2 + i/4, 3 + i/4]`, `speed 11 + 0.3i`, `flow 6.5 + 0.3i`, `seed 5 + 10i`, `floor 0.1`, `ceil 0.63 + 0.07i`, blended with `pow(noise, 4)` |
| Time | starts at `t = 1253106`; `t += min(Δ, 1000/15)` per rendered frame; renders only every other rAF (`frame % 2`), about 30 fps |
| Pause rules | tab hidden (`document.hidden`), offscreen, **while the page scrolls** (each scroll event pauses; resumes 200 ms after the last one) |
| Fade-in | canvas `.isLoaded` → CSS `opacity 0 → 1, 1.8s ease-in 50ms`; parent `.Gradient.isLoaded` added **3000 ms** later → CSS `:after` fallback `transform … scaleY(.995)` over `1s` after a `1s` delay |
| Resize | debounced 250 ms; `u_shadow_power` 5 below 600px wide, else 6 |
| Reduced motion / SwiftShader | SwiftShader: the reference returns before creating the canvas, so only the CSS fallback shows (`.Gradient:after` radial gradients). Reduced motion: one frame is rendered, then listeners detach (the frame is re-rendered on resize) |
| Hidden extras kept | Konami code (↑↑↓↓←→←→BA at width > 1111) toggles `body.isGradientLegendVisible`. Keys 1–4 toggle layers, ±/_/= change frequency, `p` plays/pauses, arrows change amp/freqX, and mousedown scrubs ±160 per frame. No legend markup exists on these pages |
| `data-js-darken-top` | supported (none of the 14 pages uses it). The reference darkens only the green channel; in monochrome the same luminance drop is applied to all channels (*inferred mapping*) |

The GLSL is rewritten: the same maths with plain uniforms instead of MiniGL's struct/array declarations. It uses
the MIT "webgl-noise" simplex function, the same one the reference uses. The reference's `readPixels` hook has no
consumer on these pages and is not ported.

## Navigation

| Controller | Source | Trigger → effect | Notes |
|---|---|---|---|
| StickyNav | `v1-StickyNav-AARYF6LX.js` | window scroll/resize: `floor(rect.top)` > 0 / = 0 / < 0 → `data-sticky-before` / `-stuck` / `-after`; parent `--stickyNavHeight`; own `--viewportFullWidth` | On the pricing grids, `.Section__masked` is `overflow:hidden` (also in the reference, where the pricing section lacks `Section--hasStickyNav`), so the header never visually sticks; flags follow the reference maths |
| FixedNav | `v1-FixedNav-TKD4FODF.js` | scroll/resize: target = parent rect (`NextSiblings`: bottom = ∞). `top > 0` → `data-fixed-before`; `top ≤ 0 && bottom > height` → `data-fixed`; `bottom < height` → `data-fixed-after`. Peeking experiment: fixed at `scrollY ≥ 0.2·innerHeight` | CSS: `.PaymentsStickyNav__fixedNav` slides in with `translateY(-100%) → none`, `opacity 0 → 1`, `.25s`; reduced motion: no transition |
| PaymentsStickyNav | `v1-StickyNav-7JLTRUYL.js` | scroll: indicator `clip-path: inset(0 (1−progress)·100% 0 0)` with `progress = scrollY/(body.scrollHeight − innerHeight)`; active item = last `.Section[id]` whose `top − 64` ≤ scrollY → `PaymentsStickyNav__item--active`; on change the track is centred on the item with `scrollTo({behavior: smooth})` (`auto` when ambient animations are off). Below 600px: the list translates `−50px × index`; the dropdown arrow toggles `…__track--isExpanded` and `max-height` between 64px and `scrollHeight` (CSS `.25s ease-out`) | Offsets are measured against the document, so the shared 76px header needs no correction: it sits in normal flow, like the reference SiteHeader |
| MobileStickyNav | `v1-MobileStickyNav-BAAQGNR6.js` | below 900px only. `scrollY > innerHeight` → `MobileStickyNav--isSticky` (CSS `translateY(100%) → 0`, opacity, `250ms cubic-bezier(.25,.1,.25,1)`); body `padding-bottom: 64px` (+10px on iOS). Cookie `__Secure-has_logged_in=true` → `--hasLoggedIn` (hidden). Leaving the query → padding removed | The reference polls `scrollY` every rAF. The port runs the same test on scroll/resize (*equivalent; no idle rAF loop*). The iOS test (UA contains `iPhone` or `Safari`, and touch) is the reference's own, and it also matches Android Chrome emulation |
| HorizontalOverflowContainer | `v1-chunk-FKZYSESR.js` | API only: `makeSureElementIsInView(el, spacing = 0, mode = "eager"/"lazy")`, `scrollToOffset(x, 350ms easeInOutCubic)` (instant with reduced motion), `spacing` = inline `--horizontalOverflowSpacing` | Exposed through `exposeApi(el, "HorizontalOverflowContainer")` |
| ProductNav | `v1-ProductNav-OLNZ42IK.js` | on mount scrolls the overflow track to the `[data-js-active]` item: `offsetLeft − spacing`, instantly. The reference passes 0 as the duration. It retries every 200 ms until the child API exists | |
| ProductNavDropdownItem | `v1-ProductNavDropdownItem-5OM23LUB.js` (/invoicing) | mouse `pointerenter` or click opens; `pointerleave` closes after **100 ms** unless focus is inside. The panel moves to `.ProductNav` and sits 8px below the item, clamped to the `--columnPaddingNormal` gutter (default 16). Closing adds `…__panel--isClosing` (CSS opacity `.12s`) and sets `hidden` on `transitionend`. Keys: ↓/→ and ↑/← move between triggers and links, Escape closes and refocuses, Tab cycles through the panel. Outside pointerdown, focus-out, track scroll or resize close/reposition it | CSS reveal `ProductNavDropdownItem-reveal .12s cubic-bezier(.2,0,0,1)`; chevron rotates `.15s` |

## Layout, media and tooltips

| Controller | Source | Behaviour |
|---|---|---|
| DomGraphic | `v1-chunk-6NTPOWLV.js` | sets `--aspectRatio` (h/w·100%), `--maxWidth`, `--domGraphicWidth/Height` for the current device (Phone < 600 ≤ Tablet < 900 ≤ Desktop; phone sizes also apply on tablet when no tablet size exists), and recomputes them when the device class changes. A ResizeObserver scales `DomGraphic.scaleContainer` by `contentWidth / sourceWidth` and sets `--scale`. This controller is layout-critical: without it the figures collapse |
| StripeSet | `v1-StripeSet-L54OFY6U.js` | only `StripeSet--layoutIntersecting` with more than one stripe, and not when ambient animations are off. Scroll-linked (window scroll listener attached while the IO threshold 0.01 intersects): `p = (innerHeight − rect.bottom)/innerHeight`, `e = round(startY + overlap·p·2)/2` with `overlap −11`, `startY −5` (both negated for `data-js-align="End"`). Moving stripes (`[1]`, or `[0]` and `[2]` for End) get `translateY(e)`; the intersection gets `translateY(±e − 0.25)`. Reverses with scroll direction; no easing (1:1 with scroll) |
| Track | `v1-chunk-RKQAIDWX.js` | API `index` (get/set) and `setIndex(i)` → `--currentIndex` (CSS `translateX(−100%·i)`, `350ms cubic-bezier(.4,0,.2,1)`, none with reduced motion) |
| Video | `v1-chunk-YDW2KO6D.js` (/terminal, /sigma) | clicking the play button → `video.play()`; success → `Video--playing` (overlay fades `.5s`) + `controls` + `Video--posterHidden` (poster fades `.5s`). Native pause shows the button again once `readyState` is 4 and the video is not seeking. `ended` without `loop` → stop, poster back. Events `Video:play/pause/stop/done` fire on the element. `Video--excludeControls` toggles on click. `?t=` seeks when `Video--supportQueryStringTimestamp`. Foreign-language subtitles are enabled. API: `play()`, `pause()`, `stop()`, `isPlaying`. Analytics progress markers are not ported |
| PortalTooltipItem | `v1-chunk-TAAFKDSH.js` | mouse enter, focus or touch-tap → portal the tooltip into `.MktBody` (the reference body) with `role=tooltip` and a unique id, and position it above the trigger when it fits (`top > height + pointHeight`), else below. It is clamped 16px from the viewport edges, and the pointer offset is clamped ±(w/2 − 20). Leaving hides it after 100 ms (`opacity: 0`; CSS `.25s` plus `PortalTooltipItemFadeIn .25s`), then `display: none` on `transitionend`. Escape hides it, Tab cycles into and out of links in the tooltip, and scrolling the trigger out (IO threshold 1, rootMargin `0px 40px`) hides it. Resize un-portals and re-reads the responsive custom properties. API: `showTooltip`, `hideTooltip`, `repositionShownTooltip` |
| GuidesCard | `v1-Card-R77AR2VK.js` | IO threshold 0.75, once: every `path/circle/rect` in each `<g>` gets `transition: stroke-dashoffset 3000ms ease-out (col × 200ms)` → `stroke-dashoffset: 0` (0ms and no stagger when ambient animations are off) |

## BackgroundGlobe (/payments, /authorization-boost)

Source: `v1-chunk-DXFM6YSX.js` (controller) and `v1-Globe-ULZY3QTC.js` → `v1-chunk-KDRZV34K.js` (three r151 Globe).
The port is `core/backgroundGlobe.ts` plus `core/globe/LegacyGlobe.ts`, loaded lazily with three r178.

- Loading: the globe module is imported when the section two siblings before the globe's section intersects (IO
  0.001, once) or when the globe does. Play/pause follows the globe's own IO at 0.001 and page visibility. The
  reference also starts playing on the early trigger; the port only renders while the globe is on screen.
- Geometry: `radius = 250 + min(width, 1080)·0.3`, with width = the parent width (`data-js-size-to-parent`).
  Sphere segments are `floor(r/250·10) + 20`. Container: `z = −2r`, `rotation.x = 0.1111π`, `rotation.y = π`
  (0.1π when static), scale `data-js-globe-scale` (0.5 on /payments, 0.65 on /authorization-boost). The camera is
  orthographic with offsets `Payments (−0.75r, 0.25r)` and `PaymentsAuth (−0.75r, 0.5r)`.
- Dots: `count = floor(r/600 · 70000)` Fibonacci-sphere samples, each a 5-sided disc of radius
  `1.8 · r/450`. A dot is kept where the land mask's alpha > 0; the lookup uses the antipodal UV exactly like the
  reference. Dot shader: `pct = min(1, t / (1000 / max(0.2, 0.2·sin(fract(rnd)))))`,
  `alpha = (0.7·pct + 0.2·sin(t/200·rnd)) · opacityFactor`, and a drag "breathing" offset.
- Fill: MeshLambert sphere (`r − 0.1`), with opacity rising through the reveal:
  `easeOutQuart(progress)·0.94`, `progress += 0.005` per frame (200 frames ≈ 3.3 s). Auto-rotation eases from
  0.02 to 0.001 rad per frame over the same reveal. Lights: ambient intensity 1, back point light 0.2 at
  (−1000, −1100, −3300), front point light 0.8 at (−3000, 3000, 3300).
- Arcs: one every **1000 ms**. It starts at the next country in the list; the destination is chosen from the
  east/west/middle "live" lists by the globe's current rotation (the reference's ranges). Each arc is a cubic
  Bézier tube (44 segments, radius `0.2 + r/1200`) lifted `clamp(dist/2, 160, 500)` along the great circle.
  It draws in over **2500 ms** `easeOutQuart` (draw range 3000). The end discs grow to 0.35 at 0.01 per frame;
  the second disc starts at half-draw at 1.5× speed. The fragment scrolls a 2-colour gradient at 4e-4 per ms.
  After **4000 ms** the arc erases at 48 indices per frame and is disposed **1500 ms** later. Static mode:
  5 arcs, fully drawn.
- Drag/throw (mouse and touch, factor −0.003, x clamp −0.5π…0.25π, throw decay 0.94, fill scale 0.98 while
  dragging, `is-globe-dragging` on `.MktRoot`) is ported. Both current globes are `pointer-events: none` in the
  captured CSS, so dragging is inert on these pages, as in the reference. Both globes are also
  `display:none` below 600px.
- Monochrome: config colours pass through the project's hue → luminance curve (`core/mono.ts`, the same curve as
  `scripts/forensics/products/mono.py`). Dots `#938eff` → grey 0.53, fill `#f2f1ff` → 0.95. The default arc
  pairs (red/yellow, purple/cyan…) become grey pairs.
- Differences (environment, *inferred*):
  - The ctfassets textures are not in the mirror. The land mask is the project's local copy of Stripe's
    equirectangular mask (`/stripe/map_dots-96ddc62d.png`). The arc strips and the end-disc texture are generated
    procedurally. The optional background glow sprite (`backgroundGradient: 0`) is not drawn.
  - Colour management: the reference renders r151 in legacy mode. The port sets raw linear colours, uses
    LinearSRGB output, point-light decay 0 and light intensities × π to reproduce that.
  - Per-frame increments are converted to elapsed time (60 fps frame units) on a clock local to the globe, so it
    freezes while paused.
  - Renderer DPR is capped at 2.

## Animated icons

Base: `v1-chunk-UJMSTR4C.js` (`AnimationController`); animation classes `v1-chunk-4Q7ZI5NX.js` (Step: WAAPI,
default 500 ms, `cubic-bezier(.165,.84,.44,1)`, fill forwards), `v1-chunk-E6JMO43D.js` (Group),
`v1-chunk-DSWZA3DI.js` (Sequence) and `v1-chunk-PCZ6HXRS.js` (Delay). The port is `core/anim.ts` + `core/icons.ts`.

**Trigger**: none of their own. An icon only builds its animation on connect. The only reference player is
`AnimationSequence` (`v1-AnimationSequence-5L57BFU6.js`, used on /revenue-recognition and owned by another
group). It plays its child icons in document order with a 2500 ms `Delay` between them, restarts at the end,
pauses offscreen, and does nothing when ambient animations are off. On every other page the icons are static,
as in the reference. Each icon exposes `{ animation, play(): Promise, pause, restart, cancel, finish }` under
its own name and under `"AnimationController"`. On completion it dispatches a bubbling
`AnimationStep:done` (detail `{ el, name }`). A finished animation needs `restart()` before it replays
(reference semantics).

| Icon | Structure | Timings / easings |
|---|---|---|
| FastForwardIcon | two alternating groups (`FastForwardIcon:main`), swapped after each `done`; shift 14px, padding-left 16 | back → front: 1000ms `cubic-bezier(.68,-1.5,.27,2.5)`; front out (+3 shifts, fade): delay 350, 500ms `(.4,0,.2,1)`; hidden in from −3 shifts: delay 350, 500ms `(.2,0,.4,1)` |
| BlocksIcon | same as FastForward with x/y shifts 13/6, padding 16/31, 4-shift start offset | same durations/easings |
| DocumentWithArrowsIcon | group: left/right arrows sequences (out 1000ms overshoot ±16px + fade, back in 500ms `(.33,1,.68,1)`), document `rotateY(0 → −360deg)` 1500ms `(.68,-.5,.27,1.5)` | total 1500ms |
| ShieldWithCheckmarkIcon | sequence: checks fade out 500ms `(.2,0,.4,1)` → content wiggle ±1/2px 500ms linear → checks `scale(.75)→1`, fade in 500ms `(.68,0,.27,2.5)` | 1500ms; the reference's per-keyframe `easingWiggle` key is not a CSS property and has no effect |
| DocumentWithCheckmarkIcon | checks out → content `translate(−26px → 0)` 500ms `(.22,.61,.36,1)` → checks in | 1500ms |
| NodesIcon | sequence: in (segments −6px after a 350ms delay, 850ms `(.2,0,.4,1)`; dots and clip dots from `scale(.667)` out to a 24px ring, 600ms `(.5,−1.125,.5,1)`) → out (segments 350ms; dots back 600ms `(.5,0,.5,2.125)`) | ≈1800ms |
| GearsIcon | small gears −67.5°, large gears 60°, 1250ms overshoot | 1250ms |
| TerminalIcon | cursor blinks `steps(4)` over 1250ms + gears 67.5° 1250ms overshoot | 1250ms |
| HealthIcon | out: line fade + checks `scale(.75)`, 500ms → in: line `stroke-dashoffset 81 → 0` + checks pop 500ms | 1000ms |
| PricingIcon | backs: `rotate(45 → 0)` 750ms `(.5,−1.75,1,.5)`, Delay 655ms, back to 45° 550ms `(.4,0,0,1)`; fronts: delay 655ms then `rotate(0 → −67.5)` 500ms `(.4,0,.4,1)`, back 350ms `(.4,0,1,1)` | ≈1955ms |

## Verification summary (localhost :3102, headless Chromium + SwiftShader)

- Gradient (/payments, GPU string spoofed): canvas 1440×600 gets `isLoaded`, and the parent gets it 3 s later. Frame differences confirm the gradient animates and resumes after scrolling. Its placement matches the band in `docs/design-references/products/payments/reference-replay-partial-1440-full.jpg`. Without the spoof (plain SwiftShader) it keeps the CSS fallback, as in the reference.
- PaymentsStickyNav/FixedNav (1440, 390): flags go fixedBefore → fixed. The active item follows the sections, the indicator clip grows, and the 390 dropdown expands to `max-height` 346px. StickyNav pricing flags are before/after, with `--stickyNavHeight` set.
- MobileStickyNav (390): gets `--isSticky` past `innerHeight` and loses it back above; body padding is 74px (the iOS branch matches the headless mobile UA).
- Icons: all 10 were driven through their exposed API. Each dispatches one `AnimationStep:done`, `play()` resolves, and it replays after `restart()`. Measured durations: FastForward 1.06 s, Blocks 1.1 s, Health 1.03 s, Gears 1.3 s, Terminal 1.4 s, DocumentWithArrows 1.6 s, Shield 1.65 s, DocumentWithCheckmark 1.65 s, Nodes 2.0 s, Pricing 2.1 s. None self-play.
- Page behaviours: Tab adds `keyboard-navigation` to `.MktBody` and mousedown removes it; Escape dispatches `escape:keydown` on body.
- StripeSet (/payments, spoofed GPU): the scroll-linked translate matches the formula, e.g. `translateY(2 → 7.5 → 11px)` and intersection `−2.25 → −11.25px`.
- DomGraphic: every figure is sized on /payments (15/15), /tax (6/6), /terminal (5/5) and /authorization-boost (7/7).
- ProductNavDropdownItem (/invoicing): hover opens; leave closes after 100 ms; Enter/Escape work and focus returns to the trigger.
- PortalTooltipItem (/payments, /payments/payment-methods): portaled into `.MktBody`, placed above the trigger, hidden (`display:none`) after leave.
- Video (/terminal): the play click adds `Video--playing Video--posterHidden` and controls. The mp4 is an external URL, blocked offline, so no frames play.
- GuidesCard (/tax): the stroke draw-in runs with 3000 ms and a 200 ms-per-column stagger.
- Globe (/payments, /authorization-boost): the canvas sizes to its parent; dots, fill and arcs render; the static (SwiftShader) path shows 5 fully drawn arcs.
- Sweeps (scroll the full page, no console errors from core, no horizontal overflow): /payments at 1440, 768 and 390; /tax at 1440 and 390; /terminal at 1440 and 390; /authorization-boost at 1440 and 768. On /terminal the only console errors are the blocked external mp4 and a React `transform-origin` warning from generated section markup.
- Not run (the shared machine was overloaded, load average 50–100): the 1280×800 sweeps, /payments/payment-methods sweeps, and a reduced-motion browser pass. The reduced-motion paths are implemented per the source (Gradient single frame, StripeSet/GuidesCard/Globe static, HOC instant scroll) but were not exercised in a browser. QA scripts: `scripts/forensics/products/qa/core-qa.mjs` (scenarios),
`core-probe.mjs` (expression probe; `QA_SPOOF=1` reports a hardware GPU) and `core-run.sh` (starts :3102, runs the
scenarios, stops the server by PID). Evidence frames: `docs/design-references/products/<slug>/*-core-*.png`.
