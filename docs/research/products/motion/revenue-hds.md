# Revenue HDS pages: ported behaviours and motion

Pages: `/billing` (`data-page="billing"`), `/billing/usage-based-billing` (menu "Metronome",
`data-page="metronome"`), `/billing/subscriptions` (`data-page="subscriptions"`).

Code: `src/components/sites/stripe-com-9ababc9a/hds/pages/{billing,metronome,subscriptions}.ts`, page-specific
behaviours in `hds/billing/*`, `hds/metronome/*`, shared ones in `hds/revenue-shared/*`
(`page.ts` mounts the shared set for all three pages).

Reference sources (read-only, beautified in a scratch folder for reading):

| Chunk | Contents |
| --- | --- |
| `chunks/87161-5b7e5e335159e218.js` | billing page module 39828 (hero animations, bento, accordion, dialog wiring), graphics 79013/53888/2563/31167 |
| `chunks/pages/billing/usage-based-billing-42efa9f1fae59873.js` | UBB page module 42161, Stepper 73465, StepperGraphic 89282, KSP 1775, pagination 41718 |
| `chunks/pages/billing/subscriptions-1829775a630d3517.js` | subscriptions page module 58634 (static graphics + shared components) |
| `chunks/68654-87f869e363ee7738.js` | HeroWave 96173, renderer 4014, configs 89224, mesh 82401, palettes 64092, GLSL 56878/39798/26850 |
| `chunks/68067-3e3eb3988bc7ce5f.js` | Motion `animate(sequence)` compiler (sequence semantics) |
| shared page chunks (`pages/managed-payments`, `pages/use-cases/*`, `pages/pricing*`, `pages/products`, `57979`, `82178`, `28870`) | Carousel 64103, scroll-snap 21933, CarouselNav 12171, LogoCarousel 96815, sub-nav 91353/22744, horizontal scroller 36967, DomGraphic 8470, GradientBorderCard 50553, Accordion 50857, FAQ 82345, Resource carousel 46845, Resource card 26615, Chippy 91144, Dialog 4242, AnimatedTagIcon 82178, easings 93326, stagger 21411, throttle 95870, debounce 20 |

"from source" = value read from the reference code; "inferred" = not in the code, chosen by us.

## Engine: Motion sequence port (`revenue-shared/sequence.ts`)

The hero choreographies are Motion `useAnimate` sequences. `sequence.ts` re-implements the sequence
compiler (chunk 68067): `at` = number / `"+n"` / `"-n"` / `"<"` / `"<n"` (from source `w()`), default
segment duration 0.3 s and ease `easeOut` (from source), single-value keyframes animate from the previous
keyframe, keyframes strictly inside a new segment's span are erased, holds between segments, stagger via
`delay(index, total)`, transforms composed as `translateX translateY scale scaleX scaleY rotate` (Motion
order), CSS variables and `clip-path` interpolated numerically. Playback is elapsed-time driven (rAF),
`repeat: Infinity` loops the whole timeline, `pause/resume` used for offscreen / hidden tabs (inferred;
the reference keeps running offscreen).

Easing table `revenue-shared/easing.ts` = module 93326 `xn` (from source): easeSwift `[0.2,0,0,1]`,
easeOutCubic `[0.22,0.61,0.36,1]`, easeInOutExpo `[0.87,0,0.13,1]`, easeInOutQuart `[0.78,0,0.22,1]`,
easeInOutCubic `[0.65,0.05,0.36,1]` …

## /billing

### Hero product animation, desktop/tablet (`billing/heroAnimation.ts`, module 39828 `ef`)
- Trigger: `.billing-hero-animation` 10 % visible, once (from source `threshold: 0.1, freezeOnceVisible`).
  Not on mobile (< 640 px) and not with reduced motion (CSS then shows the static layout).
- Browser intro (once): `.m-browser` y 100 → 0 over 1 s easeSwift; window/page opacity 0 → 1 over 0.5 s
  easeSwift (from source).
- First run adds the entrance: container opacity 0 → 1 (0.5 s easeOutCubic); cards opacity/y 40 → 0 (1 s
  easeSwift, stagger 0.125 s, at "<0.1"); plans y 60 → 0 same (from source).
