# Guide me: ten-second collaborative art workspace

Homepage **Guide me** (desktop/mobile) opens `/guide`, then replaces that history entry with `/personalize?browse=1` after **10,000 ms of visible, unpaused animation**. This revision supersedes the five-second sketch/blueprint experiment. The artwork remains the local public-domain reproduction of *The Starry Night*; provenance is in `asset-map.json`.

## Reference and adaptation

Reference: https://www.affectui.com/components/agent-cursors, inspected in Chrome on 2026-10-21. The public Clean preview uses Inter 13px/20px, a white document sheet with 12px corners and a 44px header, 24px provider faces, colored pointers, dark flags and inline edits. The user supplied a close-up of the Researcher comment: dark rounded card, provider mark/name and “now”, a streamed message, gray Reply field and white check button. Local comment cards follow that structure at a 310px maximum width. This is independently authored React/CSS/Canvas; no Pro source, remote runtime, screenshot renderer or iframe is used.

The local art document keeps the framed painting between two prose columns, on a pure white page. Phones move the painting above the text; short landscape screens use three columns. There are no external titles, explanatory captions, visible duration labels or playback controls. Source Doc/Table tabs, cost totals and suggestion approval controls are outside this timed intro's scope. The composition is an intentional art-content adaptation, not a claim that the launch-brief document is pixel-identical.

## Continuous animation

| Time | Behavior |
| --- | --- |
| 0–350ms | Empty framed canvas; agents arrive |
| 350–8,600ms | One uninterrupted painting pass; writers type and revise prose alongside it |
| 1,900–4,050ms | Researcher comment types in, then folds into its pin |
| 4,350–6,500ms | Colorist comment about the warm moonlight |
| 6,800–9,100ms | Writer comment connects the painting with its story |
| 8,600–9,700ms | Completed painting and prose; agents withdraw |
| 9,700–10,000ms | White fade and automatic navigation |

The former sketch/blueprint/color resets are removed. Four curved regional brush paths are resampled by physical distance at resize time, with brief acceleration/deceleration ramps and steady travel through each sweep. Cursor tips and the accumulating color mask share those paths. Golden ribbons, a small glow and fading sparks trail the active tips. Skipped frames are subdivided; the final antialiased edge gaps blend in over 400ms. The renderer now needs only three offscreen buffers. The painting always keeps its original 1280:1014 proportions.

Writers follow actual DOM caret anchors. Their targets are measured after React text changes and on resize; the requestAnimationFrame loop gently interpolates toward each target, including line wraps. Unlike CSS transitions, this movement shares the same clock as the painters. DOM text updates at most about 30 times per second; canvas and cursor movement use animation frames. Observers, frames, event listeners and buffers clean up on unmount.

## Comment interactions

- Timed comments expand from their pins with a soft 330ms entrance, type their message, then fold back into pins.
- Hover, keyboard focus or tapping a pin reopens its comment. The message completes immediately while it is being read.
- Hovering/focusing a comment, or keeping it pinned open, pauses the scene. Leaving/unpinning resumes it. The uninterrupted scene lasts ten seconds; deliberate interaction extends wall-clock time so navigation does not interrupt a reply.
- Reply + Enter adds an actual local reply to that comment. It sends no external message and invokes no model.
- The white check resolves the comment and removes its pin. The header mark or Escape collapses the popup; Escape inside a comment does not skip the scene.
- Cards clamp horizontally to the viewport and open upward when needed near the bottom. The same controls support touch.
- Comment windows are accessible nonmodal dialogs. Hidden/resolved comments become inert and leave the accessibility tree; full stable message text is available to screen readers.

## Other behavior

The destination is prefetched on mount; `router.replace` prevents Back from replaying the intro. Space pauses/resumes from the page. Escape outside comments and a keyboard-focusable skip link continue immediately. Hidden tabs pause elapsed time, including the first frame after return. Provider faces follow an agent and dim the others. Reduced motion shows completed artwork/prose without moving cursors or timed comment windows, then continues at ten seconds. An artwork load failure offers Retry and Continue; retry resets elapsed time.

Everything is a deterministic visual simulation. There are no live agents, external tool calls or runtime image-generation requests.

## Ownership

- Homepage entrances: `src/components/stripe/Navigation/Navigation.tsx` → `/guide`.
- Route: `src/app/guide/page.tsx`.
- Animation/layout: `src/components/sites/guide-intro/GuideIntro.tsx`, `painter.ts`, `studio-timeline.ts`, `guide-intro.css`.
- Prose: `ArtworkNotes.tsx`, `artwork-notes.css`.
- Comment pins, popup, replies and resolve behavior: `AgentComments.tsx`, `agent-comments.css`.
- Shared cursor/presence: `src/components/sites/affectui-agent-cursors/`.
- Artwork: `public/sites/guide-intro/starry-night.jpg`.
- Destination: existing `/personalize?browse=1`, unchanged.

## Verification

`node scripts/qa/guide-intro.mjs [base-url]` writes current results and screenshots to `qa/wands/`. The 19 groups cover progressive/localized paint, steady pointer travel across the former phase boundaries, original-image final output, DOM caret alignment through phone reflow, inline edits, provider following, popup streaming/hover/folding, reply/resolve, pause while reading, Escape scope, phone and landscape card bounds, touch, six workspace viewports, resize during painting, keyboard controls, reduced motion, asset retry, both homepage entrances, direct browse access, WebKit and the ten-second history-replacing transition. Runtime errors and external origins are recorded.

Final verification on 2026-10-21: **19/19 browser groups pass** on `localhost:3000`, with no recorded runtime errors or external origins. `npm run check` passes lint, typecheck and production build; seven unrelated existing lint warnings remain. The report is the source of truth for the latest browser run. Measurements are local browser emulation, not physical-device benchmarks. `qa/workspace/` and `qa/fullscreen/` retain evidence of superseded versions.
