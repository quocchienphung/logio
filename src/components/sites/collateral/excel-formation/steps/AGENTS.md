# Current scope: Collateral UI simulation (2026-11-04)

Excel formation, JSON formation and Queue are UI-only simulations at the user's request. Preserve their existing presentation, interaction and measured motion; use the fixed sample data in `../../simulation/`. Do not reintroduce workbook processing, prediction, business validation, real exports or Queue persistence in these pages.

Flip is being developed separately. Do not edit `src/components/sites/flip/` or its QA. Flip reuses ImportStep and WorkbookUnfurl through the same provider; use `isSimulation` to keep its real read-only workbook preview intact. Its reader is isolated in `src/lib/workbook-preview/` and `useWorkbookPreview.ts`.

The original Link unfurl measurements remain in `docs/research/link-unfurl/README.md`. Keep the measured animation/geometry, focus restoration, pointer gestures and reduced-motion behavior. New copy/data for the three demo pages may be explicitly labelled as simulation.

QA: `node scripts/qa/collateral-simulation.mjs <base-url>` and the model tests under `collateral/simulation/`. The former repair/report and persisted Queue QA were retired with those implementations. Never reset, stage or overwrite another agent's work.
