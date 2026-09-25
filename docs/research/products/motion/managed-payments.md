# /managed-payments: ported behaviours and motion

Reference sources (read-only, `/home/user/mirror/b.stripecdn.com/mkt-ssr-statics/assets/_next/static/`):
page bundle `chunks/pages/managed-payments-40aa2ec9b3155626.js` (module 83758 and helpers), globe chunk
`chunks/38639-daa7928f0481123e.js`, shared chunks `1086-…` (render loop 90126, GPU tier 18846, lazy wrapper 90866),
`61541-…` (DomGraphic 8470, subnav 22744/91353, gradient card 50553, radar graphics 22239/44044, divider 24384),
`99449-…` (logo carousel 96815, intersection hook 66725), `64353-…` (testimonials 49382), `95599-…` (accordion 50857),
`3dfade9e-…` (floating-ui Composite 47895), `381.…` (WhimsyDivider), `30365-…` (breakpoints 21010, debounce 20,
throttle 95870, resize hook 20825); CSS `css/3b9685a989991b97.css` (page) and `css/ae10d1107641e083.css` (subnav).

Code: `src/components/sites/stripe-com-9ababc9a/hds/pages/managed-payments.ts` (mount),
`hds/managed-payments/**` (globe, hero, merchant-of-record), `hds/shared/**` (generic HDS behaviours).
"src" = value read from the reference; "inf" = inferred.

## Hero globe (HeroGlobe → Globe, chunk 38639 class `eb`)

Props on this page (module 83758): `uiVariant:"flags", dots:{count:9e4}, arcs:{maxActive:3, simpleEnabled:false}, surface:{opacity:.2}, glow:true` (src).

| Aspect | Value | Evidence |
|---|---|---|
| Trigger | Time-driven, starts when dots are generated; renders only while `.globe` ≥10% visible (rootMargin 100px), tab visible, motion allowed | IO `threshold:.1, rootMargin:"100px"` (src); visibility pause (src: render loop suspends; we also shift timelines) |
| Placement | `.globe` = `.managed-payments-hero__anim-container` (80% width square, `margin-top:-2%`, `margin-bottom:-40%`, `z-index:-1`) inset −20px; clipped by `.managed-payments-hero__container{overflow:hidden}` → upper hemisphere rising from the hero's bottom edge (1440: canvas 1025², globe r≈396px, centre on the hero bottom) | page CSS (src) |
| Mobile (<640) | anim container `width:200%; margin-left:30%; margin-bottom:-80%`; touch devices: camera z 11.3 (desktop 11.7), dot size 14 (12), dot count ×0.5 = 45k | CSS + `er` constants, `resolveDotCount` (src) |
| Camera | Perspective fov 25°, near .1, far 1000, at (0,0,11.7) looking at origin | `new cPb(25,1,.1,1e3)` (src) |
| Globe | radius 2; group rotation x −2°, y 70° (initial), z 8° | `globeAxisTiltX/Z`, `globeInitialRotationY` (src) |
| Rotation | +0.00115 rad per 60 Hz frame (`×dt×60`, dt ≤ 50 ms), eased 1%/frame to ×1.25 while viewed longitude is ≤ −165° or ≥ 50° (Pacific) | `rotationSpeedY`, `arcPacificSpeed*` (src) |
| Dots | Fibonacci sphere, 90k samples, tangent jitter 0.15×0.75, kept where map-dots alpha>0 (≈27k on land); size ×(1±0.375), opacity 1−hash×0.3; generated in a worker | module 48343 + worker (src) |
| Dot shading | 3-stop screen gradient at 225° (stops .024/.3794/.7941), opacity 0.6, back-face fade front .25 / back −.1 / min .15 / curve 2; point size `0.12·(dpr/2)·(h/800)·(300/−z)` | shaders 67381/41669 (src, verbatim) |
| Corona | 25% of dots eligible, 20% participation per launch; flight 3.1/0.35 s, fade 0.6/0.35 s, launch interval ≥6.67 s ×[0.7,1.7]; lift 0.6R with noisy tangential drift, shrink to 35%, opacity −50%, whiten 45% | uniforms in `applyDotsToScene` (src) |
| Surface | sphere 0.9995R, 20% opacity, gradient at clock 215° depth −0.1 (contrast 2, offset −0.4), fresnel 0.1^0.3 | shaders 99001/91396 (src) |
| Occlusion | depth-only sphere 0.993R (FrontSide, colorWrite off) hides back-side arcs/markers and the glow inside the disc; dots draw without depth test and fade by facing | `backgroundSphere` (src) |
| Atmosphere | camera-facing ring R→1.02R, fade 0.8 units, alpha ≤ .08×.35 | shader 47780 (src) |
| Glow | full-frustum plane, radial blob centre (.5,.5) radius .48, colour A→B, alpha (1−d)^1.4; only visible outside the globe disc (depth) | shaders 33784/22740, `glowEnabled` (src) |
| Arcs | spawn every U[1500,4000] ms (≥100), retry +200 ms, +250 ms while 3 are live; seller city (regions US/UK/EUR/AU/CA/NZ, region-uniform) → buyer city in another country, both facing the camera (dot ≥ .25) and left of NDC x .4, ≥3000 km apart, midpoint ≥80 px / markers ≥56 px from live arcs | `pickRandomCityPair` flags branch, `es`, `ed/ep/em` (src) |
| Arc animation | marker A 600 ms easeOutCubic → marker B 550 ms → line draw clamp(2800·km/8000, 1800, 4500) ms easeOutCubic (opacity = eased progress) → immediately retreat 2200 ms easeInOutCubic (opacity 1−retreat) → markers fade from 1760 ms for 600 ms → disposed | `en`, `updateSingleArcAnimation`, flags finalization (src) |
| Arc shape | slerp between points offset 0.02 along the chord tangent, lifted by sin(πt)·lerp(.1,.275,(ω/π)^1.2)·R, 257 points, fat line 0.007 world units | `drawArc` (src) |
| Markers | 0.4 plane oriented to the normal, scale 0.2 × eased opacity; sprite = 25% halo, ring 38.4→25.6, white core | `createMarkerTexture` (src) |
| Flag badges | 10 pooled `.globe__flag-overlay` pills pinned to the start/end markers (CSS translate −50%/−50%), opacity = marker opacity × depth fade (smoothstep −.35→−.1), hidden when facing < −0.5 or off-screen | `updateFlagOverlayPosition` (src) |
| Frame pacing | first 12 frames estimate refresh rate (snap to 240/160/144/120/60/30/24); WebGL renders every 2nd frame, arc/flag state every frame; >10% slower than refresh raises a warning level (max 3) → render every level+1 frames; recovers when faster | module 90126 + `initScene` (src); averaging helper not mirrored (inf: mean) |
| Load / reveal | globe fires `domgraphicready` when dots are uploaded; LazyAnimation (rootMargin 800px, freeze once visible) then adds `lazy-animation--loaded` after 2 rAFs → opacity 0→1, .5s cubic-bezier(.33,1,.68,1) | modules 90866, 8470 `FN`, CSS `.lazy-animation` (src) |
| Gate / fallback | WebGL missing, renderer on the GPU blocklist, major performance caveat, or missing WebGL2 / vertex textures / 4096 px textures / 256 uniforms / 4 extensions → GlobeFallback (static image) already `loaded`; `?__disableWebGL` forces it | 18846, 90126 `Us`, 49873 (src). Apple benchmark tiers not ported (every listed Apple GPU but A7 passes). QA-only `?__forceWebGL` skips blocklist + caveat (not in reference) |
| Reduced motion | globe paused on its first frame, no arcs | `e.paused = A` (src) |
| Colours (mono) | dots #1c1c1c / #6a6a6a / #b0b0b0, surface #fff→#8a8a8a, fresnel #c8c8c8, atmosphere #6a6a6a, arcs charcoal↔mid (homepage globe mapping); glow #888→#6a6a6a (mono.py curve); flags keep colours (national marks, like the homepage wallet badges) | `config.ts` |

