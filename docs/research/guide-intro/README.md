# Guide me: 15-second framed painting intro

Updated 2026-10-22. Homepage **Guide me** (desktop/mobile) enters `/guide`, then replaces that history entry with `/personalize?browse=1` after **15,000 ms of visible, unpaused animation**. The artwork remains the local public-domain *The Starry Night*. This revision keeps the collaborative workspace and popups, slows the action, places comments beside their context, and has eight agents, including a frame maker and a dedicated laser engraver.

## Reference and visual scope

Reference: https://www.affectui.com/components/agent-cursors, previously inspected in Chrome on 2026-10-21. The user also supplied screenshots of its dark comment card and the local painting composition. The public Clean preview supplies the visual vocabulary: Inter, a white rounded sheet, compact provider faces, colored pointers, dark gradient-edged flags, inline edits, comment pins, Reply and a white check button. All code is independently authored React/CSS/SVG/Canvas. No Pro source or remote runtime is used.

The painting stays between two prose columns on desktop and above them on phones. On desktop, comments open beside the relevant prose or frame, in local whitespace between the main paragraph and its detail. DOM ranges measure the actual written lines, placing the card immediately below its text without being pushed away by reserved paragraph height. Writer comments follow the right-hand brushwork prose; frame comments sit beside the frame. On portrait phones, a reserved contextual gap immediately after the artwork and before the biography holds the active card. There is no bottom comment rail. These spaces keep popup windows away from the painting and actual text. It keeps the black card, agent mark/name and “now”, streamed message, Reply field and resolve action. Pins stay next to their individual text or painting anchors. Exactly one popup expands at a time; reopening an earlier pin temporarily replaces the scheduled card.

The final scope is the 2D workspace requested in the user's latest clarification. No museum/camera module, WebGL renderer, 3D texture assets or new dependencies remain in this change. There are no external headings, duration labels or visible playback controls.

## Choreography in milliseconds

| Time | Behavior |
| --- | --- |
| 0–550 | Painters dispatch with crisp fades and curved approaches |
| 350–13,000 | Four painters reveal color continuously under their wand tips |
| 775–12,710 | Two writers type, revise and finish the surrounding story |
| 1,200–12,800 | Frame maker reveals photographed moulding along a rounded perimeter |
| 2,400–5,200 | Researcher popup verifies the date |
| 5,500–8,300 | Colorist popup discusses moonlight |
| 8,600–11,300 | Writer popup connects the image and story |
| 9,080–13,700 | Engraver arrives and cuts the signature directly into white |
| 11,500–13,800 | Frame maker popup describes the completed frame |
| 13,000–14,700 | Finished painting and frame; agents withdraw |
| 14,700–15,000 | Gentle white fade, then navigation |

The uninterrupted run lasts 15 seconds. Hovering, focusing or pinning a comment pauses it so reading/replying is not interrupted by navigation; leaving or collapsing resumes it. Hidden tabs also pause elapsed time.

## Rendering and responsive behavior

The painters dispatch with 80ms opacity ramps and 210ms, decisive curved approaches. Once at work, their trajectories combine broad sweeps with nested orbits, resampled by physical distance with short acceleration/deceleration ramps. The same points drive the accumulating paint mask, decorative pointer tips, three braided filaments per painter, orbit arcs and spiraling fireflies. The colors pair cool blue/violet/teal/rose with a warm white core; real paint remains localized under the same path. There are no sketch/blueprint resets. The last antialiased gaps blend in over 500ms. Canvas backing stores cap device-pixel scaling; only three offscreen buffers are needed.

The frame uses a real archival photograph of a poplar Cassetta frame (ca. 1630, accession 1975.1.2339), downloaded from The Met Open Access (CC0). Before the clock starts, `studio-materials.ts` combines eight photographic moulding/corner crops and their warm gold color transfer into a cached, transparent 2000×1600 bitmap. The original photo stays unchanged. One SVG image replaces the former eight live viewports and color filters. See `asset-map.json` for provenance.

