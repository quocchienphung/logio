# Guide me: five-second collaborative art workspace

Homepage **Guide me** (desktop and mobile) opens `/guide`, then replaces that history entry with `/personalize?browse=1` after **5,000 ms of visible, unpaused animation**. Direct workspace links bypass the intro. The local artwork is *The Starry Night*, chosen because this request did not include a painting attachment.

## Public reference and adaptation

Reference: https://www.affectui.com/components/agent-cursors, inspected in Chrome on 2026-10-21. The public Clean preview shows a white rounded document, a 44px header, provider presence, a floated image with text, live character-anchored pointers, inline suggestions and comment pins. Observed values: Inter 13px/20px; source sheet 700px wide, 12px corners; 24px presence faces; pointer viewBox `-2.186 -0.256 18.514 22.277`; dark cursor flags with gradient edges and 8px corners. Public documentation describes pointer tracking through wrapping and reduced motion.

The local version independently recreates that visual vocabulary in React/CSS/Canvas. It adapts the document to a central framed painting with prose on either side, on a pure white page. There are no external headings, explanatory captions, duration labels or playback controls. The small header contains only a document glyph and working provider follow controls. The source's Doc/Table tabs, suggestion approval controls, cost totals and code blocks are outside this timed intro's scope. This is an intentional content/layout adaptation, not a claim of pixel equality to the original launch-brief document. No Pro source or production bundle is imported.

## Timeline

| Time | Visible behavior |
| --- | --- |
| 0–220ms | Blank framed canvas; agents arrive |
| 220–1,250ms | Four painters draw pencil contours; two writers type the biography |
| 1,250–1,680ms | Construction grid and blue contours |
| 1,680–4,450ms | Color accumulates under the four cursor trajectories; writers revise the date and a descriptive phrase |
| 4,450–4,800ms | Entire original painting and completed prose; agents leave |
| 4,800–5,000ms | Sheet fades to white, then navigation begins |

The canvas keeps the artwork's 1280:1014 ratio at every size. Four staggered serpentine paths build an accumulating mask: color appears only where painters have passed. Skipped browser frames are subdivided so strokes remain continuous. The final frame draws the entire original image. The existing local public-domain artwork and provenance in `asset-map.json` are reused; no image-generation service is called.

The other two cursors follow real DOM caret anchors in paragraphs. Both initial typing and inline deletion/insertion happen during the five-second run. A layout effect remeasures anchors after text changes and responsive reflow. On phones the painting moves above two prose columns. Small landscape layouts return to three columns. Cursor flags turn inward near the right edge.

## Behavior and accessibility

- Destination prefetch begins on mount. Automatic navigation uses `router.replace` so Back does not replay the intro.
- Space pauses/resumes from the page; Escape and a keyboard-focusable skip link continue immediately. There are no visible playback controls.
- Hidden tabs pause the clock, including the first frame after returning.
- Provider avatars support following one agent and dimming teammates.
- Reduced motion shows completed art/prose without cursor motion, then continues at five seconds.
- Full stable prose is available to screen readers; visual letter-by-letter text and decorative pointers are hidden from them.
- Asset failure displays Retry and Continue actions; a retry resets elapsed time. Animation frames, observers, listeners and canvas buffers clean up on unmount.
- This is a deterministic simulation. It does not invoke live agents or external tools.

## Ownership and routes

- `/`: both Guide me entries in `src/components/stripe/Navigation/Navigation.tsx` point to `/guide`.
- `/guide`: `src/app/guide/page.tsx`, `src/components/sites/guide-intro/`.
- `/personalize?browse=1`: existing Guide navigation destination, unchanged.
- Shared cursor/presence visuals: `src/components/sites/affectui-agent-cursors/`.
- Artwork: `public/sites/guide-intro/starry-night.jpg`.

## Verification

`node scripts/qa/guide-intro.mjs` writes the current report and representative screenshots to `qa/workspace/`. It checks blank/sketch/blueprint/color/final output, localized cursor-to-paint correlation, DOM caret alignment through phone reflow, visible edits, provider following, the five-second automatic transition and history replacement, six responsive viewport sizes (including 320px phones and landscape), resizing during animation, keyboard controls, reduced motion, asset retry, both homepage entrances, direct workspace access and WebKit rendering. Runtime errors and external origins are recorded. Earlier `qa/fullscreen/` artifacts describe the superseded edge-to-edge experiment.

Final validation on 2026-10-21: all 14 browser groups pass on `localhost:3000`; a separate run against the production build on port 3001 also passed all 14 groups. `npm run check` passes lint, typecheck and production build (10 unrelated lint warnings remain). The browser report is the source of truth for the latest run; frame timing is a local-browser measurement, not a physical-device performance benchmark.