Not used on this page (reference features of the same engine): thin "simple" arcs (`simpleEnabled:false`), badge UI
arcs and transpacific preference (default variant only), hover boost (no `apiRef` passed).

Flags: the per-country SVG chunks are not mirrored; 26 flags were redrawn (CA and GB reuse the reference's own
16×12 paths from this page's balances graphic; palette from this page's inline flags; green/black/orange/light-blue/gold inf).

## Hero overlay cards (CSS, gated by JS)

`.managed-payments-hero__ui-anim-overlay` × 5, `animation: …-cycle 15s ease infinite`, delays 0/3/6/9/12 s, paused
until `.lazy-hero-globe.lazy-animation--loaded` precedes the container (src, page CSS). Desktop keyframes: 0% opacity 0
translateY(24px) → 3% visible → 30% → 33% hidden. Mobile (<640): all at `left:50%; bottom:10%`, width 72%; keyframes
`-cycle-mobile` (0% −40px → 3–20% in place → 23–40% pushed back `translate3d(-50%,16px,-40px) scale(.94)` → 43% out),
first card uses `-cycle-mobile-wrap` (z +1px) (src). JS parts ported: the overlay DomGraphic is 1264×425 above 640px and
555×628 below (server render used the mobile size), and the copy switches `hds-text--lg/md` (mobile) ↔ `--sm/--xs` (src,
`size: s ? "lg" : "sm"`). Reduced motion: the reference's pause rule is out-specified by its own "running" rule, so its
cards keep cycling; per project rules the override stylesheet shows the first card statically instead (inf/deliberate).

## Other behaviours

