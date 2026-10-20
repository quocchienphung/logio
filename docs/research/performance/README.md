# Browser bottleneck audit — 2026-10-20

Scope: the production build after removing the homepage iPhone Duo section and
its renderer prewarm. This audit adds diagnostic tooling; it does not change the
application's rendering or transition behavior.

## Environment and limits

- Local `next start`, port 3100, Chrome headless, 1440 × 1000, DPR 1, no CPU or
  network throttling. AMD Radeon integrated GPU through ANGLE/D3D11.
- Tests ran sequentially. Fresh browser contexts for startup controls; OS assets
  and shader caches can remain warm. This is a local diagnosis, not field data.
- rAF gaps measure main-thread callback scheduling, **not presented-frame FPS**.
  GPU/compositor animations can continue during a main-thread gap.
- Two startup runs per variant; one navigation suite per variant. Differences
  between navigation suites are exploratory and should not be called a stable
  performance improvement. The no-WebGL control changes rendering and therefore
  cannot predict the exact benefit of deferred initialization.
- Ignore the cached-back-navigation worst-gap and response-start metrics in the
  navigation JSON: the existing collector can include the time spent in bfcache
  and the original navigation timing. Conclusions below use ordinary link loads.

## Findings

### Initialization starts well beyond the visible viewport

Both ordinary homepage startup samples created six WebGL contexts without any
scrolling: developer wave, hero wave, agentic particles, issuing card, crypto
globe, and stats data visualization. The developer wave initialized before the
hero in both samples. Visibility checks pause animation but do not prevent these
constructors and imports from running.

In the approximately 5.5-second startup window:

| Diagnostic variant | Sum of long-task durations, run 1 / 2 | Sum of portions beyond 50 ms, run 1 / 2 | Worst task, run 1 / 2 |
| --- | --- | --- | --- |
| Current homepage | 1390 / 722 ms | 790 / 272 ms | 260 / 152 ms |
| WebGL denied, fallback rendering | 425 / 418 ms | 175 / 168 ms | 139 / 138 ms |

The second column includes all time inside tasks longer than 50 ms. The third
column is a diagnostic blocking-time sum, **not Lighthouse TBT**; it uses a
different observation window. Its two-sample average is 531 ms versus 171.5 ms.
Initial response-start timings in this control were 9–11 ms.

The general homepage audit also found 2,114,551 decoded bytes of scripts
(558,314 encoded bytes), 3,960 DOM nodes, and scroll-triggered long tasks of
80–109 ms. No application page errors were observed in that suite.

### Transition effects add cost, but removing filters is insufficient

For Payments → homepage in the ordinary navigation suite:

- Server response began 22 ms after the synthetic link click.
- Page reveal occurred at 249 ms after the click.
- Transition settled 2,151 ms after reveal.
- Largest rAF scheduling gap in the recorded transition window: 401 ms.
- A 294 ms timer callback and 280 ms idle callback appeared after transition;
  a globe map-image callback took 116 ms. Work being scheduled at idle does not
  make the callback interruptible.

With just the transition SVG/lens/text filters overridden to `none` in the test
browser, Payments → homepage settled 1,065 ms after reveal, but its worst rAF gap
was still 431 ms. Homepage → Payments also remained expensive. This supports
addressing startup and transition work separately, rather than treating filters
as the entire cause. These timings need repeated runs before claiming a gain.

## Recommended implementation order

1. **Defer both import and construction of offscreen renderers until near the
   viewport**, and prioritize the hero. Keep existing static fallbacks while
   preparing the scene; initialize once, then continue using visibility-based
   pause/resume. Start preloading sufficiently ahead of scrolling and measure
   first-entry stalls. Simply deleting `WarmChunks` would not fix components
   whose effects already import eagerly.
2. **Split expensive initialization into bounded tasks**, targeting roughly
   4–8 ms of synchronous work per slice where practical. Move transferable CPU
   geometry/dot generation to workers if profiling shows it is still material.
   WebGL context creation, DOM layout and GPU work need separate treatment.
   `runHeavy` serializes entire tasks but does not interrupt a 200 ms task.
3. **Offer an adaptive lighter transition** using the existing disc/reveal
   structure with fewer lens/fringe passes. Evaluate the intentional 1.6× timing
   multiplier separately: shortening an animation reduces waiting but does not
   remove blocking tasks. Verify with compositor/GPU traces and real devices.
4. Profile remaining style/layout and hydration costs after those changes.
   Batch geometry reads before style writes where evidence shows forced layout;
   retain static markup outside the client-interactive boundaries.

Acceptance should compare repeated cold/warm loads, rapid scrolls, link/back
navigations, and a midrange mobile device. Track actual input latency and long
tasks as well as frame presentation. No approach guarantees zero jank on every
browser and device.

## Reproduce

Run each benchmark separately against the production server:

```powershell
node scripts/forensics/app-performance-audit.mjs http://localhost:3100
node scripts/forensics/browser-startup-audit.mjs http://localhost:3100
node scripts/forensics/navigation-performance-audit.mjs http://localhost:3100 --out docs/research/performance/navigation-full.json
node scripts/forensics/navigation-performance-audit.mjs http://localhost:3100 --no-filters --out docs/research/performance/navigation-no-filters.json
```

Raw observations: `audit.json`, `browser-startup.json`, `navigation-full.json`,
and `navigation-no-filters.json` in this directory.
