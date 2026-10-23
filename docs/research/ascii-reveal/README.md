# Glyph loading effect (ascii-reveal)

Source of the idea: the public demo <https://quanhoangindex.github.io/ascii-reveal/> ("A loading effect for React", MIT licensed per its footer). It was read through the rendered page only (`scripts/forensics/ascii-reveal-capture.mjs`, `ascii-reveal-presets.mjs`: requests, DOM, screenshots over time in `source/`). Its code, images, fonts and artwork were **not** copied or loaded; the effect in `src/components/sites/ascii-reveal/` was written independently from what was seen.

## What was observed

- While content loads, it is covered by a field of monospace glyphs; when it arrives the glyphs "decode" and dissolve cell by cell in a wave that starts from a point, uncovering the real content.
- Four looks (Decode: scrambling symbols; Dither: ordered-dither ramp `.:-=+*#`; Terminal: row-by-row sweep with a block cursor; Blueprint: blue `+` crosses on a measured grid), three wave origins (centre, corner, cursor), a speed slider 0.4–2×, a Replay control. Hooks `data-ascii="surface|fade|skip"` mark parts of a page for the library.
- Demo-specific parts (spider mascot, hero art, cards, "aura" counter) are not part of the effect and are not reproduced.

## What was built

| Piece | File | Role |
| --- | --- | --- |
| Maths | `glyph-field.ts` | Grid (cells 9 × 16 or larger, ≤ 5200), wave distance from an origin, per-cell delay, the loading pattern and the dissolve for each look. Pure; 7 tests in `glyph-field.test.mjs`. |
| Renderer | `GlyphCover.tsx` | `mountCover()` puts one `<canvas>` over the content panel (`.ui-as-main`), animates it on `requestAnimationFrame`, removes it when done. |
| Loading half | `AsciiLoading` (in `AsciiReveal.tsx`), mounted by `SectionSkeleton` | After 200 ms of waiting the moving field covers the panel (the skeleton stays in the tree underneath for screen readers). Gives up after 12 s. |
| Reveal half | `revealed(Component)` / `AsciiReveal`, used for every lazily loaded page in `Crm.tsx` | When the page arrives **after a wait that was seen** (`wait-note.ts`), the field dissolves from where the person last pressed. A page that opens at once gets nothing. |
| Setting | Settings → Appearance → **Loading effect** (Decode / Dither / Terminal / Blueprint / Off); **Interface motion** off also disables it | Read from `data-ascii-preset` / `data-ui-motion` on `.crm-page`. Reduced motion disables it too. |

Timing: the wave crosses the panel in 640 ms at speed 1 plus 360 ms per cell, hard cap 1.8 s; the first frame of the dissolve is identical to the loading field, so the end of the wait has no jump.

## Risk review (what could leak, and what could hurt the source site or this app)

| Risk | Finding in the source | Decision here | Evidence |
| --- | --- | --- | --- |
| Visitors' IP and font choice sent to a third party | The demo loads Geist from `fonts.googleapis.com` / `fonts.gstatic.com` (and its `load` event can hang while it waits) | No web fonts: the canvas uses the system monospace stack; no outside host is ever contacted | `ascii-reveal.mjs` records every request during the effect: none to another origin; audit forbids `https?://`, `FontFace`, `@import` |
| Reading page content ("decodes your real content") | The library reads/clones the DOM it wraps | The cover **never reads** the page: glyphs come from fixed literal sets, so passwords, form values and private text cannot reach the canvas or be exfiltrated | audit forbids `textContent`, `innerText`, `.value`, `FormData`, clipboard, `getImageData`, `toDataURL`; tests assert every glyph is printable ASCII from the fixed sets |
| Sending or storing data | None observed (no cookies, no storage, no beacons) | None either: no fetch/XHR/WebSocket/storage; the only shared state is a module variable noting that a wait was seen | audit |
| Code execution / injection | A client-side bundle | No `eval`, `new Function`, string timers, `innerHTML` or `dangerouslySetInnerHTML`; no new dependencies (only React) | audit |
| Trapping input or hiding the page | An overlay could block clicks or screen readers | Canvas is `pointer-events: none`, `aria-hidden`, created and removed by `mountCover`; the skeleton `role="status"` stays; reveal is ≤ 1.8 s, loading gives up at 12 s so a stuck page is never hidden for good | QA: `elementFromPoint` is never the canvas; stuck-load case |
| Performance abuse (huge windows, hidden tabs) | n/a | Cell count capped, DPR capped at 1.5, loading field drawn at ≤ 30 fps, paused while the tab is hidden | `gridFor` tests; frame average measured in QA |
| Accessibility and motion sensitivity | Respects reduced motion? not verified | Off for `prefers-reduced-motion`, for Loading effect = Off and for Interface motion off | QA cases |
| Load on the source site | A public static demo | The scan made one visit (≈17 requests, 3 replays); nothing in the app calls it at runtime, so the app can never load or hot-link it | capture scripts only; the runtime has no reference to the demo's domain |
| Licence / attribution | MIT | No code copied; the demo is credited here as the inspiration; none of its assets are reused | this file |

## QA

```sh
node scripts/qa/ascii-reveal.mjs [base-url]     # 23 checks: slow load simulated by holding back JS chunks
node scripts/qa/ascii-reveal-audit.mjs          # 12 static safety checks over the module
npm test                                        # glyph-field.test.mjs (pure maths)
```

`ascii-reveal.mjs` checks: one loading field over exactly the content panel; inert and hidden from assistive technology; the page under it still reachable; ≥ 17 fps while it moves; loading → dissolve → nothing left over; a page that is already loaded gets no effect; each look; Off, Interface motion off and reduced motion; a stuck load; no request to another site; no page errors. Screenshots in `qa/`.

## Known limits

- Cursor-origin waves start from the last press (not live hover); keyboard navigation reuses the last press or the centre.
- The loading field covers the content panel only (the sidebar stays live), and only for pages loaded lazily from `Crm.tsx`; the Settings panel and statically bundled pages do not use it.
- "Dither" and "Terminal" are this project's interpretations of the observed looks, not pixel copies.
