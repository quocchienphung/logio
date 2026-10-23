# Storage onboarding and document run: observed source and independent rebuild

Inspected on 2026-10-23, from rendered public previews only:
- https://uiarc.dev/components/blocks/onboarding-illustration
- https://uiarc.dev/components/blocks/agent-run

No registry, installation CLI, gated source, source API, remote application bundle, or website-provided prompt is used by the implementation. The .html evidence is the browser-rendered component DOM. The website documentation is retained as observation evidence only; its Notes for AI section is not an implementation input.

## Onboarding

`onboarding-illustration-initial.png`, step 2/3/4 and mobile images capture the public preview at 1440x1000 and 390x844. Browser-computed measurements are in `onboarding-illustration-measure.json`. Source card: 440px wide, 447px tall, 20px radius, 1px neutral border. Illustration stage is 277px high, background oklch(.978 0 0), 40px 20px 16px padding; SVG viewBox 320x200 rendered 352x220. Body padding 20px 24px. Heading 18px/19.8px Geist medium; body 14px/19.6px Inter; next is 136x36 with 12px radius. Active step dot is 20x6, inactive 6x6. The first Back button is disabled. Skip closes the conceptual flow. Next, Back and labelled step dots switch among folder, documents, team, badge scenes. Settled SVG geometry saved per scene; positions in the independently implemented illustration follow the observed folder/documents/badge geometry. Visible public docs describe spring morph, reduced-motion jumps, left/right keys, and mouse-only pointer parallax; local implements those behaviors with its own motion values and springs.

`StorageOnboarding.tsx` adapts the preview as an accessible native modal with three storage-specific steps, keeping folder / document intake / complete scenes. Parent controls opening, first-use persistence and start action. Native modal provides focus containment and restores focus; Escape, Skip and backdrop dismiss. All dots are labelled, step changes announce politely. Below 440px, padding tightens and Back becomes icon-only. Low-height landscape reduces illustration height. Body is taller than the source so the requested storage instructions fit without jumping controls. The source's team-sharing step is intentionally omitted because storage doesn't implement collaborative sharing.

## Run

`agent-run-initial.png`, time 0..5 images/text, `agent-run-disclosure.png`, `agent-run-approved.png`, and `agent-run-mobile.png` capture running, waiting for review, expanded and approved states. Computed geometry/styles: `agent-run-measure.json`. Source root has 26px radius, 1px neutral border. Header padding 16px 16px 14px 24px, task 16px Geist medium, metadata 14px Inter. Body rows are 36px tall; row padding 0 12px 0 16px, gap 10px, radius 12px. Left tool icons are 16px, done check 14px green, timing 12px muted, chevron 16px. Hover gives faint neutral background. Click expands the row detail. The source runs planned/read/search states for about 6 seconds then pauses at an actual code-diff review, with Approve and Reject. Approve resumes steps and reaches completed state. A restart control resets the demo. Active work uses a spinner and text shimmer.

`StorageRun.tsx` adapts that card and row/disclosure system into six actual, parent-driven document steps: receive / check / analyze / index / store / review. It never runs a fake agent or invents a model result; step detail/status/meta come from the actual ingestion controller. It includes stop/retry callbacks and actual completed-step progress. All six rows remain visible to make the storage pipeline clear. The source code-diff renderer is omitted because intake is not a code editor. The controlled `review` state keeps the observed orange hand / Waiting for you status, and an optional `children` slot renders the parent's actual extracted-content review and Approve & store / Discard actions in a bordered review panel before originals are written. The model mark is replaced with an honest Local document engine label. Timing is shown only if supplied by the ingestion controller. Progress footer is an added storage-specific element. Spinner, active label shimmer and disclosure transitions stop under reduced motion. Mobile rows have 44px touch height, metadata wraps, details stay within the viewport.

## Owned files and integration

- `src/components/sites/storage/StorageOnboarding.tsx` + `storage-onboarding.css`
- `src/components/sites/storage/StorageRun.tsx` + `storage-run.css`
- `scripts/forensics/storage-onboarding-run-inspect.mjs`
- `scripts/forensics/storage-onboarding-run-interactions.mjs`

Onboarding API: `open`, `onClose`, `onStart`. Run API: `status` (including `review`), `fileCount`, `steps`, optional `onStop` / `onRetry`, `children` for the actual review panel and `description` for the current-step footnote / live announcement. `StorageRunStep` exports `id`, `label`, `detail`, `status` (pending/running/completed/error), optional `meta`.

Validation: ESLint of both components passed. TypeScript project check at this slice found only other concurrently edited files (storage extractor/model/buttons); no errors in the owned components. Integrated browser QA at `/personalize?section=storage` passed in isolated Chrome contexts: all three guide steps; ArrowRight; Escape; dismissal/start; reopening; dismissal persisted after reload; a real uploaded TXT file processed into actual excerpt/keywords, paused at review, then Approve & store reached Complete / 100%; step disclosure expanded; 390px layout without document overflow; actual shell account-menu dark mode and reduced-motion render. Zero browser page errors. See `local-qa.json`, `local-*.png`, and `scripts/forensics/storage-onboarding-run-local.mjs`. Dark mode was fixed in the owned CSS using scoped `[data-theme=dark]` selectors. Parent owns broader integrated regression and production checks. Visual parity is adapted, not claimed pixel-perfect: source has four onboarding steps, a coding agent and code diff; local has three storage steps and actual document processing.

## Independent integration review and fault recovery

Reviewed the parent Storage controller, model, extractor, IndexedDB vault, metadata persistence and treemap without modifying them. Two initial findings were sent to the parent and fixed there: metadata persistence was previously announced complete despite a swallowed local-storage write failure; a stopped run retained an active spinner. `scripts/forensics/storage-independent-review.mjs` now independently verifies the fixes:

- Inject a quota exception only when the knowledge-library manifest includes documents; actual processing and approval reach Needs attention instead of Complete. Restoring writes and clicking Retry save reaches Complete. Reload retains the document.
- Inject a metadata-write failure before deleting that document. The persisted manifest still includes it, and IndexedDB retains its original. Restore writes and retry Remove: deletion completes and the vault key is removed.
- Delay File.arrayBuffer by 1500ms to expose the asynchronous cancel boundary. Stop during fingerprinting now leaves zero running steps/spinners and an accurate stopped footnote.
- Process six actual text/Markdown/SQL/CSV files into Finance, Banking, SQL and Data, with subject changes in the human review. After 650ms every document row has opacity 1 and transform none. The populated treemap has the correct 2 / 2 / 1 / 1 file areas. Captured zoom-in mid-transition, settled category/file-type view and zoom-out; the affine transition settles into the correct geometry.

Current results: `independent-review.json`; captures: `review-map-*.png`, `review-stop.png`, `review-durability-complete.png` (initial name retained; current state correctly shows Needs attention) and `review-failed-delete.png`.
