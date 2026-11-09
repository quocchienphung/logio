# Collateral UI simulation — 2026-11-04

The current user request replaces the working Excel formation, JSON formation and Queue features with UI/UX demonstrations. The earlier numbered documents and captures describe historical processing behavior, not the current runtime.

- **Excel formation** retains the uploader, measured workbook unfurl, step tabs, overview, virtual sheet, magnifier/gallery, sample suggestion playback, editable review, duplicate dialog, bulk controls, undo/redo and repair/export feedback. Run simulation needs no local file. Selecting a file supplies only its name and size; its bytes are never read. All cells, suggestions and counts are fixtures.
- **JSON formation** retains the mapping table, expandable/searchable JSON tree, editable forms, workflow replay and download controls. Its document and checks are scripted samples, independent of file contents and form values.
- **Queue** starts with three sample states. Search, filter, quick-look morph, refresh feedback, open in Excel/JSON, hold-to-delete and 8-second Undo work in memory. Adding the current preview adds metadata only. Reloading or changing workspace resets this list.
- Save/resume and download controls demonstrate their UI feedback only. They create no files, parse no progress documents, and do not write to disk/browser storage or call a backend. Clipboard controls still copy visible sample values/paths/IDs as UI interactions.

Removed: worker processing protocol/client, XLSX mutation and repair/prediction engines, domain detection/grouping/schema/UTF-8/export checks, real JSON/XLSX/ZIP/audit downloads, progress serialization/restore, Queue network client/upload tracking and filesystem API/store. The old Queue URL is still reserved so it returns 404 rather than becoming a generic workspace resource. Previously saved disk files are not deleted by this code change.

The remaining `simulation/` modules are display contracts, sample fixtures, a disposable playback store, static mapping rows, text composition for user choices, sheet geometry and the measured speculative-decoding timeline. They do not implement a prediction model or business validation.

## Flip ownership

No files in `src/components/sites/flip/` or `scripts/qa/flip.mjs` were edited. Flip currently consumes the same provider, ImportStep, WorkbookUnfurl and grid interface. Its real read-only workbook preview is therefore kept behind `useWorkbookPreview.ts`, with a separate worker and parser in `src/lib/workbook-preview/`. Only Flip selects that source; the three demo sections never start that worker. Its synthetic QA workbook builder is test-only under `scripts/qa/lib/`.

The shared Import/shell components check `isSimulation` so Flip keeps the real import labels and gets no demo-start button or simulation banner. Workbook reading is separate from the removed repair/prediction/report/archive logic.

## Validation

- `npm run typecheck`
- `npx eslint src/components/sites/collateral src/lib/workbook-preview 'src/app/api/workspace/[...path]/route.ts' scripts/qa/collateral-simulation.mjs scripts/qa/lib/xlsx-builder.mjs scripts/qa/lib/collateral-fixture.mjs`
- `node --experimental-strip-types --test 'src/components/sites/collateral/**/*.test.mjs'`: includes the retained motion/geometry tests, label-only file handling, state history, cancellation and replacement.
- `node scripts/qa/collateral-simulation.mjs <base-url>`: follows the UI on desktop and phone, instruments File reads/Worker creation/downloads/Queue requests, exercises sample delete/Undo, verifies reset on reload and checks the retired API.

Real processing and persistence tests were retired with the implementation they exercised. Frozen research captures remain as visual evidence.

Completed validation: TypeScript and scoped ESLint passed; 21/21 model/motion tests passed; `next build --webpack` completed in an isolated source copy and served for production QA; 24/24 browser checks passed (desktop 1440px and phone 390px with reduced motion). Machine-readable results: [qa-results.json](../research/collateral-simulation/qa-results.json). The existing Flip QA completed its six UI checks; a separate production import verified real fixture cells, no demo controls/banner, no failed requests and no uncaught errors.
