# UIArc Card quick look: evidence for the Queue pop-up

2026-11-02. Read from the rendered public page only ([Card](https://uiarc.dev/components/card), plus the Motion guide and the Expandable card, Drawer, Popover and Hover card pages for their stated motion). No registry, component bundle, private source or API was fetched. Tools: `scripts/forensics/queue-card-inspect.mjs`, `queue-card-motion.mjs`, `queue-arc-motion-docs.mjs`.

## What the Card does

A card with `details` opens into a Radix dialog **that grows out of the card itself** (shared layout ids: surface, photo, title and byline travel on one spring, the details fade in after). Closing folds it back to the card's rectangle.

| Measured | Value |
| --- | --- |
| Panel | `min(100vw - 32px, 30rem)` = 480px wide, `height: fit-content`, capped at `100dvh - 32px`; radius `2.125rem` = 34px; floating shadow `0 20px 48px /.105, 0 3px 10px /.045` |
| Overlay | `oklch(10% 0 0 / .46)`, `backdrop-filter: blur(7px)`; fades in 240ms `cubic-bezier(.16,1,.3,1)`, out 180ms `cubic-bezier(.22,1,.36,1)` |
| Close button | 32px circle at 16px / 16px, translucent surface with a 12px blur; fades in after 120ms (160ms) |
| Details | fade in 240ms after 120ms; out in 120ms `ease-out` (before the box shrinks) |
| Content | padding 24px, title 22px / 500 / 1.3 `text-wrap: balance`, description 14px secondary (max 34ch), byline row `margin-top 20px`, details `margin-top 24px; padding-top 20px; border-top` |
| Morph (open) | surface rectangle card → panel on a spring, radius animated in percent (7.65% / 6.66% → 34px). Tail fits a critically damped spring k300 / c34.6 (error 3e-5 over the settling frames; the first frames were swallowed by main-thread work during recording) |
| Morph (close) | k400 / c40 (error 3e-3), gone about 330ms after Escape |

## What the Queue copies, and the one change

The Queue row is the "card": the clicked row's own rectangle is the first frame of the surface (`QueuePopup.tsx`: surface and a clip that reveals the content move together, the radius is divided by the scale so corners stay round, nothing is stretched). Panel, overlay, close button, title, description, byline + black pill action, hairlined details and fade structure are the measurements above. Content is the file's real data: workbook icon (tinted by status), name, a sentence, size and status, **Open in Excel** (the Save slot), then Uploaded / Contents / Problem / Fingerprint (with copy), Open in JSON, Download, and the hold-to-delete Confirm morph with Undo.

**Requested pace change.** The recorded Card settles in about 430ms. The request was a slower, calmer arrival, so the Queue uses ARC's own Motion-guide vocabulary instead: opening is a no-overshoot spring of `visualDuration .62` (the guide's `--duration-spring` is .58s, `spring.smooth` .4 "never overshoots"), closing `visualDuration .42` (`spring.morph`). The fades are re-timed so they land after the box has made room: content 400ms after 200ms, close button 260ms after 340ms, details 400ms after 340ms, overlay 420ms in / 300ms out. These are choices inside the guide, not recorded values.

Reduced motion: no morph; the panel fades in 120ms. No row to travel from (deleted or filtered away): the surface rises from 8px lower at .94 scale.

## Guide vocabulary used (Motion page)

`spring.snappy` visualDuration .26 · `smooth` .4 · `morph` .42 · `responsive` k520/d44 · `gentle` k340/d34. `--duration-fast` 160ms (hover, colour), `--duration-standard` 240ms (panels), `--duration-considered` 480ms (rare introductory reveals). Expandable card: width and height animated for real on `smooth`, details fade in once the box has made room and out before it shrinks. Drawer: leaves faster than it arrives. Hover card / Popover: fade and a small offset on a smooth spring, leave in about 140ms.
