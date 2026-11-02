# Import step: evidence and parallel ownership

These additional rules apply only to `ImportStep.tsx`, `WorkbookUnfurl.tsx` and `import-*`. They do not change ownership or requirements for Overview, Review, Export or the Excel/JSON engines.

- Before extending Import, read `docs/research/link-unfurl/README.md` and the worker's current types. Old IDE paths under `credit/` are stale.
- Use the repo's clone-website workflow. UIArc Link unfurl is a public preview with gated Pro implementation: rebuild from observed rendered DOM, declared CSS and recorded frames; do not claim access to its private source or invent spring constants.
- Every file name, byte count, sheet, column, cell and processing percentage must come from the selected File or the existing worker. Do not fabricate preview cells, successful states, progress timers or sample filenames in the real flow. No remote unfurl request may include a local file or its content.
- Keep measured source behavior separate from workbook-specific design choices. Record a missing observation or untested case as such.
- Preserve other agents' work. Check current files before each patch; do not reset/stage/commit unrelated changes, rewrite generated/reference CSS, or change the shared StorageDropzone, navigation or engines for this redesign.
- Run relevant browser QA and the production build. Report only checks that actually completed. A rendered preview or matching dimensions alone does not establish pixel perfection or universal usability.

Shared evidence and decisions: `docs/research/link-unfurl/README.md`. QA: `node scripts/qa/excel-import.mjs <base-url>`.