- Choreography (from source, full table in code): pricing cards morph (outer translate + wrap scale +
  inner counter-scale, geometry `er`/`el`, base 452×340) into usage-based plans at +1.25 s (1 s
  easeInOutExpo), UBB plan parts slide in (0.75 s easeSwift, stagger 0.1), hold 2 s, morph to the invoice
  (1 s easeInOutExpo; URL box y −50 %, brand x 322), invoice cards rise (0.75 s easeSwift), CTA pulse
  scale 1 → 0.95 → 1 (0.5 s, delay 1 s), drawer slides in (0.75 s easeInOutQuart), hold 6 s, everything
  returns (1 s easeInOutExpo) and plans re-enter (1 s easeSwift, at <0.3 / <0.1).
- Loop: on completion the choreography restarts without the entrance (from source: `.then(() => t())`).
- Evidence frames: `docs/design-references/products/billing/1440x900-hero-*.png`.

### Hero product animation, mobile (`billing/heroAnimation.ts`, module 39828 `eH`)
- Trigger: 10 % visible once; only < 640 px; not with reduced motion.
- Sequence (from source): plans in (opacity 0/y 80 → 1/0, 0.75 s easeSwift) + plan UI fade (0.3 s),
  out at +3 s (0.5 s); UBB plans in/out (+3 s); invoice in (plan UI fades out) / out (+3 s); drawer in /
  out (+6 s). `repeat: Infinity`.

### Hero wave (`billing/heroWave.ts`, modules 96173 / 4014 / 82401 / 89224)
- Config from source: module 89224 `f` (≥ 1264 px), `d` (640–1263: rotationY −0.1), `m` (< 640:
  rotationY −0.4, positionY −540); speed 5.25e-5, timeOffset 17500, camera zoom 0.9316, two noise bands,
  post blur 0 / grain 0.576; vertex shader 56878 = default shader with the X twist driven by
  `simplexNoise(vec2(v_uv.y*2, u_time*u_speed))` (only line patched on top of the homepage GLSL port).
- Lifecycle (from source): canvas only if WebGL2 without major performance caveat; `initScene` when within
  20 px of the viewport; frameInterval 2; intro time ramp +0.016/frame; paused offscreen, on hidden tab
  (inferred for tab), and with reduced motion (one static frame); resize debounced 300 ms; DPR ≤ 2;
  fallback image fades out on first draw (`hero-wave-animation--drawn`, CSS 0.25 s linear).
- Monochrome: palette `billing-hero-palette.png` converted with the project hue → luminance curve
  (`public/sites/stripe-com-9ababc9a/revenue/billing-hero-palette-mono.png`).
- Headless QA: SwiftShader is a "major performance caveat", so the page keeps the (monochrome) static
  fallback exactly like the reference would; QA scripts set `window.__qaForceWebgl` to exercise the
  renderer (`scripts/forensics/products/qa/revenue-hds-frames.mjs … 1`).

### Bento (`billing/bento.ts`, module 39828 `e1`, `eI`; card hover via FeatureBentoCard 27564)
- Usage-based card, trigger hover/focus-in (desktop/tablet, no reduced motion): progress 0 → 1 over
  `1 s × (1 − p)`, back over `0.6 s × p`, easeOutCubic (from source). Bars: `translateY(40 − 40·clamp((p −
  i/(n−1)·0.6)/0.4))%` (from source); meter `translateX(∓30·(1 − 0.3p))%` (from source); counter
  `1,503,042,973 + 507,526,037 · easeOutCubic(p)`, text throttled 50 ms (from source). Mobile / reduced
  motion: static value 2,010,569,010 (from source).
- Invoicing card: blurred gradient eases 3 % per frame toward the pointer offset (from source 0.03; made
  frame-rate independent at 60 Hz — inferred), stops within 0.1 px; runs only while hovered.
- Gradient border cards (module 50553): desktop only; `expandAmount 1` grow/shift vars; pointer ray cast
  to the card edge → `--gradient-border-card-mouse-x/y`, throttled 50 ms; resize debounce 300 ms (from source).

