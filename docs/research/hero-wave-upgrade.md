# Hero ribbon refinement — 2026-10-19

The moving monochrome ribbon now keeps a clean silhouette and visible folds through a longer tail.
The upper composition and page layout stay anchored while the canvas reveals more real geometry
below the logo strip.

| Viewport | Previous extension | New extension |
| --- | ---: | ---: |
| Desktop, >=1264px | 440px | 900px |
| Tablet, 640–1263px | 340px | 680px |
| Mobile, <=639px | 240px | 460px |

The fade stays opaque farther into the extension before easing to transparent. The fold has 32
columns instead of approximately 10, redistributing the 128 crosswise columns. Its two sides are
separated farther to reduce self-intersection marks exposed by the longer, sharper tail.

Desktop render targets use 4x MSAA. Touch devices retain native canvas antialiasing. A one-fetch
composite with subtle stationary dither replaces the seven texture lookups of the angular blur/grain
pass. Surface fibers fade into their average below pixel size, reducing crawling texture at tight
folds. Supersampling is capped at 3.6 million pixels on desktop and 2.4 million on touch devices.

Animation integrates elapsed time with a 60fps ceiling rather than skipping every second display
refresh. A delayed frame is capped to avoid a sudden pose jump. Hidden/offscreen/reduced-motion
states cancel the render loop; resuming continues the existing pose. Sustained missed frame budgets
reduce the actual capped render resolution, while retaining antialiasing and at least one render
pixel per CSS pixel where the initial pixel budget permits it. Renderer cleanup also releases the
post-process geometry and palette textures that finish loading after disposal.

## Verification

```powershell
node scripts/forensics/qa-hero-wave.mjs http://localhost:3000
```

The production checks cover desktop at DPR 1 and 2, tablet, touch mobile, actual draw-call pauses,
resume timing, resizing, the shared developers renderer, reduced motion on initial load, WebGL image
fallback, navigation/history, shader errors, and resolution adaptation under a controlled slow
scheduler. Screenshots and measured results are in
[`docs/design-references/hero-wave-upgrade/`](../design-references/hero-wave-upgrade/).

Observed throughput is approximately 60fps across the four tested configurations on Edge with an
RTX 4070 SUPER. This is the measured test machine, not a performance guarantee for other hardware.
The earlier raw capture uses the original half-refresh scheduler and should not be interpreted as
a directly comparable fixed-60Hz benchmark. `npm run check` passes (full lint, TypeScript, production
build), with the repository's four existing lint warnings and no new lint errors.

## Softer tail curvature follow-up

The hero now uses a quintic twist profile over its full length instead of the concentrated
exponential turn. The fold's cross-section also eases its depth with a quintic curve, meeting the
flat wings with zero curvature, and its width changes gradually along a broad sine envelope instead
of pinching sharply in the middle. Longitudinal subdivisions increase from 256 to 384 to smooth the
silhouette through the longer bend.

Low-amplitude torsion and a long traveling wave replace short, stiff ripples. A coherent S-bend
moves the hanging end as one sheet; its envelope starts with zero first and second derivatives so
the transition into the upper body has no hinge. The hero-only shader define keeps the original
developers and card-background deformation separate.

Before/after rendered poses at matching timestamps, plus a mobile capture, are in
[`docs/design-references/hero-wave-curve/`](../design-references/hero-wave-curve/). The visual review
covers the initial pose and 12/30/60 seconds of simulated animation time. The same production
regression checks cover rendering performance, pause/resume, history, and fallback behavior.
