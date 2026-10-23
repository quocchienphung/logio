# Storage workspace

Implemented 23 October 2026. Open `/personalize?section=storage`, or **Storage** under **Skilled → Repo** in the existing workspace sidebar. Run locally with `npm run dev`. The page is lazy-loaded and has its own section skeleton. Existing Settings/Usage work in this checkout is preserved.

## Source → local implementation

Every requested source is combined into this Storage page, rather than replacing another authored route. Only public rendered Preview states, DOM, computed styles and visitor interactions were inspected. No source-site API, registry, CLI, Pro source, Copy prompt, source-code tab or downloaded production component bundle renders the implementation. Components are authored in React, CSS and SVG. The local PDF.js worker is a document parser dependency, not a source website component.

| Public reference | Local owner in `src/components/sites/storage/` | Storage behavior |
| --- | --- | --- |
| [Onboarding illustration](https://uiarc.dev/components/blocks/onboarding-illustration) | `StorageOnboarding.tsx`, `storage-onboarding.css` | First-visit modal, three content steps, folder/documents/badge SVG morph, dots, Back/Next, keyboard, dismissal and Guide reopen |
| [Treemap](https://uiarc.dev/components/treemap) | `StorageTreemap.tsx`, `storage-treemap.css`, pure layout in `storage-model.ts` | Squarified subject → file format → document hierarchy; affine drill in/out, breadcrumb, tooltip, Files/Size and Indexed/Recent measures, keyboard, hidden data table |
| [Agent run](https://uiarc.dev/components/blocks/agent-run) | `StorageRun.tsx`, `storage-run.css`, actual pipeline in `Storage.tsx` | Six disclosed processing steps, real progress checkpoints, Stop/Retry, actual extracted-text review and Approve & store gate |
| [Dropzone](https://www.affectui.com/components/dropzone) | `StorageDropzone.tsx`, `storage-dropzone.css` | Native picker, drag/drop, fanning sheets, controlled progress, error/retry/remove/Clear, keyboard and touch |
| [Button](https://uiarc.dev/components/button) | `StorageControls.tsx`, `storage-controls.css` | Primary, secondary, ghost, danger, sizes and loading |
| [Action button](https://uiarc.dev/components/action-button) | Same shared controls | Promise-driven processing, storage and original download feedback |
| [Split button](https://uiarc.dev/components/split-button) | Same shared controls | Add documents, write a Markdown note, export metadata manifest; keyboard top-layer menu |
| [Button group](https://uiarc.dev/components/button-group) | Same shared controls | Knowledge-area filters and actual counts |
| [Floating button group](https://uiarc.dev/components/floating-button-group) | Same shared controls | Selected-file ZIP download, deletion, clear selection |
| [Expanding button group](https://uiarc.dev/components/expanding-button-group) | Same shared controls | Document Open / Download / Delete; hover/focus expansion |
| [Copy button](https://uiarc.dev/components/copy-button) | Same shared controls | Actual source text / SHA-256 clipboard operations with failure state |
| [Icon morph](https://uiarc.dev/components/icon-morph) | Same shared controls | Animated state icons; all eight observed pairs available |
| [Confirm morph](https://uiarc.dev/components/confirm-morph) | Same shared controls | Inline deletion confirmation, Escape/cancel; optional hold/countdown variants available |

Evidence: `treemap-*` initial DOM/style captures and `treemap/` interaction frames; `onboarding-run/`, `buttons/` and `dropzone/` have their own measured observations, source/mobile screenshots and adaptation notes. Source inspection scripts are `scripts/forensics/storage-*.mjs`. The component scripts do not open source prompts or private code.

## Actual document lifecycle

1. Add files or write a Markdown note. Choose Finance, Banking, SQL or Data. The category is explicit human input, not a fabricated AI classification; it can be adjusted for each document in the review.
2. Validate format, name and size; calculate SHA-256; exclude identical content already in this workspace or this batch.
3. Extract text locally. PDF.js reads selectable PDF text with a same-origin worker; Office XML is read using the existing `fflate` package; text/CSV/TSV/SQL/JSON uses UTF-8 or BOM-marked UTF-16. No SQL, JSON, macro, script or document content is executed.
4. Normalize text, count frequent keywords and build overlapping 1,600-character passages at a 1,400-character stride. The excerpt is original source text. No model-generated summary, semantic understanding, embeddings or financial correctness is claimed.
5. Show actual extracted content, keywords, passage counts and extraction warnings. Nothing enters the saved library until **Approve & store**. Discard retains the input queue.
6. Store originals and full indexes through the configured backend Storage API, or IndexedDB (`logio-knowledge-vault`, workspace/id key) in local mode. Lightweight metadata uses the existing workspace resource seam (`knowledge-library`). See [Storage API contract](api-contract.md). Verify the final resource save by waiting for pending writes and reading it back before reporting Complete. A local quota or backend metadata failure retains the original, shows Needs attention and offers Retry save. Deletion verifies metadata removal before deleting server originals/indexes and the optional local cache.

The map starts empty and represents only actual uploaded files. **Files** is document count; **Size** is original byte size. **Indexed** shades the searchable share of a region; **Recent** shades uploads over the last 30 days. Search includes full extracted text from the configured backend, or the local vault in browser-only mode, beyond the stored excerpt. Original downloads preserve bytes; multi-select ZIP downloads contain originals. The JSON manifest export contains metadata and is explicitly not a file backup.

## Bounds and honest differences

- Accepted: PDF, DOCX, TXT, MD, CSV, TSV, SQL, JSON, XLSX. Limit 20 MB/file, 25 pending files and 100 MB/batch. ZIP export is limited to 100 MB/selection. Legacy DOC/XLS, OCR, password entry for encrypted PDFs, and semantic AI analysis are not implemented. Extraction failure is shown before approval; the original can be stored with an explicit Original only label.
- Extraction index is bounded to 1,000,000 characters; PDFs to 300 pages; selected Office XML to 12 MB per entry / 24 MB combined. The entire original remains available. Limits are disclosed on affected files.
- Default persistence is this browser. With the configured backend, originals, full indexes, search and deletion use the complete Storage API; a fresh device can read/search/download without IndexedDB. Metadata uses the existing versioned resource and live polling. See [API setup and contract](api-contract.md). Browser-only files are not silently migrated when a backend is enabled.
- Source previews are adapted into an existing app shell and real document workflow. Labels, data and layout intentionally differ. Onboarding has three Storage steps rather than four source examples; Agent run reviews actual source text rather than a fabricated code diff. Controls share source geometry with compact/touch adaptations. Motion uses independently authored easing/springs; private physics were not recovered. This is not a whole-page pixel-identity claim.
- Reference Treemap: Inter, 420px plot, 6px tiles, 24px branch-header inset, blue/purple/orange/teal families. Desktop retains 420px; narrow plots use 310px for readability. Subject backgrounds are pale, child shading reflects the actual metric. Labels stay unscaled during rectangle interpolation. Hidden/zero subjects are accessible through the filters; empty space never inflates their data values.
- Responsive checks used Chromium at 320/390/768/1440/1920px, with actual dark mode, touch emulation and reduced motion. No physical-device or all-browser guarantee is made.

## Verification and visual review

- `npm test`: 338 tests, including layout area/bounds/non-overlap, real aggregation, invalid metadata, lexical overlap and verified persistence under swallowed quota failures and inflight saves.
- `npm run check`: full ESLint, TypeScript and optimized production build. Existing unrelated ESLint warnings are retained; authored Storage files lint cleanly.
- `node scripts/qa/storage.mjs [base-url]`: 17 integrated checks, passed on both dev (:3000) and the optimized production server (:3100). Uses actual disposable TXT/SQL/DOCX/XLSX/PDF files, checks approval gate, reload, full-text search, duplicate SHA-256, original bytes, ZIP/deletion, map drilling/measure, responsive overflow, browser errors and zero requests to UIArc/affectUI.
- `node scripts/qa/storage-controls.mjs`: 22 control workflow checks, including actual clipboard, account dark theme, popover keyboard/geometry, touch toolbar and confirmation.
- `node docs/research/storage/dropzone/integrated-check.mjs`: actual picker/drag/drop, validation/retry/remove/Clear, progress/store, theme and touch checks.
- `node scripts/forensics/storage-independent-review.mjs`: injected quota failure/recovery, preservation of originals on failed deletion, clean Stop state and settled affine-map/row rendering. Results in `onboarding-run/independent-review.json`.
- `node scripts/forensics/storage-capture.mjs`: settled desktop/mobile/dark page, library, map and review captures under `comparison/`. These are disposable browser contexts, not seeded product data. Compare against the source captures in the matching component evidence folders. No runtime screenshot/iframe renderer is used.

Scripts generate the local PDF worker via `scripts/storage-assets.mjs` before dev/build, preserving its Apache license. CSS corrections belong in the authored `storage-*.css` files; no generated reference CSS is used by Storage.


## Backend integration update

Storage now implements the complete document API on the built-in home server and configured HTTP backend. Full original/index persistence, authenticated downloads, full-text search, server deletion and visible polling work across independent browser sessions. Optional device-cache failures do not prevent remote storage. Read `api-contract.md`; run `node scripts/qa/storage-backend.mjs`.

Backend verification: 11 authenticated production API/two-browser checks passed, with no runtime errors. Full-text search and original/ZIP downloads work with IndexedDB disabled. Injected upload, search and deletion failures recover through visible Retry. Results: `backend-qa/results.json`; 338 unit tests and the complete lint/typecheck/production checks pass.