### Billing platform accordion (`revenue-shared/accordion.ts`, `billing/accordionDialog.ts`)
- Desktop: exclusive (`name`) collapsible `<details>`; CSS animates height/icon. Arrow keys move focus
  between summaries (floating-ui Composite, loop) — from source.
- Mobile (< 640 px): trigger buttons open an HDS Dialog bottom sheet (module 4242) built from the item's
  icon/title/graphic/features; data-status initial → open (CSS 0.8 s cubic-bezier(.22,1,.36,1)), close 0.3 s;
  unmount after 250 ms (floating-ui default, inferred from library); Escape / outside mousedown / close
  button / swipe-down (snap scrollTop ≤ 30, from source) dismiss; focus trapped and restored; closes
  when the viewport reaches 640 px (from source `useMediaQuery`). Dialog CSS (client-only in the
  reference) copied from reference stylesheet 986b2e45 into `hds-billing-overrides.css`, overlay tint → grey.
- Revenue recovery graphic (module 79013): `--visible` when 50 % visible, once, not with reduced motion.

### Other /billing behaviours
- Logo carousel, sub-nav, carousels, chippy cards, resource cards, FAQ, animated tag icon, DomGraphic:
  see "Shared".

## /billing/usage-based-billing

### Hero (`metronome/hero.ts`, module 42161 `ea`)
- Entrance: stack 20 % visible, once, not with reduced motion (from source). Chart plots clip-path
  `inset(0 100% 0 0)` → `inset(0 0% 0 0)` 1.2 s easeInOutCubic, stagger 0.4 s; invoice at "-0.4" and
  notification at "-0.3": opacity 0 → 1, y 16 → 0, 0.6 s easeOutCubic (from source). Initial hidden state
  is in the page CSS under `prefers-reduced-motion: no-preference`.
- Background video (≥ 640 px only, from source `m = mounted && !mobile`): muted, looping, inline, preload
  metadata; `--ready` class on `loadeddata`/`canplay` (CSS fade 0.2 s ease-out). Video converted to
  monochrome with the ribbon curve (`scripts/forensics/products/qa/revenue-hds-mono-video.py` →
  `public/sites/stripe-com-9ababc9a/revenue/ubb-hero-background-mono.mp4`). Paused offscreen / hidden
  tab / reduced motion (inferred; reference autoplays always).

### Stepper "Protect revenue" (`revenue-shared/stepper.ts`, modules 73465 / 89282)
- Desktop: autoplay every `--stepper-interval` 6000 ms (from source), only while ≥ 50 % visible, not
  hovered/focused (accordion), no reduced motion; elapsed time is kept across pauses and reset on step
  change (from source). Progress bar: `clip-path inset(0 100% 0 0) → inset(0 0% 0 0)`, duration
  interval − 300 − 1000 = 4700 ms, delay 300 ms, linear, paused with the stepper (from source).
- Click a step: select it, stop autoplay permanently, un-pause (from source). Below desktop steps toggle
  independently, first open (from source `useState([0])`).
- Content cross-fade on change: opacity 300 ms cubic-bezier(0.65,0.05,0.36,1), fill forwards (from source).
- Graphics: `is-within-stepper` always, `is-animating` when active & intersected & no reduced motion,
  `is-exiting` from deactivation until its `transitionend`, `is-paused` when paused (from source);
  bar growth itself is CSS (`llm-bar-grow` etc., 0.5 s, 30 ms per bar).

### Launch graphics (module 42161 `ew`) — mobile scroll-snap carousel with pagination (see Carousels).

### Logo bar — see Logo carousel (30 items → marquee). Page horizontal overflow reported by QA was
caused by unscaled dom-graphics (`billing-contract-graphic` etc.), fixed by the DomGraphic runtime; the
marquee track itself is clipped by `.logo-carousel__marquee-container { overflow: hidden }`.

## /billing/subscriptions

Page module 58634 has no page-specific hooks: its graphics are static or CSS-animated
(`hero__subscriptions-graphic` gradient border / success card keyframes run from CSS on load).
Behaviours are the shared ones: sub-nav, logo strip (5 logos → centred, no marquee), KSP gradient border
cards, revenue recovery `--visible`, customer stories (6 cards → drag), product eco carousel, FAQ,
resource cards, animated tag icon, DomGraphic scaling.

