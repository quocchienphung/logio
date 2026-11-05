# Process activity popup

Source: https://uiarc.dev/components/blocks/agent-run. Destination: `/personalize?section=process` (Map and Tree). Reobserved the public rendered preview on 2026-10-31. Earlier public observations in `../storage/onboarding-run/` supplied an initial reference; the new captures confirm the current preview. No source-site API, gated source, production JavaScript bundle, screenshot renderer or iframe is used by the implementation.

## Observed and recreated

- A white card with a 26px radius, 1px neutral border, 720px maximum width; the public desktop preview measured 664.8125px. Local popup uses 665px with a responsive cap.
- Inter 14px/19.6px body; Geist 500 16px/17.6px heading. Header padding 16px 16px 14px 24px; 36px icon buttons. Steps area padding 6px 8px; 36px desktop step rows, 16px icons and 10px gaps.
- A model mark/name, status and tabular elapsed timer; live step verbs shimmer, switch to past tense with a 100ms exit / 160ms entrance from 2px, and checks draw their stroke. The verb slot measures its text width.
- New steps/disclosures open their height with a damped spring. Finished steps fold into one expandable line, followed by a result. Result text is laid out in advance and revealed in groups of three words every 34ms.
- Details open in place. Tool input/output are monospace and scroll inside their frame. Below 520px durations disappear and details lose their indent. Reduced motion and the workspace's Interface motion setting disable travel, shimmer and fades.

`source-styles.json` contains observed computed values, and `source-*.png` / `source-*.txt` cover initial, waiting, disclosed, rejection, approved/working, completed and mobile states. `scripts/forensics/process-agent-run-inspect.mjs` repeats this inspection using only the rendered public DOM. In the completed source capture the documentation page's sticky controls obscure part of the header; the waiting capture records the full header.

## Process adaptation (explicit differences)

UIArc's original is an inline card for one coding agent, with a proposed code diff and a simulated PR. This request places that visual pattern in a multi-block Process popup:

- **Placement (revised 2026-10-31)**: the 56px circle at the lower right was removed. The activity card now unfolds from the Process page's top-right bar (`Blocks · Run/Stop · counts · cost`): the bar is the card's header and a new **Activity** toggle at its end (state glyph + chevron) grows the same surface downward to 665px (width and height animate over 500ms with `cubic-bezier(.22,1,.36,1)`, the card keeps its final width so text never re-wraps; radius 12px to 18px). Run, Stop, Clear and the *needs you* / *failed* windows stay in the bar, so the card has no duplicate stop/restart buttons; its first row is model, status and elapsed time. On a wide workspace the open bar overlays the name pill (absolute, right-aligned, above the map's notification stars); on a narrow one it stays in the column. This unfolding is an authored extension, not an observed UIArc feature.
- Steps are the engine's actual block passes. Current connections come from the parent/previous sequence sibling and explicit waiting links; a later loop pass uses the incoming loop edge. Concurrent branches remain separate. Earlier rounds and failed attempts remain inspectable.
- Expanded steps show the saved task, model, instructions, configured tool labels, cost limit and child execution mode. Actual `NodeRun.calls` show exactly the supplied name, input, output and error. The monitor never fabricates calls for the simulated engine or a connected engine that supplies none.
- The waiting card approves/rejects the existing block approval (`act`, with the existing decision-id mapping for loops). Full permission details opens the existing Permission Request. The older permission surface is hidden only while this popup is open, so two review cards do not compete. Minimize/outside click reveals the existing surface again.
- No code diff, edit counts, test outcomes, rejection-note revision or PR is invented: Process's current run contract supplies none. The result lists real block statuses and opens the existing Tracing page. Rejection stops that block under the existing engine semantics; it does not pretend to revise a code patch.
- The timer explicitly describes elapsed wall time including approval waits; UIArc's single-agent sample timer pauses at its approval. A completed timer freezes at the reported end.
- A terminal coordinator with a failed child is presented as Needs attention. `handleNow` also clamps a simulated clock to its latest decision time: without this, retrying a terminal failure could leave the page's unsubscribed clock asleep. An engine regression test covers it.

This is an independent implementation of observed UI/behavior adapted to the existing process runtime, not a claim of pixel-identical content or measured parity for every animation frame. The exact UIArc spring coefficients are not public rendered evidence; local rows use the existing critically damped 300/37 spring.

## Ownership

- `src/components/sites/process/ProcessRunMonitor.tsx`: `ProcessRunBar` (the bar + card), disclosure, approvals and the unfold animation.
- `process-run-monitor.css`: scoped authored styling, mobile and motion preferences.
- `run-monitor-model.ts`: causal predecessors, loop passes and frozen elapsed time.
- `ProcessPage.tsx`: runtime integration; uses the frozen plan of a simulated run.
- `engine.ts`: terminal retry clock correction.

## Verify

`node --experimental-strip-types scripts/qa/process-agent-run.mjs [base-url]` exercises the bar toggle/keyboard, streaming states, dependencies, reload, approval, retry, completion/frozen clock, tracing, rejection/Stop/restart at 390px and 320px, reduced motion, reported input/output, loop history and horizontal overflow. Outputs: `qa.json`, `local-*.png`.

`node scripts/qa/process-agent-run-regression.mjs [base-url]` runs the existing canonical Process suite in isolated browser contexts with cookie consent already decided. It leaves the canonical suite and its existing evidence untouched and writes to `regression/`. That setup is needed because the concurrently added site-wide consent dialog otherwise obscures map controls. Latest regression: **52/52 passed**, including Map/Tree editing, loops, approvals, phone gestures, WebKit and mocked REST.

Unit tests: `run-monitor-model.test.mjs`, `engine.test.mjs`, and the project's `npm test`. Final command outcomes are recorded in `validation.json` after completion.
