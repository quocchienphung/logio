<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Website Reverse-Engineer Template

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — just run `/clone-website <url1> [<url2> ...]`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Base UI primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **Deployment:** Vercel

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utilities or scoped CSS; avoid inline styles unless behavior needs dynamic values
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/
  app/              # Next.js routes
  components/       # React components
    ui/             # shadcn/ui primitives
    sites/<site>/   # Source-specific components, including extracted SVGs
  lib/
    utils.ts        # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/
  sites/<site>/     # Source-specific images, fonts, video, and other assets
docs/
  research/<site>/  # Page brief, asset map, and inspection evidence
  design-references/ # Screenshots and visual references
scripts/            # Asset download scripts
.agents/
  skills/
    clone-website/  # Canonical cross-agent cloning workflow
.claude/
  commands/
    clone-website.md # Thin Claude Code invocation bridge
```

## Agent Workflow
- Edit `.agents/skills/clone-website/` for cloning-workflow changes. It is the canonical skill used by Codex, Cursor, and OpenCode.
- Keep `.claude/commands/clone-website.md` as a thin Claude Code bridge to the canonical skill; do not duplicate the workflow there.

## This Repository: Stripe Clone
This checkout already holds a stripe.com reconstruction. Read `docs/stripe-handoff.md`, `docs/stripe-component-status.md`, and `docs/stripe-forensics.md` before changing it.
- Homepage: `src/app/page.tsx` + `src/components/stripe/`; product pages: `src/app/(v1)/` and `src/app/(hds)/` + `src/components/sites/stripe-com-*/`.
- Styles in `src/styles/stripe/generated/` and `src/styles/stripe/products/hds-*.css` are generated — put fixes in the matching `*-overrides.css`.
- Assets: `public/stripe/` and `public/sites/`; frozen reference captures: `docs/research/`.
- Visual/QA tooling (Playwright + pixelmatch): `scripts/forensics/`.
- The Sessions slot is an iPhone Duo (three.js + CSS3D) showing the affectUI usage meter as live DOM: `src/components/stripe/Sessions/iphoneDuo/`, `src/components/sites/affectui-usage-meter/`; assets via `scripts/iphone-duo/README.md`.

## affectUI CRM / Guide me
- Read `docs/affectui-handoff.md` before extending affectUI. The public library inventory and shared UI namespace map are in `docs/research/affectui-library/README.md` and `engine-map.json` (109 documented items).
- Guide me links to `/personalize`, implemented by `src/components/sites/affectui-crm/`. The source reference is `https://www.affectui.com/screens/crm/full`.
- `reference.css`, `icons.json` and `seed.json` in that folder are generated from observed public preview evidence; put CSS fixes in `crm-overrides.css`.
- QA: `node scripts/qa/affectui-crm.mjs`; visual comparisons: `node scripts/forensics/affectui-compare.mjs`. Evidence lives in `docs/research/affectui-crm/`.
- The library inventory covers public docs and initial Clean previews. CRM, Analytics, Settings & Billing and Agent Run have local implementations; gated Pro source and unobserved states are not part of the capture.
- Analytics is implemented in `src/components/sites/affectui-analytics/` and opens from **Reports** at `/personalize?section=reports`; it reuses the CRM sidebar. Read `docs/research/affectui-analytics/README.md` for the source data, animation contract and comparisons.
- Workspace interactions now include Home, Contacts CRUD, pipeline filters, custom views, editable/downloadable documents, Profile/Settings, and per-workspace browser storage. State/navigation helpers are in `workspace-state.ts`; shared dialogs/pages/editors are adjacent to `Crm.tsx`.
- Additional QA: `node scripts/qa/affectui-workspace.mjs`; Analytics comparison: `node scripts/forensics/affectui-analytics-compare.mjs`. Put Analytics fixes in `analytics-overrides.css`, not `analytics-reference.css`.
- **Settings** (a panel over the current page, `?settings=<section>`, `src/components/sites/settings-command/`; source: public UIArc Settings command preview, `docs/research/uiarc-settings-command/README.md`): seven sections including **Where you log** (`?settings=where-you-log`, `security-settings/`, public UIArc Security settings preview). The account menu has identity + inline Light/Dark/System Theme (`AccountTheme.tsx`); Profile, Help & feedback and Appearance & notifications were removed, along with `QuickSettings.tsx`. Where you log is explicitly a security UI preview: sample sessions and simulated actions, no real authentication; only non-secret metadata uses device resource `security-preview`. Read `docs/research/account-settings/README.md`. QA: `node scripts/qa/account-settings.mjs`, `node scripts/qa/settings-command.mjs`. CSS: `settings-command.css`, `security-settings.css`, `account-theme.css`.
- The agent usage / plan / members / API keys page that used to be Settings is now **Usage** (`/personalize?section=usage`, still `src/components/sites/affectui-settings/`; "Invite your teammates" opens `section=usage&settings-tab=members`). Below, "Settings" in the older affectUI notes means this Usage page. It is lazy-loaded from `src/components/sites/affectui-settings/`; read `docs/research/affectui-settings/README.md`. The four tabs support query/history navigation, persistent workspace settings/members/billing/demo API keys, real CSV invoices and reduced motion. Billing, invitations and keys are local demos without external service calls.
- Settings QA: `node scripts/qa/affectui-settings.mjs` and `node scripts/qa/affectui-settings-tabs.mjs`; comparison: `node scripts/forensics/affectui-settings-compare.mjs` and `affectui-settings-detail-compare.mjs`; production measurement: `node scripts/forensics/affectui-settings-performance.mjs <base-url>`. CSS fixes belong in `settings-overrides.css` or `settings-tabs.css`, never the captured `settings-reference.css`.
- **Run** follows **Reports** at `/personalize?section=run`. It is lazy-loaded from `src/components/sites/affectui-run/`. Read `docs/research/affectui-run/README.md` for the timed state machine, approval gate, editable plan, tool-call disclosures, inline draft diff and reference comparisons. UI is React/CSS/SVG, with no screenshot/iframe renderer or remote bundle.
- Run state/draft persist per workspace. `run-model.ts` is the deterministic simulation, `useRunEngine.ts` supplies time events, `RunClock.tsx` isolates waiting clocks. No email/calendar/external tool is invoked. Put visual fixes in `run-overrides.css`, `run-plan-activity.css` or `run-draft.css`, not generated `run-reference.css`.
- Run QA: `node scripts/qa/affectui-run.mjs`, `node scripts/qa/affectui-run-draft.mjs`, `node scripts/forensics/affectui-run-plan-inspect.mjs`; model tests: `node --experimental-strip-types --test src/components/sites/affectui-run/run-model.test.mjs`. Source/local comparison: `node scripts/forensics/affectui-run-compare.mjs`; performance: `node scripts/forensics/affectui-run-performance.mjs <production-base-url>`.

