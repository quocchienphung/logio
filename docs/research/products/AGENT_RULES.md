# Rules for builder agents (Payments + Revenue product pages)

These rules are copied verbatim into every builder prompt; this file is the audit copy.

## What exists
- 18 routes are generated and build: `src/app/(v1)/…` (14 legacy-stack pages) and `src/app/(hds)/…` (4 HDS pages:
  /managed-payments, /billing, /billing/usage-based-billing, /billing/subscriptions).
- Page markup = the reference's server-rendered HTML converted to TSX with the original class names
  (`src/components/sites/stripe-com-9ababc9a/<page-key>/sections/*.tsx`). The captured CSS applies unchanged
  (`src/styles/stripe/products/v1-base.css`, `hds-<slug>.css`). Static layout already matches the reference;
  what is missing is **behaviour and motion** (the reference's JavaScript).
- Legacy pages: every element with `data-js-controller="Name"` is mounted by
  `src/components/sites/stripe-com-9ababc9a/v1/controllers/registry.ts`, which aggregates one map per ownership
  group (`controllers/<group>/index.ts`). A controller is `(el: HTMLElement) => void | (() => void)`.
- HDS pages: `src/components/sites/stripe-com-9ababc9a/hds/pages/<slug>.ts` exports `mount(root) => cleanup`,
  called by `HdsRuntime` with `<main data-page="<slug>">`.
- `docs/research/products/controllers.md` maps every legacy controller to its reference module.

## Reference sources (read-only)
- Server-rendered HTML: `docs/research/products/_raw/<slug>.html`.
- Reference JS/CSS/images downloaded from the same pages: `/home/user/mirror/<host>/<path>`
  (legacy modules: `/home/user/mirror/b.stripecdn.com/mkt-statics-srv/assets/v1-*.js`, ESM, minified;
  controllers register with `X.register("Name", class extends Controller { connect(){…} … })`;
  HDS pages: `/home/user/mirror/b.stripecdn.com/mkt-ssr-statics/assets/_next/static/chunks/**`).
- Reference screenshots that exist (static render, no JS, 1440 wide, full page) are listed in the prompt.
- **Port behaviour, do not ship reference code**: read the minified source to recover structure, constants,
  durations, easings, delays, state classes and DOM targets, then write clean TypeScript. Never import, bundle,
  copy wholesale or `eval` reference JS, and never load it in a browser.
- **Network**: the session's sandbox policy forbids loading stripe.com (or any external site) in a browser and
  forbids running a server over the mirror. Do not try to work around this. Use only `localhost`.

## Files you own / must not touch
- You own only the files named in your prompt. Do **not** edit generated files: `sections/*.tsx`, `*Page.tsx`,
  `src/app/**/page.tsx`, `v1-base.css`, `hds-<slug>.css`, `registry.ts`, `HdsRuntime.tsx`, the generator scripts.
  If a generated file truly needs a change, stop and describe it in your report instead.
- Controllers manipulate the server-rendered DOM directly (like the reference); React never re-renders those
  sections, so this is safe. Put state-class CSS in your group's stylesheet, not in generated CSS.

## Quality bar
- Match the reference's interaction model exactly (scroll-driven vs click vs time vs hover) and its timings,
  easings, delays, staggers, loops and replay behaviour. Do not add effects the reference does not have.
- Monochrome: the project renders black/grey/white (docs/research/MONOCHROME_SYSTEM.md). Colours coming from JS or
  GLSL must be mapped to greys by luminance role (accent/brand purple → near-black on light, near-white on dark).
  Third-party logos keep their colours.
- Engineering: TypeScript strict, no `any`; drive motion with elapsed time; pause work offscreen
  (IntersectionObserver) and on `visibilitychange`; honour `prefers-reduced-motion` (show the final/static state);
  clean up every listener, observer, timer, rAF and WebGL resource in the returned cleanup; WebGL needs a fallback
  and capped DPR (≤2); no hydration mismatches (only touch the DOM inside controllers/effects).
- Record every behaviour you port in `docs/research/products/motion/<your-group>.md`: controller, trigger,
  initial → final state, duration, delay, easing, stagger, loop/replay, reverse-scroll, mobile differences, and the
  evidence (reference module + the constant you read). Mark each value "from source" or "inferred".

## Verify before finishing
- Worktree setup: if `node_modules` is missing, `ln -s /home/user/logio/node_modules node_modules`.
- Run your own dev server on your assigned port in the background: `npx next dev -p <port>`. Stop it at the end by
  its PID (never `pkill -f` a pattern: it can kill other agents' servers or your own shell).
- Screenshot/inspect with `node scripts/forensics/products/shot.mjs <url> <out.png|-> [w] [h] [full]` (reports console
  errors, hydration warnings, failed requests, overflow) and `node scripts/forensics/products/probe.mjs <url> '<js expr>' [w]`.
  Write your own small Playwright scripts for interaction checks (hover, click, keyboard, scroll, frame sequences);
  keep them under `scripts/forensics/products/qa/`. Headless Chromium uses SwiftShader, so WebGL is slow but works
  with `--use-gl=swiftshader --enable-unsafe-swiftshader` on your own localhost pages.
- Check 1440×900, 1280×800, 768×1024 and 390×844 for every page you touch; no console errors, no horizontal overflow.
- Save a few evidence frames (before/during/after states) as compressed PNG ≤ 400 KB each to
  `docs/design-references/products/<slug>/<viewport>-<section>-<state>.png`.
- `npx tsc --noEmit` and `npm run lint` must pass with 0 errors. Commit on your worktree branch (clear message, end
  with the two attribution lines given in the prompt). Do not push.
- Final report: controllers/behaviours ported (with the reference module each came from), files changed, what you
  verified and how, and anything not done or not verifiable. Be factual; do not claim pixel-perfect.