A simple polygon clip reveals the photographic frame clockwise from the middle of its top edge. Completion removes the clip and seals every joint, including the previous top-corner gap. The Frame maker follows a rounded path with a smooth acceleration/deceleration envelope and subtle wand movement. A measured screen-distance lookup keeps travel speed even on differently shaped viewports; the same sampled coordinates drive pointer and reveal without per-frame SVG geometry reads. Resize reconstructs the current frame without restarting the clock.

Writers target real DOM caret anchors. React text/layout changes and resize/scroll update those targets; the animation loop interpolates toward each anchor, including line wraps. Cursor decorations are clipped to the document region so they remain inside the workspace. The original painting's 1280:1014 ratio is preserved.

The sheet has a viewport-bound maximum height. Portrait phone cards sit between the artwork and biography, close to both; landscape uses the side columns. The card width follows its contextual slot, with smaller typography on short screens. The discussion scrolls independently while Reply and resolve stay visible, including after local replies. A compact artwork size keeps the 320?568 view usable; very short screens can scroll the document without creating page overflow.

## Direct laser signature

At 9,080ms, a dedicated Engraver dispatches to the center below the frame. From 9,400 to 13,700ms it traces the actual glyph outlines of the fixed inscription **© Remplacé par Logio**. Masked cuts accumulate along those same outlines, with measured pen-up transits between letters. The point of the pointer connects to the exact burn contact, with a small orange/white heat spot, ten small ballistic sparks and a faint ablation wisp. The finished engraving stays visible through the final hold.

The signature is cut directly into the white workspace. There is no plate, border, rivet, colored rectangle or substrate shadow. A local CC0 photograph of plaster from Poly Haven supplies real grain only inside the letter cuts; neutral shading and opposing edge shadows give shallow recesses against the untouched white surface. The abandoned metal plaque and its asset were removed. All rendering remains 2D SVG/Canvas.

The laser uses the same elapsed clock as the painters and comments: Space, reading a popup and hidden tabs freeze its contact, sparks and progress. Reduced motion shows the finished engraving without the tool or sparks. Resize remeasures the SVG-to-screen transform. The signature component is memoized, and outline geometry is prebuilt from the existing local Inter font; there is no font parsing at runtime. Photo grain and shallow cut shading are prepared once as a transparent 1440×192 bitmap. Completed letters share a clip; only the active letter has a live stroke mask. A half-unit sampled outline lookup moves the contact without per-frame SVG geometry reads or interpolation across disconnected contours.

## High refresh rendering

One native `requestAnimationFrame` clock drives paint, pointers, frame and laser using elapsed milliseconds. There is no 30/60 FPS limiter or frame-count-based speedup. React publishes streamed text at most once per 32ms; pointer motion continues on every browser frame. Identical DOM/style writes are cached, layout reads are batched before writes, and writer/comment positions are measured only when actual text layout changes. Cursor clipping uses a bounded overflow container. Decorative presence rings and caret blinks stay static during this intro.

The painting keeps its full composition and magical filaments. Reusable ribbon buffers and a cached glow sprite reduce allocations and repeated gradient work. Its Canvas backing resolution caps at 1.5 device pixels per CSS pixel; source artwork and real photographic frame/plaster remain unchanged. Texture preparation finishes before the 15-second clock starts. Hidden tabs and interaction pauses do not advance choreography.

This enables native high refresh scheduling; actual 120 FPS presentation still depends on the physical display, browser and device load. Headless Chromium/WebKit measurements and a synthetic 120 Hz timing test do not establish physical iPhone FPS.

## Interactions and accessibility

- Timed comments stream in with a 440ms entrance, then fold back to their pins.
- Hover, keyboard focus or tap reopens a pin. A short 280ms leave delay lets a pointer cross from a pin to its card without closing it.
- Reply + Enter adds a local reply. The check resolves the comment and removes its pin. No external message is sent.
- The header mark or Escape collapses the popup. Escape inside a popup does not skip the intro.
- Provider faces follow an agent and dim its teammates.
- Space pauses/resumes from the page. Escape outside comments and a keyboard-focusable skip link continue immediately.
- Reduced motion shows the completed artwork, full frame and stable prose, hides decorative moving cursors/timed popups and continues after 15 seconds.
- Complete stable text is available to screen readers. Hidden/resolved comments become inert and leave the accessibility tree.
- Artwork failures offer Retry and Continue; retry resets elapsed time. Frames, observers, listeners, timers and buffers clean up on unmount.

