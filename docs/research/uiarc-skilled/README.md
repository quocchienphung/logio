# Skilled workspace

Implemented 2026-10-22. Local route: `/skilled` (also available through the Skilled workspace group). Replaces the old full-page context-window preview; the context-window component remains in the Explore pages selector.

Layout cleanup: the introductory heading, breadcrumb/storage top bar and passive knowledge note were removed at the user's request. The composer and stream now start near the top of the workspace; Deliver skills and save status share the library toolbar. Decorative footer copy was removed, while actionable help and operation/error states remain. Verified with the 27 browser workflow checks, targeted ESLint and TypeScript; desktop and 390px/320px screenshots are `layout-clean-*.png`, with no horizontal overflow.

## ARC interaction refinement

The source menus, keyboard behavior and opening frames were re-inspected with `node scripts/forensics/uiarc-skilled-interactions.mjs`. Evidence is in `interactions/source-menus.json` and `source-*-menu.png`: 200px menu width, 5px inner padding, 16px outer / 11px row radii, 14px item text, approximately 34px simple rows and 120ms hover transition. Opening starts around scale .97 / translateY(-3px). Private source spring parameters are not claimed. The implementation uses the installed Base UI menu primitive for positioning, typeahead, radio state, Escape, selection dismissal and focus restoration; measured appearance is in `SkillMenu.tsx` / `skill-menu.css`. Menus render through a portal and adapt for touch and reduced motion.

Both native dropdowns were replaced. The source chip now offers GitHub, local file and authored instructions; choosing GitHub focuses the URL field. The composer grows with its text and collapses attributes after a successful import. Invalid URLs show an inline error before any network request, without adding fake failed-transfer readings. A repository URL discovers actual SKILL.md choices instead of repeatedly failing; selection is explicit. Exact skill links still import directly.

`SkillCard.tsx` keeps collapsed details mounted and inert, supports independently expanded cards, and uses two columns for instructions/files from a 600px panel width. File lists have bounded scrolling. Filter counts roll and selection glides. The workspace caps content width at 1200px, keeps readable 14px controls and balances the 336px monitor against the composer, while retaining the requested absence of top headings/notes.

The chart now preserves frozen axis bounds while reading, matches observed pointer/keyboard/touch release and queued-reading status, avoids replaying historical marker pops, and places anomaly labels without collisions. All anomaly dots and accessible readings remain. Collision placement and easing are independently authored; this does not claim private ARC implementation parity.

Verification for this refinement: 27 workflow checks, 21 additional interaction checks (`node scripts/qa/skilled-interactions.mjs`), 24 chart interaction checks (dense/pause/queued/touch/theme), 299 unit/storage tests, lint/typecheck/production build. Rendered evidence includes `interactions/local-target-menu.png`, `local-source-menu.png`, `local-expanded-card.png`, `local-discovered-skills.png`, `local-mobile-menu.png` and `stream-dense-*.png`.

## Update 2026-10-22: terrain moved to Repo, sources removed

The Activity terrain now lives on the Repo page (`docs/research/repo/README.md`), and the "Skill sources" cards and dialog were removed from Skilled (`catalog.ts` was deleted). The left column now has a Metric card row and a Timeline (`SkillOverview.tsx`, `SkillTimeline.tsx`). Importing from GitHub still works through the composer's source menu.

## Reference → implementation

| Public reference | Local owner | What is retained |
| --- | --- | --- |
| https://uiarc.dev/components/blocks/agent-tasks | `src/components/sites/skilled/Skilled.tsx`, `skilled.css` | Nested composer, source/target chips, segmented filter counts, expanding task rows, metadata, action area, archive/undo, responsive panel |
| https://uiarc.dev/components/realtime-stream | `RealtimeStream.tsx`, `realtime-stream.css` | Canvas/grid/fill/line, 52px value row, 200px plot, pause, frozen hover/touch inspection, keyboard point navigation, anomaly markers, hidden reading table |
| Existing Logio workspace | `SkilledWorkspace.tsx`, CRM shell | Sidebar, workspace switcher, account/theme controls, shared storage/backend and loading skeleton |

The clone engine is the repository's canonical `.agents/skills/clone-website/SKILL.md` workflow. Run `node scripts/forensics/uiarc-skilled-inspect.mjs` to repeat public DOM/style/state/frame inspection. This reads rendered public pages, never UIArc API/registry/CLI or Pro source. No iframe, screenshots or remote production JS render the implementation.

Source screenshots: `tasks-desktop.png`, `tasks-expanded.png`, `tasks-repository-menu.png`, `tasks-mobile.png`, `stream-desktop.png`, `stream-hover.png`, `stream-paused.png`, `stream-mobile.png`. DOM/computed measurements and public documentation are saved alongside them. Local screenshots: `local-desktop.png`, `local-desktop-populated.png`, `local-skill-expanded.png`, `local-mobile.png`, `local-connected-receipt.png`.

## Motion evidence and limits

