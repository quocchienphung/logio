# Flip

`/personalize?section=flip`, `src/components/sites/flip/`. A sidebar item of its own under the Collateral folder (it is in the Rules group of the Guide, not inside the folder).

**Flow.** Upload (the Excel formation import step, unchanged) then Convert. The data comes from `useCollateral().engine`, which for this section is the read-only workbook preview
(`useWorkbookPreview`, `src/lib/workbook-preview/`, a worker): `gridMeta` and `gridRows` serve the cells as Excel shows them. Flip reads the header and twelve rows of the chosen sheet
and never writes anything.

**Cards (each an independent clone, read from the open preview only; see the README of each):**
1. Ghost text (`docs/research/ghost-text/`): the output file name, completed from the workbook's own names. Right Arrow accepts (bare Tab belongs to the command palette).
2. A format switch (CSV, CSV ;, TSV, PSV): a segmented control; it changes the extension, the text and the notes.
3. TL;DR toggle (`docs/research/tldr-toggle/`): Sheet / CSV / Notes over those rows.
4. Agent cursor (`docs/research/agent-cursor/`): the prediction: join each row, quote each cell that needs it, add a summary line, then Accept or Undo (nothing is saved).
5. Generation stats (`docs/research/generation-stats/`): real read figures.

**Honest limits.** Only the first rows are read and converted for the preview; the notes say "in these rows". The whole-file conversion and the download are not written: **the engine
that converts the file is added later** (the Download button is disabled and says so). Everything the cards say is computed from the cells (`flip-plan.ts`, tested) or from the
reader's own measurements.

**Where to put the engine.** Replace the `summarize` in `Flip.tsx` (CSV text and notes) and `flipDoc()` (the prediction) with the real conversion: the cards take a request and a
stream of text, so streaming a real file in chunks works the same. `flip-model.ts` has the RFC 4180 field/line writers (tested). `flip-sample.ts` is only a fixture for tests and QA.

**QA.** `node scripts/qa/flip.mjs <base-url> [out dir]` (69 checks on a real workbook: structure, the real cells, streaming cadence, every spring against the recording, the slider and
its bubble, jump, Stop, Copy, an error and Try again, the whole Agent cursor run with Accept, Undo, Stop and a format change, Ghost text, sheets, 390 and 320 px, dark, reduced motion).
Run it on a production build for timings that mean something. Unit tests: `npm test` (`flip-model`, `flip-plan`, `tldr-model`, `agent-cursor-model`).
CSS fixes go in `flip.css` (page), `tldr-toggle.css`, `agent-cursor.css`, `primitives.css`.
