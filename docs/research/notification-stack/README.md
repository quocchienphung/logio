# Notification Stack → run notifications on the Process page

Source: https://www.affectui.com/components/notification-stack (public preview and public docs only; the gated Code tab, prompts, registry and CLI were not opened).

**Route map.** source `…/components/notification-stack` → component `src/components/sites/affectui-notification-stack/` → used by the Process page (`/personalize?section=process`) for “a block finished / a block failed / the run is over”.

## Evidence in this folder

`source-page.png`, `source-desktop.png`, `source-preview.html` (rendered DOM of the demo), `observed-rules.css` (every declared rule), `source-docs.txt` (props, keyboard, accessibility, motion). The demo is static (it does not loop), so `sequence.json` holds one sample. Regenerate with `node scripts/forensics/notification-shimmer-inspect.mjs`.

## What was observed

- A labelled region (`aria-label="Notifications"`) holding `article` cards, absolutely positioned in a container at most 380 px wide. The front card has `data-depth="0"`; the ones behind are 12 px lower and 5% smaller each (`translateY(12px) scale(.95)`, `translateY(24px) scale(.9)`), `aria-hidden` and `inert`, with their content at opacity 0 so only a strip shows. The container's height is the front card plus the strips (170 + 24 = 194 px in the demo) and eases over 460 ms.
- A card: a drawing in its top right corner (three variants seen: rings with a lit dot, a grid with one lit cell, rays; masked to fade towards the middle), a small uppercase badge, a 28 px close button, a 15 px title, 13 px text (38ch), and one action (a button, or a link with a small arrow when external). 10 px corners, a hairline shadow, hover raises the action's shadow, press scales it to .97.
- Dismissing: the card moves 40 px to the right while fading (320 ms) and the next one moves up (460 ms). Reduced motion turns it off. Coarse pointers get 36 px targets. Under 340 px the padding shrinks. Dark mode follows `.dark` / `data-theme="dark"`.
- Accessibility (docs): only the front card is read out and focusable; Tab moves through its buttons; Enter/Space run the action or dismiss.

## What was built

| File | What |
|---|---|
| `affectui-notification-stack/stack-model.ts` (+tests) | Pure: depth transforms, stack height, the leaving ghost, announcements, enqueue order (a failure goes before quiet notices; the oldest quiet ones are dropped first) |
| `NotificationStack.tsx`, `notification-stack.css` | The component. Props: `notices`, `onDismiss(notice, reason)`, `onDismissAll`, `label`, `className`. Notice: `id, badge, title, text, action {label, href, onClick, external, keep}, pattern: rings \| grid \| rays, tone, expireMs` |
| `process/run-notices.ts` (+tests) | Which notices a run produces, by comparing each snapshot with the statuses already known |

**Added to the source's behavior** (so a failure is not mistaken for a note): a `tone` (neutral, success, error, attention) that colors the badge and the dot of the drawing; `expireMs` (a quiet notice goes away by itself once it is in front, paused while it is hovered or focused; an error never expires); a line under the stack with the count and “Dismiss all” when there is more than one; Escape dismisses the front card; an alert (not a polite status) announces a failure.

## How it fits the Process layout

**Map view (default): a blinking star beside the block.** A first version kept the stack under the name pill, top left; it took a corner of the map for itself and was far from the block it spoke about. Now each block that has something to say carries a small four-point star (the shape of Gemini's mark) just outside its top right corner (`process/NoticeSparks.tsx`, rules in `notice-spark-model.ts`, styles in `notice-spark.css`). The star:

- blinks (scale and fade, with a ring spreading from it) until it has been opened once; it takes the colour of the loudest notice behind it (a failure is red, done is green) and shows a count when a block has several;
- opens, on click, tap, Enter or Space, **that block's notices in a Notification Stack card beside the block**: on the right if there is room, otherwise on the left, level with the block's top; on a phone under the block (above it when there is no room below). The card keeps clear of the map's edges and of the page's own controls, follows its block when the map is panned or zoomed, and is never covered (the star layer sits above the floating cards, so a block hidden behind a Permission Request can still be reached);
- stays at the edge of the map, inside the room the page keeps for its pills, dock and settings panel, when its block is out of view, so a block that finishes off screen is still noticed; its card then opens beside the star;
- is closed by Escape (the focus goes back to the star, or to the block if the star is gone), by a click anywhere else, or by clicking the star again. Closing counts as reading: a quiet "done" notice is gone then and its star disappears; a failure stays (red, no longer blinking) until the block runs again or its Retry is used. Nothing expires by itself on the map: a star waits to be opened;
- belongs to the first block when the notice is about the run itself ("is done", "was stopped").

**Tree view** has no blocks to put a star on, so it keeps the stack under the name pill, top left (the dock, the zoom controls and the Permission Request card own the bottom; the settings panel owns the right; on a phone it spans the width under the stacked pills), with the quiet notices expiring as before. It is `pointer-events: none` except for the cards.

What is announced (`run-notices.ts`): a block finished (engine · cost · time, “Show on the map”; several blocks finishing together are one notice, a loop's later round is announced again), a block failed (its reason, **Retry**; the notice retires itself when the block runs again), the run is over (blocks · cost · time, **Open the trace**; also “failed” and “stopped”). A page that opens in the middle of a run says nothing about what happened before it was looked at. Waiting for a person is not announced: the Permission Request card already asks.

## Verification

`npm test` (stack model and run-notice rules); `node scripts/qa/process.mjs` (notification checks: no stack on the left; a blinking star on the corner of the block that finished; the card beside the block, on screen and not covering it; it follows panning and zooming; Escape returns the focus; a read quiet notice disappears; a red star for a failure with its reason, a Retry and an alert, which survives being closed and goes when Retry runs the block again; a star pinned inside the map edge for an off-screen block; the 12 px / 5% stack for several notices on one block; the end-of-run star opening Tracing; the Tree view's stack; and a finger-sized star with the card on screen on a phone). `notice-spark-model.test.mjs` covers grouping, tone, pinning and the card's placement. Not compared pixel-for-pixel; the demo's copy and the project's fonts differ.
