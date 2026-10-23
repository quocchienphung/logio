# Invoice & Credit Note → Invoice workspace

Observed 21 October 2026. Source: https://www.affectui.com/blocks/invoice-credit → local: `/personalize?section=invoice` (Sales sidebar). This replaces the old single-sheet Invoice renderer; other workspace routes and Stripe are unchanged by this implementation.

## Evidence and scope

The React implementation is independently authored from the public preview, rendered DOM, exposed CSS, and public interaction documentation. No Pro source, installation endpoint, downloaded JavaScript bundle, iframe or screenshot renderer is used. `source-styles.css` and `invoice-reference.css` record the visible block CSS; integration fixes belong in `invoice.css`. Fonts reuse the already downloaded Inter variable font at `/sites/mapping/inter.woff2`.

Source states are in `source-invoice.png`, `source-credit.png`, `source-issued.png`, `source-mobile-*.png`, and the corresponding `source-*-dom.html`. `source-measurements.json` records computed styles. The source marketing page scales its 760px block to fit the preview. Comparison removes that outer scale, isolates the block from marketing overlays, and renders source/local at the same natural block widths: 760, 620, 390 and 320px.

The eight settled comparisons in `comparison/metrics.json` have identical block heights and 0.129–0.470% different pixels (pixelmatch threshold .12). These percentages apply to those sample states only. This does not claim equivalence for unobserved source behavior or all possible user data. Source/local/diff PNGs are saved for every pair.

## Cloned block behavior

- Invoice/Credit note tabs slide the papers over 620ms with `cubic-bezier(.65,0,.25,1)`. The rear paper moves up 14px, scales to .96, becomes inert and is hidden from assistive technology. Contents fade with the observed delay. The segmented thumb moves over 420ms.
- Checkbox paths draw over 260ms; toggling a line disables its amount and excludes it from the credit subtotal/tax/total. Each amount stays between zero and that line's net total. Source supports Enter to commit; local calculations also update immediately while typing as requested.
- Issue credit note saves the selected adjustment, shows Issued, disables amounts/checks and exposes Edit credit note. This screen records a document; it does not issue a payment/refund through a payment processor. An invoice edit returns its credit note to draft to avoid stale issued figures.
- Container breakpoints at 560/400px stack parties and hide rate/tax columns and the credit total column. Below 300px the action bar wraps to avoid overflowing a 320px phone's narrower workspace content area. Dark mode follows the workspace. Reduced motion switches immediately.
- Numeric updates have a short local 180ms fade/slide; the source sample and document geometry remain unchanged. Tab arrow keys/Home/End have been added for keyboard access.

## Added workspace functions (local product extensions)

These are requested extensions, not claims about private affectUI functionality:

- `Edit invoice` opens an inspector for seller/client name, multiline address, email, tax ID, invoice/credit numbers and dates, billing period, USD/EUR/GBP, payment URL and notes.
- Add, remove or reorder line items; enter quantity (three decimal places), unit price, tax per line and optional group. Calculation runs on every edit, including empty/zero fields and removals. The block retains its reference layout while the editor is closed.
- Save draft / Ctrl+S, saved invoice search/sort/open, blank invoices, duplication, deletion confirmation, JSON import, JSON/CSV export. The source sample is visibly unsaved until explicitly saved. Saved invoices lists actual saved documents.
- Pending changes are guarded when opening another invoice, creating/duplicating/importing, clicking the workspace's sidebar/explore links or switching workspace. Browser unload warns for unsaved changes. Browser-history transitions and all unrelated global command-menu actions are not intercepted.
- `PDF` opens a dedicated print document; choose Save as PDF in the browser's print dialog. This is not a server-generated PDF or one-click PDF download. CSV and JSON are real downloads. CSV guards against formula injection; printed text is HTML-escaped. Single-invoice JSON imports are validated, capped at 2MB and assigned a new id; colliding numbers receive a free local number.
- The source's Pay online anchor is `#pay`. Here it opens payment-link configuration until a valid HTTPS link has been entered; then it opens that provider's URL. No fabricated checkout is displayed.

## Ownership

| File | Responsibility |
| --- | --- |
| `src/components/sites/invoice/Invoice.tsx` | Loading/error states, library, save/retry/conflict state, navigation guard, dialogs and export controls |
| `InvoiceBlock.tsx` | Independently authored reference block, tabs, credit selection/amount controls, rolling money |
| `InvoiceEditor.tsx` | Live editing, numeric drafts, line creation/removal/reordering and focus |
| `invoice-model.ts` | v2 schema, strict validation, v1 migration, cents/tax/credits, numbering and CSV |
| `invoice-export.ts` | Escaped standalone print markup and print popup |
| `invoice-data-source.ts`, `BackendInvoice.tsx` | Storage seam and shared workspace backend adapter |
| `invoice-reference.css`, `invoice.css` | Observed CSS and local scoped integration/extensions |

## Data and calculation

Amounts derived from quantity × unit price are rounded half-up per line to cents; tax is rounded half-up per line from that line's net amount. BigInt intermediates avoid multiplication drift. Quantity supports .001; price .01; tax .01 percent. The UI supports two-decimal currencies USD/EUR/GBP only. Discounts, exchange rates, payments, inventory and jurisdiction-specific tax rules are not inferred from the source block.

Library v2 replaces the v1 singleton, preserving the resource name `invoice` and browser key `affectui:{workspaceId}:invoice`. Previous v1 names, addresses, dates, descriptions, quantities, rates, tax and note are migrated on read; the new format is written only on Save. Invalid data displays a retry notice and is not overwritten with demo data. No live backend is configured by this change. See [API contract](api-contract.md).

## Verification

- `node --experimental-strip-types --test src/components/sites/invoice/invoice-model.test.mjs`: eight calculation/validation/migration/CSV tests.
- `node scripts/qa/invoice-credit.mjs`: real browser workflows, desktop/mobile/landscape, exports/import, credit persistence, keyboard, reduced motion and runtime errors.
- `node scripts/qa/invoice-credit-backend.mjs`: authenticated REST load/save, If-Match, failed issue, revision conflict and rejected load using a mock server.
- `node scripts/forensics/invoice-credit-compare.mjs`: eight source/local comparisons.
- Historical entry points `scripts/qa/invoice.mjs` and `scripts/forensics/invoice-compare.mjs` now forward to these current scripts. The invoice section of the shared backend QA has been updated for v2.
- Results and screenshots are in `qa/` and `comparison/`. Full-check status is recorded in the handoff alongside the final build result.

Final production smoke also passed against the optimized build on a temporary local port: route rendering, live quantity/total edits, save/reload and zero runtime errors. Evidence: `qa/production.png` and `qa/production-results.json`. The temporary server was stopped after verification; the existing development server remains at port 3000.

Final check status: full lint, typecheck and the final production build all passed. Lint reports seven existing warnings outside Invoice and no errors. The earlier AgentTree lint failure was resolved by the concurrent work in that section. All 13 browser groups, 4 REST mock groups and 8 model tests pass.
