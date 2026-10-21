# Guide me: 15-second framed painting intro

Updated 2026-10-22. Homepage **Guide me** (desktop/mobile) enters `/guide`, then replaces that history entry with `/personalize?browse=1` after **15,000 ms of visible, unpaused animation**. The artwork remains the local public-domain *The Starry Night*. This revision keeps the collaborative workspace and popups, slows the action, places comments beside their context, and adds a seventh agent that crafts a photographic frame.

## Reference and visual scope

Reference: https://www.affectui.com/components/agent-cursors, previously inspected in Chrome on 2026-10-21. The user also supplied screenshots of its dark comment card and the local painting composition. The public Clean preview supplies the visual vocabulary: Inter, a white rounded sheet, compact provider faces, colored pointers, dark gradient-edged flags, inline edits, comment pins, Reply and a white check button. All code is independently authored React/CSS/SVG/Canvas. No Pro source or remote runtime is used.

The painting stays between two prose columns on desktop and above them on phones. On desktop, comments open beside the relevant prose or frame, in local whitespace between the main paragraph and its detail. DOM ranges measure the actual written lines, placing the card immediately below its text without being pushed away by reserved paragraph height. Writer comments follow the right-hand brushwork prose; frame comments sit beside the frame. On portrait phones, a reserved contextual gap immediately after the artwork and before the biography holds the active card. There is no bottom comment rail. These spaces keep popup windows away from the painting and actual text. It keeps the black card, agent mark/name and “now”, streamed message, Reply field and resolve action. Pins stay next to their individual text or painting anchors. Exactly one popup expands at a time; reopening an earlier pin temporarily replaces the scheduled card.

The final scope is the 2D workspace requested in the user's latest clarification. No museum/camera module, WebGL renderer, 3D texture assets or new dependencies remain in this change. There are no external headings, duration labels or visible playback controls.

## Choreography in milliseconds

| Time | Behavior |
| --- | --- |
| 0–350 | Empty canvas; painters arrive softly |
| 350–13,000 | Four painters reveal color continuously under their wand tips |
| 775–12,710 | Two writers type, revise and finish the surrounding story |
| 1,200–12,800 | Frame maker reveals photographed moulding along a rounded perimeter |
| 2,400–5,200 | Researcher popup verifies the date |
| 5,500–8,300 | Colorist popup discusses moonlight |
| 8,600–11,300 | Writer popup connects the image and story |
| 11,500–13,800 | Frame maker popup describes the completed frame |
| 13,000–14,700 | Finished painting and frame; agents withdraw |
| 14,700–15,000 | Gentle white fade, then navigation |

The uninterrupted run lasts 15 seconds. Hovering, focusing or pinning a comment pauses it so reading/replying is not interrupted by navigation; leaving or collapsing resumes it. Hidden tabs also pause elapsed time.

## Rendering and responsive behavior

Painter trajectories are resampled by physical distance and use short acceleration/deceleration ramps. The same points drive the accumulating paint mask, decorative pointer tips, golden ribbons and fading sparks. There are no sketch/blueprint resets. The last antialiased gaps blend in over 500ms. Canvas backing stores cap device-pixel scaling; only three offscreen buffers are needed.

The frame uses a real archival photograph of a poplar Cassetta frame (ca. 1630, accession 1975.1.2339), downloaded from The Met Open Access (CC0). Eight inline SVG viewports preserve the actual moulding, grain, wear and corner joints. SVG component transfer gives the monochrome photograph a warm gold tone; it is not a generated raster texture. See `asset-map.json` for the original file, hash, metadata and treatment.

A single broad, closed reveal mask starts at the middle of the top edge, with overlapping coverage around each photographed joint. On completion the dash becomes a solid closed mask, sealing the previous top-corner gap. The Frame maker follows a rounded path with a smooth acceleration/deceleration envelope and subtle wand movement. A measured screen-distance lookup keeps travel speed even on differently shaped viewports; the same mapped path distance drives both pointer and reveal. Resize reconstructs the current frame without restarting the clock.

Writers target real DOM caret anchors. React text/layout changes and resize/scroll update those targets; the animation loop interpolates toward each anchor, including line wraps. Cursor decorations are clipped to the document region so they remain inside the workspace. The original painting's 1280:1014 ratio is preserved.

The sheet has a viewport-bound maximum height. Portrait phone cards sit between the artwork and biography, close to both; landscape uses the side columns. The card width follows its contextual slot, with smaller typography on short screens. The discussion scrolls independently while Reply and resolve stay visible, including after local replies. A compact artwork size keeps the 320?568 view usable; very short screens can scroll the document without creating page overflow.

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
- Frame: `FrameCraft.tsx` plus the frame stroke/motion updates in `GuideIntro.tsx`.
- Prose: `ArtworkNotes.tsx`, `artwork-notes.css`.
- Contextual comment placement and interactions: `AgentComments.tsx`, `agent-comments.css`.
- Shared cursor/presence: `src/components/sites/affectui-agent-cursors/`.
- Artwork/frame provenance: `public/sites/guide-intro/starry-night.jpg`, `cassetta-frame-met.jpg`, `asset-map.json`.
- Existing destination: `/personalize?browse=1`, unchanged.

## Verification

Run `node scripts/qa/guide-intro.mjs [base-url]`. Current reports/screenshots are in `qa/contextual/`; `qa/framed/`, `qa/wands/`, `qa/workspace/` and `qa/fullscreen/` document superseded versions.

The browser suite covers progressive/localized paint, smooth painter travel, original-image final output, caret alignment through phone reflow, inline edits, all seven provider controls, popup streaming/hover/replies/resolve, reading pauses, Escape scope, touch, six workspace viewports, resize, keyboard controls, reduced motion, asset retry, both homepage entrances, direct browse and WebKit. New checks validate all four popups on desktop/phone/landscape without painting or text overlap, unobstructed Reply hit targets, no stacked dialogs, pin-to-card movement, continuous line-wrap collision checks, real photographic image decoding, screenshot pixels proving frame progress and sealed corners at desktop/phone sizes, and frame-maker acceleration/turn-angle bounds.

Final verification on 2026-10-22: **24/24 browser groups pass**, including all four contextual popups, unobstructed Reply targets, continuous line-wrap collision checks, touch, resize, real texture loading, sealed frame corners and softened frame-maker turns. No runtime errors or external runtime origins were recorded. `npm run check` passes lint, typecheck and production build (seven unrelated existing lint warnings); the final CSS change was also rebuilt successfully. Current evidence: [browser report](qa/contextual/report.json), [desktop with Frame maker popup](qa/contextual/frame-maker-1440.png), [390px mobile](qa/contextual/frame-maker-390.png), [320px mobile](qa/contextual/frame-maker-320.png), [completed frame](qa/contextual/completed-frame-390.png). Local browser measurements are not physical-device benchmarks.
