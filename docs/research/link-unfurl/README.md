> **Superseded 2026-11-04:** Excel formation, JSON formation and Queue are UI-only simulations. The processing/persistence behavior and historical QA below no longer describe those pages. Current contract: [UI simulation](../../collateral/12-ui-simulation.md). Flip keeps its separate read-only workbook preview.

# Excel formation · Import / Link unfurl

Scope and ownership (2026-11-02): Codex changes only `collateral/excel-formation/steps/ImportStep.tsx`, the import-step advance effect in `ExcelFormation.tsx`, new `steps/import-*` and `steps/WorkbookUnfurl.tsx`, this research folder, and dedicated `link-unfurl` forensic / `excel-import` QA scripts. Claude's engine, Overview, Review, Export, JSON formation, navigation, dictionaries and shared StorageDropzone are outside this change. Do not reset, overwrite, stage or commit the other in-progress files.

## Evidence and limits (for the next agent, including Claude Code)

- Source: https://uiarc.dev/components/link-unfurl and its public documentation, inspected using the repository's `.agents/skills/clone-website/SKILL.md` workflow. The source's Code tab is Pro-gated; no private source, registry/API, bundles or install endpoints were read.
- `source/declared-styles.css`, `desktop-measurements.json`, `mobile-measurements.json`, `open.html`, screenshots and `*-frames.json` are observed public DOM/CSS/rendered states, not implementation source.
- Observed: 576px composer, 26px outer radius, 26px inline chip, card capped at 440px, 18px open radius, 30px header, 8px card padding, 16px favicon. Width grows before depth; body fades later; collapse follows the reverse route faster. The public docs describe a critically damped spring. Our implementation uses interpolated measured progress samples, not claimed knowledge of its private spring constants.
- Product adaptation: workbook file chip replaces a URL; actual worksheet names, header names, data-row counts and a small table from the existing `sheetWindow` worker request replace an Open Graph photograph. Only the current primary sheet's available columns/rows are shown, not a full workbook renderer. Without a primary sheet, verified worksheet inventory remains available. No preview is invented; no local workbook or its contents are fetched from an external service. Source fetching is development research only.
- Import stays open after the worker finishes so the person can inspect the file and choose **See what was found**. This deliberately replaces the old 650ms automatic advance. Other steps and the worker contract remain owned by the existing implementation.

Do not claim pixel perfection, universal usability, real-device performance, or passing tests without running and recording them. Keep observations, adaptations and untested states distinct. Verify current files and worker types before extending; the IDE's old `credit/` paths no longer match this checkout. These instructions constrain repository collaboration; this document cannot control an independent Claude session that has not read it.

## Reproduction

- Source capture: `node scripts/forensics/link-unfurl-inspect.mjs`.
- Local route: `/personalize?section=excel-formation` (step Import).
- Import QA: `node scripts/qa/excel-import.mjs http://localhost:3004` — **43 checks passed** against the production build, including center alignment, keyboard chooser, invalid CSV and corrupt XLSX, retry/cancel, real worksheet/cell contents, retained Import, fold/reopen/drag, focus restoration, Review/Export/JSON navigation, responsive widths 320/390/768/1280/1920, short 600px viewport, reduced motion, dark theme, Vietnamese copy and no external requests or browser exceptions. Machine-readable result: `local/results.json`.
- Existing route/sidebar regression: `node scripts/qa/rules-collateral.mjs http://localhost:3004` — **17 checks passed**. The older full `collateral.mjs` suite was not claimed as passing: its Import selectors/advance assumptions were being updated in the parallel session.
- `npm run build` passed (includes TypeScript); ESLint passed on all touched TS/TSX and the two new scripts. Existing framework warnings about the parent package-lock and standalone startup remain outside this UI change.

## Rendered comparison

Reviewed the source and local renders at 1440×1000 and 390×844; local dark, 320px and Vietnamese states were also inspected. The content adaptation is deliberate, so a whole-image pixel-diff percentage would not measure fidelity meaningfully.

| Observed geometry | Public source | Local desktop |
| --- | --- | --- |
| Composer width / corner | 576px / 26px | 576px / 26px |
| Card width cap / open corner | 440px / 18px | 440px / 18px |
| Chip / favicon | 26px / 16px | 26px / 16px |
| Header / card padding | 30px / 8px | 30px / 8px |
| Media ratio | 1.91:1 photograph | 1.91:1 scrollable real worksheet preview |

Comparison references: [source desktop](source/desktop-open.png), [local desktop](local/desktop-ready.png), [source mobile](source/mobile-open.png), [local mobile](local/390-ready.png), [centered empty state](local/desktop-idle.png), [dark](local/desktop-dark.png). The motion table normalizes the captured chip/card geometry; a direct curve-to-frame check found less than 0.001 normalized height error in both directions (this validates reproduction of those observations, not all possible source states).

Intentional differences: no message editor, URL resolver, sample brands, Send action or stock photo; toolbar instead chooses/retries/cancels a local workbook and continues to Overview. Mobile controls grow to 36–44px; actual worksheet media scrolls where needed. No new dependency or network service was introduced. Real-phone testing and a formal usability study were not performed.

The scoped `steps/AGENTS.md` and `steps/CLAUDE.md` share the evidence contract for both agents. They cannot guarantee behavior in an independent agent session that has not loaded them.
