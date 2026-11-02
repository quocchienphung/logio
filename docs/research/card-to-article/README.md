# Card to article → live workbook viewer

Source: https://uiarc.dev/components/card-to-article. Inspected 2026-11-02 from the public rendered preview only. The Pro implementation, registry, code tab, application bundles and source-site APIs were not accessed.

`scripts/forensics/card-to-article-inspect.mjs` records desktop/mobile open and Escape-close behavior, rendered box geometry and observed `Element.animate` calls. Evidence is in `source/`. This is an independent workbook adaptation; it does not contain UIArc's private engine.

| Observed | Evidence / application |
| --- | --- |
| A card's box becomes a scrolling dialog, then returns to its slot | `closed-*`, `open-*`, `motion-*.json`; workbook frame morphs from the source stage's measured rectangle |
| Width progress is nearly identical at 1440/390px | At 100/200/300/500/800ms after the first transformed frame: approximately .212/.556/.782/.956/.997. `WorkbookViewer.tsx` interpolates those samples, settling at 950ms |
| Backdrop entrance | Observed 320ms, cubic-bezier(.22,1,.36,1) |
| Body entrance | Observed 140ms delay, 360ms fade with the same curve |
| Close chrome entrance | Observed 180ms delay, 550ms sampled linear easing |
| Escape, focus trap, focus return, scroll lock | Exercised in the public preview and local browser QA |
| Public documentation describes pull dismissal and remeasurement on close | Workbook provides a dedicated drag handle; native worksheet scrolling retains mouse/touch gestures. Local 120px / .65px-per-ms release guards and return spring are adaptation choices, not recovered source constants |

The source's desktop article is capped at 680px and uses a photographic hero at 4:3. This app needs a wide spreadsheet; the correction editor remains on the underlying page. Its frame dimensions, theme colors, dedicated handle, sheet toolbar and cell rendering are workbook-specific. It animates the frame's box and clips real live content; it never stretches the spreadsheet's glyphs or uses a screenshot as its content. Only the selected sheet/visible row windows enter the UI, with native scrolling and bounded caches.

Implementation ownership for this task: `gallery/SheetViewer.tsx`, `gallery/WorkbookViewer.tsx`, `gallery/{sheet-viewer,workbook-viewer}.css`, `gallery/viewer-labels.ts`, `engine/workbook-grid.ts` and its tests; small integration changes in `gallery/IssueGallery.tsx`, `steps/ReviewStep.tsx`, `collateral/engine/{protocol,collateral.worker}.ts` and `useCollateralEngine.ts`. The existing `gallery.css`, predictor/decoding engine, import workflow, shared translations, navigation and other in-progress changes were preserved. No staging, resetting or commits were performed.

Local synthetic evidence is in `local/`. Real workbook QA records only aggregate counts, with no screenshots or cell content in logs. Run:

```sh
npm run build
npm run start -- -p 3003
node scripts/qa/collateral-workbook-viewer.mjs http://localhost:3003
node --experimental-strip-types scripts/qa/collateral-workbook-reference.mjs http://localhost:3003
node scripts/qa/collateral-review.mjs http://localhost:3003
node scripts/qa/collateral-correction-workbench.mjs http://localhost:3003
```

The workbench regression's old ≤260px placeholder-preview assertion was updated to permit 280–420px readable rows. Its correction, approval, draft and Undo checks remain unchanged.

See [the operating contract](../../collateral/10-live-workbook-viewer.md) for behavior and limitations.


## Reverse morph and file-only popup · 2026-11-02

The popup now gives the file the full available width and contains no correction sidebar or editor toggle. The editor stays mounted in its original page slot, which is inert while the modal is open.

The original fixed fullscreen inner content was the cause of a visible layout jump at the end of collapse. Frame and live content now share one geometry progress value, including the pull handle's 26 → 0px inset and the measured source corner radius. The sheet is returned while still connected, before React removes the popup; `sheet-host.ts` restores scroll offsets after reparenting. No screenshot, scaled text or duplicate sheet renderer is used.

New source evidence in `return-source/` samples the public preview's closing direction at 1440/390px. The final visible dialog exactly matches the source card; the card remains hidden until handoff. `sync-local/frames.json` records synthetic local frames for regression, and `scripts/qa/collateral-viewer-morph.mjs` compares the last popup frame to the first inline frame (host size <1px, cell position <2px, scroll ≤1px). Workbook dimensions, content reflow and scroll retention remain independent adaptations, not a claim to UIArc's private engine.


Final validation for this update: `npm run check` (lint/typecheck/production build), 102/102 Collateral unit tests, production workbook viewer 93/93, review/editor regressions 35/35 and frame-sampled morph regressions 48/48. The latter includes a damaged character after a 540-character prefix, the actual dark workspace theme, light mobile views at 390/320px, outside click, early Escape, resized popup and reduced motion. The final popup/inline frame has matching sheet dimensions, selected-cell and marked-text coordinates, and native scroll offsets. Evidence uses synthetic workbooks. Browser-emulated touch is not a physical-device measurement.
