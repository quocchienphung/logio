# Logio branding and sidebar — 2026-10-20

The Guide me sidebar starts with a single **Explore pages** link. The old workspace header and decorative sparkles are removed. Workspace switching, creation, uploaded logos, Search and Collapse sidebar live in the account menu. Ctrl/Cmd+K still opens search. The hardcoded “Pro · 8 members” workspace badge is removed.

Presentation copy uses Logio across workspace names, profile/contact/member/billing email samples, the Run tool transcript, the Pixel integration example, invoice CSV filenames and the shared usage-meter demo.

`workspace-brand.ts` and `useBrandedStoredState.ts` normalize legacy saved display copy. They preserve existing workspace IDs (`acme`), storage keys, asset paths, record IDs and unrelated data. Reads do not rewrite localStorage; subsequent edits use normalized data. The existing storage hook, CRM engine, backend adapters, API contracts and Claude Code's `src/lib/workspace-backend/` work are untouched. The wrapper delegates persistence to the existing hook.

Implementation changes are in the CRM shell and display copy, Settings sample copy, Run sample copy, and `guide-navigation.css`. Generated reference CSS, captured icons and frozen source evidence remain untouched. QA selectors now open workspace actions from the account menu.

Run `node scripts/qa/logio-branding.mjs` to scan all workspace sections, all Settings tabs, CRM views, Profile, legacy stored data, workspace switching, search, collapse and mobile navigation. Results and desktop/mobile screenshots are in `qa/`. The normalization test runs with `node --experimental-strip-types --test src/components/sites/affectui-crm/workspace-brand.test.mjs`.

Validation: branding scan (5 groups), Guide navigation (11 groups), CRM (11 groups), Settings tabs (9 interaction groups), normalization unit test, TypeScript, ESLint and production build passed. ESLint reports five existing warnings in unrelated Stripe/forensics files. Settings reference image comparisons remain diagnostic; desktop metrics have an existing null result and are not evidence of pixel equality.