| Behaviour | Trigger → states | Timing | Evidence |
|---|---|---|---|
| DomGraphic (all 10 graphics) | mount/resize → `--graphic-scale = min(1, width/sourceWidth)`, source size per breakpoint, `data-status` measuring→ready, `domgraphicready` | resize throttled 500 ms (leading+trailing) | 8470 (src) |
| Hero subnav, mobile static | cross button toggles `hero-mobile-static-subnav--open`, button `--open`, `aria-expanded`, content `inert` when closed | CSS | 22744 `U` (src) |
| Sticky subnav | client-only copy portalled to `<body>`; `hero-sticky-subnav--visible` when `scrollY ≥` manifesto top (measured on mount/resize, debounced 50 ms; scroll throttled 50 ms); on <940px hidden while the static drawer is open; own drawer + backdrop (click/Escape close; auto-closes when no longer visible); static navs `aria-hidden` while it shows | slide `translateY(-105%)→0` over `--navigation-duration` (CSS) | 22744 `v`/`W`/`O` (src) |
| Horizontal scroll containers | `--scrollable` (edge mask) while inner overflows | resize debounce 150 ms | 36967 (src) |
| Logo marquee | two sets when one set is wider than the carousel; auto-scroll left 0.03 px/ms (0 with reduced motion), wraps per set; holds on hover/focus/drag/offscreen; wheel (deltaX or shift+wheel) scrubs; mouse drag (grab cursor after 4 px, swallows the click); touch swipe with 10 px direction lock and fling (last 100 ms, ×0.9 per 16.67 ms); hover/focus on a linked logo (Lovable) flattens the others (`customer-logo--flat`) | continuous | 96815 (src) |
| KSP gradient-border cards | ≥940px, fine pointer: pointer direction from centre → ray exit point on the card box → `--gradient-border-card-mouse-x/y` (CSS moves the gradient, 1s cubic-bezier(.16,1,.3,1)); sampled ≤ every 50 ms; rect refreshed on resize (debounce 300 ms)/mouseenter | CSS reveal .25s | 50553, 64802, 26847 (src) |
| Whimsy dividers (3) | mounted within 500 px of viewport; <940px plain line; ≥940px canvas hatch (8 px segments ×1.35) whose segments spring-rotate under the pointer (radius 150, amplitude 1.3 rad, stiffness .02+speed, damping .92, 120 px edge fade), ≤60 fps, sleeps when settled, pauses offscreen (50 px) | pointer-driven | chunk 381, 24384 (src) |
| Tax responsibility flow | CSS only (already in page CSS): bands sweep 6.7 s ease-in-out infinite, delays 0/1.3/2.6 s; connector arrows fade 0.65/1.95 s | — | page CSS (src); no JS |
| Reduce-overhead carousel | <640px scroll-snap: resets scrollLeft, mirrors `--carousel-scroll-progress` (rAF); ≥640px none | — | 64103/21933 (src) |
| Merchant-of-record demo | first time the desktop graphic is ≥50% visible: reset → chip spotlight 1.4 s (CSS conic sweep) → 600 ms → chip engaged + "+"→"−" (0.3 s) + Refunded/Failed rows fade 0.5 s & collapse 0.9 s cubic-bezier(.25,1,.5,1) → 900 ms → replay button fades in (0.3 s). Replay: rows re-expand (900 ms) then the same run; newer runs cancel older ones. <640px: static mobile graphic. Reduced motion: end state immediately (inf/deliberate) | 0 / 1400 / 600 / 900 ms | module 83758 `ar`/`ai` (src) |
| Dates in the MoR table | re-formatted in the viewer's time zone (`month short, day, hour, 2-digit minute`) | mount | 83758 `ae` + `eF.$` (src) |
| Phone clock (in-app revenue) | current local time `h:mm` without day period, once on mount | mount | 40498 (src) |
| Testimonial carousel | logo buttons smooth-scroll their card; active = round(scrollLeft/clientWidth); bar 1/n wide sliding by scroll ratio (>706px) or fixed 160 px with the logo row sliding (≤706px) | scroll, resize debounce 150 ms | 49382 (src) |
| FAQ accordion | native details; Arrow keys (all four, looping) move focus between summaries, focused summary gets `data-active`; `--content-height` fallback where `interpolate-size` is unsupported | CSS height transition | 50857, 47895 (src) |
| Static graphics | global revenue checkout, fraud chart, dispute list ("Smart disputes is working…" glow is static CSS), balances, stats, code sample: no JS motion in the reference | — | 44044, 22239, page bundle (src) |

Hover arrows on buttons/links are CSS (`hds-icon-hover-arrow`), unchanged.

## Known gaps / deviations

- Flag artwork is redrawn (reference flag chunks not mirrored).
- Currency conversion of amounts (`convertAndFormatCurrency`, geo-based in the reference) is not ported; amounts stay USD as captured.
- Headless Chromium (SwiftShader) fails the performance-caveat gate exactly like the reference would, so default headless loads show the (monochrome) fallback; `?__forceWebGL` renders the globe for QA. SwiftShader prints a "GPU stall due to ReadPixels" driver warning in forced mode only.
- Generated `hds-managed-payments.css` ends with an unterminated `@layer reset, base, app` statement that swallows the first rule of the next stylesheet; the overrides file starts with a terminating copy of that statement. The same unterminated statement ends `hds-billing.css`, `hds-metronome.css` and `hds-subscriptions.css` (generator fix needed).

QA scripts: `scripts/forensics/products/qa/managed-payments-{hero,interactions,mor-frames,reduced-motion,webgl-caps}.mjs`,
`managed-payments-mono-fallback.py`. Evidence: `docs/design-references/products/managed-payments/*.png`.