This is a deterministic visual simulation; no live agent or image-generation service is invoked.

## Files and route map

- Homepage entrances: `src/components/stripe/Navigation/Navigation.tsx` → `/guide`.
- Route: `src/app/guide/page.tsx`.
- Layout, visibility-aware clock, pointer movement and navigation: `GuideIntro.tsx`, `guide-intro.css`, `studio-timeline.ts`.
- Paint: `painter.ts`.
- Cached photographic materials and frame-safe writes: `studio-materials.ts`, `frame-style.ts`.
- Frame: `FrameCraft.tsx` plus the frame stroke/motion updates in `GuideIntro.tsx`.
- Laser: `LaserSignature.tsx`, `engraver.ts`, `laser-signature.css`, `engraving-paths.json`; fixed-outline builder: `scripts/guide-intro/build-engraving.py`.
- Prose: `ArtworkNotes.tsx`, `artwork-notes.css`.
- Contextual comment placement and interactions: `AgentComments.tsx`, `agent-comments.css`.
- Shared cursor/presence: `src/components/sites/affectui-agent-cursors/`.
- Artwork/frame provenance: `public/sites/guide-intro/starry-night.jpg`, `cassetta-frame-met.jpg`, `engraving-plaster.jpg`, `asset-map.json`.
- Existing destination: `/personalize?browse=1`, unchanged.

## Verification

Run `node scripts/qa/guide-intro.mjs [base-url]`. Current reports/screenshots are in `qa/high-refresh/`; `qa/enchanted/`, `qa/contextual/`, `qa/framed/`, `qa/wands/`, `qa/workspace/` and `qa/fullscreen/` document superseded versions.

The browser suite covers progressive/localized paint, smooth painter travel, original-image final output, caret alignment through phone reflow, inline edits, all eight provider controls, popup streaming/hover/replies/resolve, reading pauses, Escape scope, touch, six workspace viewports, resize, keyboard controls, reduced motion, asset retry, both homepage entrances, direct browse and WebKit. New checks validate all four popups on desktop/phone/landscape without painting or text overlap, unobstructed Reply hit targets, no stacked dialogs, pin-to-card movement, continuous line-wrap collision checks, real photographic image decoding, screenshot pixels proving frame progress and sealed corners at desktop/phone sizes, and frame-maker acceleration/turn-angle bounds.

The suite additionally checks decisive dispatch, curved magic trails, the eighth agent, direct white-surface engraving and 8.333ms synthetic callbacks. The latter verifies the 15-second clock, completion and pause/resume without claiming display FPS.

Latest result: **28/28 checks passed** against the production server, including Chromium, WebKit, responsive popup collision checks and synthetic 120 Hz timing. Targeted ESLint and the production build (including TypeScript) passed. The finished image and original photographic assets were visually verified at desktop and phone sizes.

Production performance capture: `node scripts/forensics/guide-intro-performance.mjs http://localhost:3012 final` and the same command with `final-webkit --webkit`. Raw reports live in `qa/performance/`. Chromium phone measurements use a 390×844 viewport, DPR 3 and 4× CPU slowdown; WebKit uses the same viewport/DPR without CPU throttling. Compare callback cost, style/layout work and frame intervals separately; callback timing excludes GPU presentation and startup material preparation.

Measured on the same local production setup, before versus after:

| Configuration | Animation callback p95 before | After |
| --- | ---: | ---: |
| Chromium desktop, DPR 1 | 1.2ms | 0.5ms |
| Chromium phone, DPR 3, CPU 4× | 5.7ms | 1.8ms |
| Headless WebKit desktop, DPR 1 | 3ms | 1ms |
| Headless WebKit phone, DPR 3 | 3ms | 1ms |

Chromium phone style recalculations over the measured run decreased from 10,659 to 2,301. WebKit's timing is coarse; its phone p95 frame interval remains 93ms in this headless environment (previously 127ms), so these results must not be described as 120 FPS on Safari or a real iPhone. Texture/outline setup can create startup long tasks, which complete before visible animation begins.