## Shared (`revenue-shared/*`)

| Behaviour | Trigger → states | Timings (source) |
| --- | --- | --- |
| DomGraphic (8470) | measure width → `--graphic-scale = min(1, w / sourceW)`, `data-status` measuring → ready, `domgraphicready` event | resize throttle 500 ms leading+trailing (from source); per-breakpoint sources for `usage-based-billing-bento-graphic` (mobile 497×380) and `billing-platform-ui-graphic` (mobile 411×398) (from source) |
| Sub-nav (91353/22744) | sticky nav portalled to body, visible when `scrollY ≥ top(manifesto section)`; static navs `aria-hidden` while sticky; mobile toggles (`--open`, `inert`), backdrop, Escape | scroll throttle 50 ms, resize debounce 50 ms (from source); slide via CSS `--navigation-duration` |
| Dropdown (22744 `A`) | fine-pointer hover intent, click toggle, outside pointerdown, Escape (+focus trigger), arrow roving, pointer safe zone, viewport clamp 16 px, sticky desktop drawer in drawer slot | 30 ms intent (from source); reveal keyframe in CSS |
| Sticky page-nav scroller (36967) | `horizontal-scrollable-container--scrollable` when overflowing | debounce 150 ms (from source) |
| Logo carousel (96815) | marquee only if items overflow; hover/focus pause and flatten others (`customer-logo--flat`); wheel / mouse drag (fine), touch drag + inertia | 0.03 px/ms, 0 with reduced motion; inertia ×0.9 per 16.667 ms, stop < 0.05; drag threshold 4 px; touch axis lock 10 px; velocity window 100 ms; wheel settle 50 ms; resize debounce 150 ms (all from source). Offscreen / hidden tab: rAF stopped |
| Carousel (64103/21933/12171) | modes per breakpoint: customer stories `scroll-snap/drag/drag` (static ≥ tablet if < 4), product eco `scroll-snap/drag/drag` (static if ≤ 3), resources by count, UBB launch graphics `scroll-snap/none/none` | drag easing 1/6.26 (1/3.87 dragging, 1/9 nav), rubber band ×0.2·(1 − |t|/200·0.7) capped ±200 px, spring 0.1 / damping 0.65, fling `floor(0.15·|v|)` items above 0.5 px/ms, hover scale 1.036 with neighbour shift, recalculation debounce 150 ms (from source). Physics stepped at a fixed 60 Hz (inferred, frame-rate independence) |
| Carousel nav / pagination (12171/41718) | prev/next = nearest index ± 1; disabled at start/end (progress ≤ 0.5 / ≥ 99.5; customer stories ≤ 0 / ≥ 100); segments show and select the active slide | from source |
| Gradient border card (50553) | see /billing bento | from source |
| Accordion (50857/82345) | FAQ: collapsible, multiple; billing: exclusive, collapsible; summaries: arrow keys (loop); `--content-height` fallback when `interpolate-size` unsupported | from source |
| Chippy (91144) | `--hds-chippy-link-offset-y = 0.5 × link height` | ResizeObserver (from source) |
| Resource card (26615) | `--hds-resource-card-link-offset-y = tag height + gap` | ResizeObserver (from source) |
| Animated tag icon (82178) | ≥ 50 % visible (replays each entry) | rotate 40° → −45° (1000 ms, cubic-bezier(0.65,0,0.35,1)) → 0° (800 ms, cubic-bezier(0.15,0.05,0.36,1)), pivot 15.5px 4.5px, fill forwards; pause when leaving; none with reduced motion (from source) |

Reverse scroll: none of these behaviours are scroll-scrubbed; entrances are once-only (from source
`freezeOnceVisible`), the sticky nav hides again above the anchor, the animated tag replays on re-entry.

## Not ported / differences
- Analytics (`carousel_interacted`, data-analytics) — not a visual behaviour.
- Wave mouse tracking (`u_mousePosition` is fed but unused by the light shader) — no visible effect.
- Headless screenshots cannot show the WebGL wave unless forced (see above).
