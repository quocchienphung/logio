# Trace Waterfall → Tracing — `/personalize?section=tracing`

Source: https://www.affectui.com/components/trace-waterfall (the public preview and the public docs only; the gated Code tab, prompts, registry and CLI were not opened). Everything here was rebuilt from what the preview shows and declares.

**Route map.** source `…/components/trace-waterfall` → component `src/components/sites/affectui-trace-waterfall/` → page `/personalize?section=tracing` (third section of the Project Management group after Mapping and Process; `src/components/sites/tracing/`). The Process page feeds it.

## Evidence in this folder

`source-desktop.png`, `source-seq-01…12.png` (the live demo over 60 s), `source-hover.png`, `source-window.png`/`.html` (details window), `source-folded.png`, `source-dark.png`, `source-w390/560/760.png`, `source-preview.html` (rendered DOM), `observed-rules.css` (every declared rule and keyframe of the component), `sequence.json` (70 samples of the demo: stats, ticks, rows, bar boxes, tokens, geometry, hover, window, keyboard focus), `source-docs.txt` (public docs: props, keyboard, accessibility, motion, responsive notes). Regenerate with `node scripts/forensics/trace-waterfall-inspect.mjs`.

## What was observed

- **Layout.** A bar (spark, “Trace”, the run's input, a state chip Live / Done / Failed with a pulsing dot), six numbers (Duration, Cost, Tokens, LLM calls, Tool calls, Errors; errors turn red), then the waterfall: a left column of 232 px (guides, chevron, logo, name, muted detail, “+N” when folded, spinner or warning) and a timeline with ticks, a “now” line with a dot, and bars. Rows are 30 px (46 px stacked), bars 14 px (10 px stacked), indent 14 px. Container query at 560 px (rows stack: name + duration/cost on one line, the bar across the width under it; the numbers wrap to three columns), 400 px and 360 px (the muted detail drops).
- **Kinds.** `agent` slate, `subagent` slate, `llm` violet, `tool` teal, failed red. A running span has no end and grows into “now”, with a sheen sweep and a glow at its leading edge; its numbers shimmer.
- **Bars and labels.** A bar's label (`6.9s · $0.12`) sits after the bar, inside its end or before it; the slowest finished model or tool call gets a “Slowest” tag. A folded span shows its descendants as small marks on its bar and “+N” in its name.
- **Details window.** A card under the row (above it near the bottom): logo, name, “Model call · Opus 5.5”, state chip, close; Duration, Started (`+900ms`), Cost, Tokens in/out; an error box for failed spans; Input and Output previews (three lines). It opens with a soft scale from the row and closes the same way.
- **Axis.** The range moves up a ladder as the run grows and the ticks follow: observed 10 → 15 → 20 → 30 → 45 → 60 → 90 → 120 s with ticks every 2, 3, 5, 10, 10, 15, 20, 30 s (never more than five, the edge tick left out). The move up happens when the run reaches about 84% of the range (8.1 s on 10 s stays; 12 s on 15 s stays; 38 s on 45 s moves; 75 s on 90 s stays, 76 s moves). The ladder and the 84% are read off 70 samples of the demo and written down as rules in `trace-model.ts`; beyond two minutes the ladder continues with round values (this part was not observed).
- **Numbers.** `403ms`, `6.9s`, `12s`, `1m 22s`, `1m 04s`; tokens `880`, `4.1k`, `99.7k`; dollars to the thousandth with a trailing zero dropped (`$0.12`, `$0.02`, `$0.042`, `$0.005`).
- **Behavior.** Rows are a tree (`aria-level`, `aria-expanded`, one row in the tab order); ArrowUp/Down, Home/End, ArrowRight (open, or first child), ArrowLeft (fold, or parent), Enter/Space (details), Esc (close, focus back). New rows slide in and bars grow from their start; rows that leave close up bottom first; the range glides; ticks fade; reduced motion shows everything at once.

## What was built

| File | What |
|---|---|
| `affectui-trace-waterfall/trace-model.ts` (+tests) | Types, number formats, the axis ladder and ticks, totals, errors counted once at the span that failed, slowest call, rows with fold state, label side, bar fractions |
| `TraceWaterfall.tsx`, `trace-waterfall.css` | The component. CSS authored for this project from the observed values (`--twf-*` tokens, `.twf` classes, dark mode on `.dark` / `data-theme="dark"`) |
| `process/trace-build.ts` (+tests) | A run of the Process page as spans |
| `tracing/TracingPage.tsx`, `BackendTracing.tsx`, `use-fast-clock.ts`, `tracing.css` | The page: loads plans and the run, polls, ticks 10×/s while a run is active, header, tools, the callout, empty state |
| `tracing/performance.ts` (+tests) | Parallelism, time waiting on people, critical path, time by block, by engine |
| `scripts/forensics/trace-waterfall-inspect.mjs`, `scripts/qa/tracing.mjs` | Inspection and QA (20 checks) |

**Props** follow the public API: `root`, `now`, `startedAt`, `collapsed` / `defaultCollapsed` / `onCollapsedChange`, `openId` / `defaultOpenId` / `onOpenChange`, `markSlowest`, `minRange`, `formatCost`, `title`, `className`; added: `subtitle` and `state` (a label and status for the chip). Spans use `mark` (a logo id) instead of an `icon` node.

## How the Process page becomes a trace

- Every block is a span: the first block the agent run, the others sub-agents. Times are ms from the start of the run; a block that has not started has no span.
- A block that waited for a person has a **Waiting for approval** span (kind `wait`, amber) from when it was ready (`waitedFrom`) to the decision.
- A failed try is a span of its own, kept when the block is retried. Each pass of a loop is a span of its own (`round 1`, `round 2`), placed under the pass of its parent that was running when it started.
- **Inside a block** a real engine may report `calls` (model and tool calls); they are shown as reported. The simulated engine reports none, so its calls are **derived** (a first model call, one tool call per tool label, a last model call; costs split by duration; tokens at about 520 in and 140 out per second, or the cost itself when costs are counted in tokens). These are demo values and the page says so; a connected engine that reports no calls gets none invented (the block carries its cost).
- Live: the Tracing page re-reads the saved run every 1.5 s (and on storage events), so a run started in another tab appears; while the run is active it ticks 10 times a second and rebuilds the trace.

## Differences from the source (deliberate)

- A fifth kind `wait` and chip states `Needs you` / `Stopped`: waiting for a person is where a run's time goes in this product.
- The label side rule (after, inside, before) is this project's: the source's rule was not recoverable from samples.
- The page adds a performance strip (parallelism, waiting, rounds, cost per minute) and three cards (time by block, critical path, by engine) that the component does not have.
- Icons: the logos come from the project's own mark set (88 AI marks, the tool marks); the chevron, spinner, warning and close are drawn here, the waiting glyph is Lucide's hourglass. The source credits Hugeicons Free for its chevron, warning and close; none of that artwork is used.

## Verification

`node scripts/qa/tracing.mjs` (20 checks, Chromium + WebKit + phone + a mocked server engine); unit tests for the model, the builder and the performance rules (`npm test`). Screenshots in `qa/`. Not compared pixel-for-pixel against the source: the live demo's data and the project's fonts differ, and the page around the component is this app's. Not tested on a physical iPhone.