- **Process map** (`/personalize?section=process`, `src/components/sites/process/` + `affectui-agent-tree/`): full-bleed map of blocks (13 roles, 93 AI engines, tools, approvals) joined by connections the person draws (loops back to earlier blocks, or "wait for me"), with a Tree view. Simulated engine by default; REST engine via `serverProcess`. Read `docs/research/process/README.md` and "Process (engine)" in `docs/backend-api.md`. QA: `node scripts/qa/process.mjs`; tests: `npm test`. CSS fixes in `process.css` / `process-map.css` / `agent-tree.css`.
- **Notification Stack** (`src/components/sites/affectui-notification-stack/`; source: public preview of affectUI's Notification Stack, observations in `docs/research/notification-stack/`) shows the Process page's run notifications (`process/run-notices.ts`). **Shimmer Loader** (`src/components/sites/shimmer-loader/`; source: public preview of affectUI's Shimmer Loader, `docs/research/shimmer-loader/`) draws a skeleton per workspace page while it loads: a new section needs an entry in `skeleton-kind.ts` (a unit test checks every section has one). QA: `node scripts/qa/skeleton.mjs`; inspection: `node scripts/forensics/notification-shimmer-inspect.mjs`.
- **Invoice stamp** (`src/components/sites/invoice/StampStage.tsx`, Sales → Invoice → *Mark as paid*): a date-picker pop-up that turns into a 3D stamping scene (stamp = CSS 3D solid in the paper's camera; paper = the invoice's own sheet via `InvoiceSheetBody`). Timeline in `stamp-timeline.ts` (pure, measured from `docs/invoice.mp4`); read `docs/research/invoice-stamp/README.md`. Never put `will-change` on a scaled layer there (it blurs). QA: `node scripts/qa/invoice-stamp.mjs`; tests: `npm test`.
- **Tracing** (`/personalize?section=tracing`, `src/components/sites/tracing/` + `affectui-trace-waterfall/` + `process/trace-build.ts`): the run of a process as a live Trace Waterfall (source: public preview of affectUI's Trace Waterfall; observations in `docs/research/trace-waterfall/`). Read-only: it re-reads the Process page's plans and run. QA: `node scripts/qa/tracing.mjs`; inspection: `node scripts/forensics/trace-waterfall-inspect.mjs`. CSS fixes in `trace-waterfall.css` / `tracing.css`.
- **Repo** (`/personalize?section=repo`, directly under Skilled; `src/components/sites/repo/Repo.tsx`): the Activity terrain only (it moved here from the bottom of `/skilled`). Skilled keeps a Metric card row (`SkillOverview.tsx`), Sparkline and Timeline (`SkillTimeline.tsx`), independent builds of UIArc's public Metric card / Timeline behavior (`docs/research/uiarc-repo/`, shared UI in `src/components/sites/skilled/ui/`). The app is also a home-server REST backend: `src/app/api/workspace/[...path]/route.ts` + `src/lib/server/` (file store, token/LAN guard, `skill.transfer` to an agent folder); see "Built-in home-server API" in `docs/backend-api.md` and `.env.example`. Read `docs/research/repo/README.md`. QA: `node scripts/qa/repo.mjs`, tests: `npm test`. CSS fixes in `ui/ui.css`. Under the terrain sits a **Split bar** ("Where the week went": by day / time of day / action; `src/components/sites/skilled/split-bar/` + `terrain/terrain-breakdown.ts`; source: public preview of UIArc's Split bar, measured from the rendered page only, `docs/research/uiarc-split-bar/README.md`): hovering a part fades the other columns of the terrain, an hour hovered in the terrain lights its part, and switching a part off leaves its hours out of the terrain and its totals. QA: `node scripts/qa/split-bar.mjs`. CSS fixes in `split-bar.css` (bar) or the end of `activity-terrain.css` (the row around it).
- **Skilled: edit, save, delete** (`/skilled`; `SkillEditor.tsx`, `skill-edit.ts`, `skill-persist.ts`, `ui/ActionButton.tsx`, `ui/ConfirmMorph.tsx`; sources: public previews of UIArc's Action button and Confirm morph, measured from the rendered pages only, `docs/research/uiarc-action-button/`, `uiarc-confirm-morph/`, `skilled-edit-delete/`): a ready skill's card has **Edit** (SKILL.md editor, header gives name/description, **Save changes** = Action button that stays on *Saving* until the workspace has stored it, SHA-256 recomputed) and every card has **Delete** (Confirm morph in hold mode, 1 s; the card stays with *Deleted · Undo* for 8 s). A component that morphs its own buttons must set `data-interaction-own`, or the shared `InteractionRuntime` animates the same button's width and press on top of it. QA: `node scripts/qa/skilled-edit-delete.mjs`; tests: `npm test`. CSS in `skill-edit.css`, `ui/action-button.css`, `ui/confirm-morph.css`.
- **Storage: edit details, hold-to-remove with Undo** (`/personalize?section=storage`; `StorageDocumentEditor.tsx`, `storage-edit.ts`, `storage-purge.ts`, `storage-edit.css`; reuses Skilled's `ui/ActionButton` and `ui/ConfirmMorph`, `docs/research/storage-edit-delete/README.md`): the document dialog edits name (extension fixed) and knowledge area with Save changes (stored and read back); removal is the hold-mode Confirm morph and is two-step (metadata out at once, files deleted after a 10 s Undo window; every removal is noted in local storage until its files are gone, and the next visit finishes it). `StorageActionButton` / `StorageConfirmMorph` were removed. QA: `node scripts/qa/storage-edit-delete.mjs` (run it, `storage-layout.mjs` and `storage-backend.mjs` against a production build: the dev server is too slow for the 25-document runs); tests: `npm test`.
- **Activity terrain** (`src/components/sites/skilled/terrain/`, shown on the Repo page; source: the public preview of UIArc's Activity terrain, measured from the polygons its canvas draws, `docs/research/uiarc-terrain/README.md`): the workspace's hourly operations / deliveries / errors (`skill-events`) as a 3D terrain you can orbit, zoom, fly into and flatten; a labelled sample week shows while nothing is recorded. The `terrain-*.ts` modules are pure and checked against recorded frames (`terrain.test.mjs`, `fixtures/`). QA: `node scripts/qa/terrain.mjs`; evidence and tools: `scripts/forensics/uiarc-terrain-*.mjs` (they read the rendered page only, never UIArc's API or Pro source). CSS fixes in `activity-terrain.css`.
- **Glyph loading effect** (`src/components/sites/ascii-reveal/`; idea from the public ascii-reveal demo, read from the rendered page only, code written independently; `docs/research/ascii-reveal/README.md` holds the risk review): while a lazily loaded page is awaited the content panel is covered by a moving glyph field (`AsciiLoading`, mounted by `SectionSkeleton`), and when the page arrives after a wait that was seen it dissolves in a wave (`revealed()` wraps every dynamic page in `Crm.tsx`). Settings → Appearance → **Loading effect** (Decode/Dither/Terminal/Blueprint/Off); reduced motion or Interface motion off disables it. The module must stay inert: no network, storage, page-text or pixel reads, no outside fonts/URLs, no new dependency. QA: `node scripts/qa/ascii-reveal.mjs` and `node scripts/qa/ascii-reveal-audit.mjs`; tests: `npm test`.
- **Sidebar folder** (`src/components/sites/affectui-crm/SidebarFolder.tsx` + `sidebar-folder.css`; source: public App rail preview of UIArc's Sidebar, `docs/research/uiarc-sidebar/`): the **Techniques** folder holds Process and Tracing (declared as `sidebarFolders` in `Crm.tsx`). QA: `node scripts/qa/sidebar-folder.mjs`. CSS fixes in `sidebar-folder.css`.
- **Block shortcuts / Orbit menu** (`src/components/sites/orbit-menu/`, `process/block-shortcuts.ts`; source: public preview of UIArc's Orbit menu, read from the rendered page only, `docs/research/orbit-menu/README.md`): right click (or Menu / Shift+F10, or a long press on a phone) on a Process block, in Map or Tree view, opens a fan of its actions at the pointer (run/review/retry, settings, add, duplicate, approval, delete) with hotkeys R/T/S/A/D/P/Delete; the settings side panel stays. What a block may do is decided in `block-shortcuts.ts` (same guards as the studio); `ProcessMap` only reports `onBlockMenu`. QA: `node scripts/qa/orbit-menu.mjs`; tests: `npm test`. CSS fixes in `orbit-menu.css`.
- **Docked settings panel** (Process page; motion learned from UIArc's AI side panel, recorded frame by frame from the public preview, `docs/research/ai-side-panel/README.md`): the block settings panel slides in with a spring fitted to those recordings (stiffness 300, damping 37) and pushes the map over by half its width (the Tree view makes room with padding). One motion value `reserve` in `ProcessPage.tsx` drives the panel, the tree and the map (`push` prop of `ProcessMap`, written as the CSS variable `--push`, folded into the view when it stops). Also in that pass: map blocks no longer keep finished `animation-fill-mode: both` animations and the stage has no standing `will-change` (they blurred text when zoomed); link pills are centred with `translate` because `src/styles/interaction.css` clears `transform` on a pressed `button[aria-expanded]`. QA: `node scripts/qa/ai-side-panel.mjs`; run it on a production build for frame times that mean something.

- **Cookie consent** (`src/components/sites/cookie-consent/`, mounted site-wide by `ConsentRoot` in `src/app/layout.tsx`; clone-engine build from the public preview of UIArc's Cookie consent: morph, face fades, entrance and switch recorded frame by frame and fitted, `docs/research/cookie-consent/README.md`): a bar that springs into a preferences panel and folds into a 44px reopen button; choice kept in localStorage `logio-cookie-consent` (version `1`, `readCookieConsent`), footer *Cookie settings* link opens the panel, dark theme followed, not shown on `/guide`. Springs/fades live in `consent-model.ts`. QA: `node scripts/qa/cookie-consent.mjs`; tests: `npm test`. CSS fixes in `cookie-consent.css`.

- **Process activity** (`process/ProcessRunMonitor.tsx` exports `ProcessRunBar`, `process-run-monitor.css`, `run-monitor-model.ts`; independent recreation of UIArc's Agent run card, `docs/research/process-agent-run/README.md`): the top-right bar of `/personalize?section=process` IS the monitor. Its **Activity** toggle unfolds the bar into a card with every block step (verbs, connections, approvals, reported calls, result); there is no separate circle. `AgentBar` got a `trailing` slot for the toggle. QA: `node --experimental-strip-types scripts/qa/process-agent-run.mjs` and `node scripts/qa/process-agent-run-regression.mjs`.

- **Split button + Bottom sheet on the Process page** (clone engine from the public previews of UIArc's Split button and Bottom sheet; every motion recorded frame by frame and fitted, `docs/research/split-button/README.md`, `docs/research/bottom-sheet/README.md`): the name pill's folder/plus icons are one `SplitButton` (`src/components/sites/split-button/`, main half **New process**, menu: Saved processes, Duplicate, Export, Import, Delete; the main label morphs to *Created/Exported…* in place), and **Saved processes** / **New process** are `BottomSheet`s (`src/components/sites/bottom-sheet/`, `process/ProcessSheets.tsx`) instead of dialogs. The sheet lives in the body (own `--bs-*` tokens, theme read from the opener), uses a single `y` value with detents, 1:1 drag, rubber band, projected-velocity release (`sheet-model.ts`, all tested against recorded numbers). QA: `node scripts/qa/split-button.mjs`, `node scripts/qa/bottom-sheet.mjs`; tests: `npm test`. CSS fixes in `split-button.css`, `bottom-sheet.css`, `process-sheets.css`. **Delete a process** has no dialog: the menu's *Delete this process* row and the sheet row's trash icon are Confirm morphs (`SplitButtonAction.confirm`, `skilled/ui/ConfirmMorph`; "Delete? Cancel Delete", then *Deleted · Undo* through the page's history); the button and its menu take the bar's colours (`.sb-group.proc-split`, `matchColors`). QA: `node scripts/qa/process-delete-morph.mjs`.

- **Orchestrator** (`/personalize?section=orchestrator`, the **Techniques** folder under Process and Tracing; `src/components/sites/orchestrator/`; independent build of the public previews of UIArc's Agent orchestrator, Tool call and Agent timeline, read from the rendered pages only: DOM, declared CSS, `Element.animate` calls and frame-by-frame recordings; `docs/research/orchestrator/README.md`): one simulated run (`orchestrator-model.ts`, a discrete-event `RunSimulation` with a live concurrency limit, Retry now and optional write approvals; every time and sentence comes from the recording) feeds three views: the **block** (`OrchestratorBlock.tsx`: plan, four lanes with streamed lines, tokens and cost, transcripts, connectors measured from the layout in `wires.ts`, packets, summary, totals), the **timeline** (`AgentTimeline.tsx` + `timeline-model.ts`: live while the run goes, then replayable with a scrubber, hover card and pinned handoff path) and the **tool calls** (`ToolCall.tsx` + `tool-call-model.ts`: rows that open into Input and Output, grouped "Used N tools", Retry, Allow/Deny and the post the lead proposes after the run). Pure models are tested against the recordings (`npm test`, 34 tests); the UI keeps clocks out of React (one CSS variable `--now` per frame for the timeline, counters written to the DOM). QA: `node scripts/qa/orchestrator.mjs <base-url>` (`ONLY="<regex>"` runs some checks); run it against a production build (`next start -p 3002`): the dev server's long tasks move the run's timings by 100 to 300ms. CSS fixes in `orchestrator.css`. A new section needs an entry in `skeleton-kind.ts`.

- **Storage** (`/personalize?section=storage`, under Skilled/Repo; `src/components/sites/storage/`): document knowledge library rebuilt from public UIArc Onboarding illustration / Treemap / Agent run / nine button families and affectUI Dropzone previews. Read `docs/research/storage/README.md`. Actual local PDF/DOCX/XLSX/text extraction, SHA-256 dedupe, explicit review before saving, original/index vault, verified metadata save and quota retry. No source-site API/prompt or AI analysis. QA: `node scripts/qa/storage.mjs`, `node scripts/qa/storage-controls.mjs`; tests: `npm test`. CSS is authored `storage-*.css`; PDF worker copied by `scripts/storage-assets.mjs` before dev/build.

- Storage backend: `WorkspaceBackend.knowledge` (`src/lib/storage/knowledge-contract.ts`) and `/api/workspace/workspaces/{id}/storage/*` persist original/index files on the home server. Read `docs/research/storage/api-contract.md`; QA: `node scripts/qa/storage-backend.mjs`. Remote mode never requires an IndexedDB cache and uses authenticated downloads.
