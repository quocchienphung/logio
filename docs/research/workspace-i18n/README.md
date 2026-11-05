# Guide me: English / Tiếng Việt

User-authorized localization of `/personalize` (including its page selector) and `/skilled`. **Orchestrator is now included** following the user's additional request; the earlier exclusion has been lifted for copy. Its responsive CSS remains with Claude Code. See [Orchestrator scope and verification](orchestrator.md). Homepage and Stripe product pages remain English.

## Language control

Settings → General → Language has the same `Segmented` control as Theme: **English / Tiếng Việt**. Choose a language and Save. English is the original/default. The choice survives refresh and navigation between workspace groups and `/skilled`.

`WorkspaceI18nProvider` shares the language with page components and portals, including the global command palette. The account/device resource `interface-language` uses the existing workspace storage layer (`affectui:interface-language`); it makes no translation-service request and is never sent to a REST workspace backend. The Vietnamese catalog is a separate dynamic chunk, prewarmed on workspace routes. Marketing routes do not download it. Document `lang` follows the effective language.

## Copy and data boundaries

- Authored English → Vietnamese catalogs are under `src/components/sites/i18n/vi-*.ts`. They cover navigation, settings, security previews, CRM, Reports, Usage, chat/files controls, Process/Tracing, invoices, Skilled/Repo/Storage, previews, loaders, validations and actions.
- Translation happens in React presentation boundaries. No text-node mutation, remote translation, screenshot renderer, changes to route IDs, enum values, backend payloads, saved document contents or checksums.
- Explicit templates use `uiText("Run {0}", [name])`. Interpolation values are preserved. There is **no sentence-pattern guessing or partial word replacement**. Unknown strings remain unchanged.
- Names, workspace records, editable documents, actual chat/service output, original skill files and executable model instructions remain their original data. Read-only copy for the app's known sample runs has authored translations. A custom name such as “Save”, “Home” or “Cancel” is not translated in record fields.
- Settings and navigation search support Vietnamese and English, including unaccented Vietnamese. Display labels change; action IDs and hrefs remain stable. Combobox options retain their original submitted values; `localize: false` protects free-text names.
- Security disclosures retain their meaning: the session list and security operations are samples/simulations, not real authentication. Billing, delivery receipts and Storage extraction do not acquire new capabilities through translation.

## Layout and fonts

Existing grid CSS, font families, sizes and weights are retained. The Language row changes from the unused regional-language select to the requested two-option segmented control. Vietnamese copy uses short action labels where space is constrained; the existing responsive wrapping, scrolling and measured animation widths remain in charge.

The bundled Inter Latin faces, Mapping/Invoice/Palette Inter and Mapping Geist lacked Vietnamese glyphs (checked with fontTools). Their existing Latin files remain in use. Unicode-ranged faces add the existing `inter-vietnamese.woff2` and a locally stored **Geist Vietnamese** subset, with its OFL license. `geist-font-source.css` records the Google Fonts source. No runtime font fetch from Google is required.

## Verification

- `npm run build`: production compilation and TypeScript passed.
- ESLint over changed application files and the new localization module: passed.
- `node --test src/components/sites/i18n/translate.test.mjs`: 5 tests for English identity, exact Vietnamese lookup, interpolation/data safety, catalog placeholders/encoding and bilingual Settings search.
- `node scripts/qa/workspace-i18n.mjs http://localhost:3001`: language Save/persistence, Settings and Tab-palette search, 19 workspace pages, responsive Settings at 390/768/1920 px; no page errors.
- `node scripts/qa/workspace-i18n-layout.mjs http://localhost:3001`: all 19 included pages plus Guide selector at **320, 390, 768, 1440 px**; no document horizontal overflow or page errors. Screenshots and measurements are in `layout/`.
- `node scripts/qa/workspace-i18n-state.mjs http://localhost:3001`: identical Settings font metrics/control grid across languages; record names and stored data preserved; return to English; homepage remains English.
- Existing Settings QA: 71 checks passed; account/security QA passed, including mobile 320/390 and reduced motion.

The final full repository run has **464/472 passing tests**. The 8 failures read missing recorded fixtures under `uiarc-terrain/fixtures/`, `uiarc-split-bar/labels-fit.json` and `uiarc-confirm-morph/fit.txt`. Those reference files were not restored or changed by this task. See `unit-tests.log`; this is not a claim that the entire repository suite passed.

The screenshots verify the tested sizes and observed states. They do not establish identical layout on every possible device or translate arbitrary text returned by a future external service.