`tasks-expansion-frames.json` samples the actual expansion on requestAnimationFrame, recording `performance.now()` offsets, height and opacity. The observed content settled at 241px in the captured running-task state. `tasks-motion.json` and `stream-motion.json` contain frame intervals over about 1.8 seconds. This machine's browser reported about 6.1ms median / 6.3ms p95 rAF intervals; those are scheduling observations, **not** CPU render cost or a cross-device FPS guarantee. A timestamp can be slightly negative for the first rAF callback because its frame timestamp precedes the evaluation's start.

The independently authored expansion uses the workspace's smooth spring (stiffness 350, damping 34); filters use 450/38. Public source documents shimmer line changes at about 100ms fade-out / 160ms fade-in. No agent-run simulation exists here, so that shimmer is not falsely attached to saved skills. The stream eases its axis/head, stops hidden/offscreen, sleeps after settling, and respects reduced motion. Source easing implementation behind Pro was not inspected. This is a workspace adaptation, not a claim of identical private spring physics or an exact pixel clone of the documentation page. Source and local have intentionally different sidebar/page composition, content and panel widths.

## Real skill lifecycle

- Start with no fabricated skills, operation samples or agent jobs. Catalog cards are source suggestions, not installed rows.
- Paste a public GitHub SKILL.md file/folder URL, read a local SKILL.md, or author instructions. Source catalog paths from Anthropic, Vercel and OpenAI were fetched directly and returned 200 on the implementation date. No ranking or claim that these are all/best skills is made.
- The importer downloads the public GitHub source archive without an API. It inspects the archive directory before inflation, captures only the selected skill folder and source license, pins the actual commit from the archive identity, and preserves exact UTF-8/binary contents with per-file byte lengths and SHA-256. Bounds: 25-second fetch, 20MiB archive, 256KiB SKILL.md, up to 256 supporting files, 1MiB per supporting file and 4MiB folder; symbolic links, unsafe paths, collisions and unsupported archives are rejected. No extracted source is executed or written to the server filesystem. Source archive decompression uses the server-only `fflate` package.
- GitHub imports capture the **skill folder**, including scripts, rules, references and binary assets within it; a repository root license is included when present. External packages, credentials, services, files outside the folder and runtime dependencies are not installed. Local SKILL.md uploads and authored instructions remain instruction-only. Inspect the captured files before use. Additional text typed alongside a GitHub URL is preserved as a checksummed WORKSPACE-INSTRUCTIONS.md supporting file; LOGIO.md tells the agent to read it.
- Library and operation history persist per workspace via existing `WorkspaceBackend` resources (`skill-library`, `skill-events`). Default is browser storage; with the configured REST backend they are database-facing resources. No database server is included or silently invented.
- Archive/restore, search/filter, file import, bundle selection and export are functional. Duplicate active names are blocked. Bundle export rehashes content and rejects corrupted data and duplicate destination folders.
- `node scripts/skilled/install-bundle.mjs downloaded-bundle.json --dir ./agent-skills` validates all manifest hashes/destinations before writing, preserves each SKILL.md and all captured supporting files, adds LOGIO.md guardrails, and writes a file receipt last. It refuses existing paths by default. It does not execute source content. The receiving local AI must explicitly load SKILL.md and LOGIO.md. Import the receipt in Deliver skills to record verified file delivery.
- Remote transfer uses the configured workspace command transport, with no UIArc calls. A receipt must match workspace, agent, every selected skill ID/hash, supporting-file path/hash, and total file bytes. Missing/mismatched receipts are errors. A valid receipt confirms transport only; it does not claim agent loading, execution or reduced hallucination.

## Measurement semantics

Only actual operations create measurements. Import is fetch/read/parse/hash wall time; save is the resource's saving→idle/error wall time (including retries when applicable); export is flush/verification/serialization/download dispatch wall time, **not disk download completion**; transfer is bundle preparation plus command/receipt validation wall time, **not model execution time**. Offline receipt import measures verification in this browser; original file-delivery duration is unavailable. Labels/units are milliseconds, bytes are explicitly displayed; p95 uses successful measured operations only. Each filter selects the operation class. History is bounded to 200 records. Storage errors remain visible with Retry. `skill-events` supports backend polling/push through the existing live resource contract.

Guardrails instruct the consumer to cite evidence, verify claims and state uncertainty. They do not guarantee factual accuracy. There is no fabricated hallucination score or autonomous model invocation.

## Verification

- `npm run check`: lint, TypeScript and production build.
- `npm test`: model/storage/import tests plus workspace regressions.
- `node scripts/qa/skilled.mjs [base-url]`: browser workflow, real public GitHub import, local persistence, exact bundle/installer/receipt, keyboard chart, mobile overflow/sidebar, controlled REST persistence and rejected/accepted receipt contracts. The controlled transport test is not a live deployed AI agent.
- `node scripts/qa/skeleton.mjs`: workspace skeleton regression.

QA output is stored in `qa-results.json`, `test.log`, `check.log`, `skeleton-qa.log`. No physical-phone profiling or real deployed agent/model behavior was verified.

Completed: 27/27 browser workflow checks; 299/299 unit/storage tests; 8/8 skeleton browser regressions; lint/typecheck/production build successful. `local-performance.json` records a brief local rAF/expansion sample (6.1ms median / 6.3ms p95 scheduler interval, zero observed long tasks during this short capture), not an FPS guarantee.
