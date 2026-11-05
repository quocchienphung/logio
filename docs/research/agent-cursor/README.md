# Agent cursor (clone for Flip)

Source: the open preview of UIArc's **Agent cursor** (`https://uiarc.dev/components/agent-cursor`, a Pro component). Only the rendered page was read (DOM, declared
CSS, public docs, a 36 s recording of its autoplay plus Stop, Undo and the dropped connection). No Pro source was read. The code is ours:
`src/components/sites/flip/AgentCursor.tsx`, `agent-cursor.css`, `agent-cursor-model.ts` (pure, tested), `primitives.tsx`.

## Evidence (`source/`)
`visible.txt`, `declared-styles.css` (63 rules), `dom-*.html` (initial, running, stopped, reverted, review, error), `timeline-*.json`. Scripts:
`scripts/forensics/agent-cursor-timeline.mjs`, `-2`.

## What the recording shows (sample run, 9.6 s a cycle)
Status sequence "Reading the doc" (0.9 s), "Tightening the goals", "Adding a heading", "Fixing a typo", "3 edits ready for review", then the collaborator accepts (about
1.35 s later, 0.6 s of travel), "Accepted 3 edits", 2 s later the doc fades (140 ms), resets and runs again. Cursors fly 280 to 600 ms (a 41 px hop 290 ms, a 171 px flight
350 ms, a 400 px flight 450 ms) on a gentle arc with ease-in-out; a selection fills line by line at about 0.25 ms a pixel while the cursor follows; the old text fades out in
110 ms, the new text streams 3 to 6 words every 34 ms with a 140 ms fade and a tint of the agent's colour until accepted; an inserted block grows from zero on a
0.24 s spring; the typo is flagged with a wavy underline before it is replaced; the review bar rises 8 px in 200 ms; Stop keeps what landed; Undo restores the text at once
and folds inserted blocks to zero; a dropped connection shows "Connection lost" with Retry.

## This build (checked by `scripts/qa/flip.mjs`)
Flights of 184 to 524 ms (20 flights in a run), streaming at the same cadence, the document ends on exactly the lines Flip writes (compared line for line, for `,` `;` tab and `|`),
Accept clears the tint and drops the bar, Undo puts the original rows back, Stop keeps what landed and says after how many, a format change plays the run again.

## Inferred
Travel time as `280 + 0.4 x distance` clamped to 600 ms (fitted to five recorded flights); the arc's bend (8% of the length); the cursor following the end of each line while a
selection fills; the collaborator's idle drift; the wording of the stopped states; counting "edits" as the blocks they touch. The collaborator's accept in a looping run is
implemented but Flip does not show a collaborator, so the page does not exercise it.

## Adapted for Flip
Blocks are the first five rows of the sheet (and at most 8 columns) in workbook form (`a | b | c`); the edits are `flipDoc()` in `flip-plan.ts`: a rewrite joins a row with the
delimiter, a fix wraps each cell that needs quotes (flagged first), one insert adds a summary line. Each is derived from the cells, so the prediction is what Flip will write.
