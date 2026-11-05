# Orchestrator localization — coordination

The user has now included Orchestrator in English/Vietnamese localization. Codex owns copy-only changes in `orchestrator/{Orchestrator,OrchestratorBlock,AgentTimeline,ToolCall,parts}.tsx`, the DOM-free `OrchestratorI18n` provider, pure `orchestrator-copy.ts`, `i18n/vi-orchestrator.ts`, the catalog import and three previously partial Orchestrator strings in `vi-common.ts`. Responsive/vertical-lock work remains with Claude Code: Codex does not change `orchestrator.css`, shared viewport/overflow styles, grid geometry, fonts, simulation models or timings. Apply responsive edits around these text expressions without reverting their localization wrappers.

## Copy boundaries

- Plans, lane titles/activity/streamed sample findings, transcript, summary, totals, timeline status/legend/hover cards/accessibility labels and tool-call actions are presented in the chosen language.
- The English `SAMPLE`, simulation events, instructions, timings, counters and stored concurrency/approval preferences remain unchanged. A DOM-free provider supplies exact translations and explicit templates derived from structured scenario fields; it never guesses sentence patterns or rewrites DOM text.
- Model/brand names, search queries, URLs, paths, channel IDs and Input/JSON stay original. The sample's narrative/list output is translated for display; its Copy Input/Output buttons still copy the original payload. Copy summary follows the display language. Unknown service responses have no generated translation.
- The seven authored summary chunks retain their seven engine events. The existing fonts, grid, spacing and animation parameters are unchanged. Existing observers recalculate text widths and connector geometry when the language changes.

The shared inventory and general workspace localization QA now include Orchestrator. The older 19-page verification in the parent README describes the earlier scope; it is not a claim that those suites were rerun for this add-on.

## Verification

Production build and TypeScript passed. Changed application files passed ESLint. The 41 focused tests passed (34 original simulation/timeline/tool-call/wire tests, 5 shared i18n tests, 2 new tests covering source-copy identity, catalog completeness and every generated sample transcript/call/timeline sentence).

Browser results and screenshots are in `orchestrator-qa/`; command: `node scripts/qa/orchestrator-i18n.mjs http://localhost:3001`. The production server is used because concurrent edits on the dev server can refresh a run during QA. This checks this section's translation alongside the current responsive styles; it does not certify every other page being worked on by Claude Code.

Final production QA passed at **1440×1000, 768×1024, 390×844, 320×568 and 844×390**. Each viewport switches English → Vietnamese during a run and returns to English after it finishes, preserving plan/completed lanes, font family/size/weight/line height and lane dimensions. It exercises transcript text, raw input/output clipboard data, sample list translations, timeline replay/seek and horizontal containment (document overflow 0 and sideways scroll 0 at all five sizes). Approval/denial and the simulated Slack post passed at 1440px and 320px; both action buttons remain in bounds without overlapping. No page errors. `orchestrator-qa/results.json` records the passing run (`complete: true`).
