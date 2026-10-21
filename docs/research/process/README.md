# Process (the map) — `/personalize?section=process`

A map where **people** build the work an engine will do: one block in the middle, other blocks around it, each joined to the block it hands work to. Every block is a task with an *AI block* (who does it), a *role*, tools and rules. The page never calls a model; a simulated engine ships by default and a REST engine is the place to plug a real backend (local Ollama, Hermes Agent, Claude Code, Codex, Kimi, Gemini …).

Source of the card design: the public preview of affectUI's Agent Tree (`docs/research/agent-tree/README.md`). The Figma architecture board the request pointed to returned **403** (private); the map layout was derived from the request's words (one block in the middle, blocks branching out around it, not tree levels) — it is not a copy of that board.

## Where things are

`src/components/sites/process/`

| File | What |
|---|---|
| `ProcessPage.tsx`, `process.css` | Loader, studio shell: full-bleed canvas, floating name pill / run bar / dock, settings panel, dialogs, undo, autosave |
| `ProcessMap.tsx`, `process-map.css` | The canvas: pan, zoom, pinch, drag blocks, `+` handles, keyboard |
| `map-layout.ts` | Pure geometry: rings around the middle block, overlap separation, edges, `fitView`, `freeSpot` (unit tests) |
| `NodeInspector.tsx` | Block settings: name, role, task, AI block, instructions, tools, rules, simulation, organize |
| `roles.ts` | Roles: coordinator, planner, coder, fixer, reverter, revoker, instructor, helper, processor, none. Default instructions are this project's own text |
| `catalog.ts` | AI providers (Claude, Claude Code, OpenAI, Codex, Gemini, Kimi, Hermes Agent, Ollama, Qwen, DeepSeek, Mistral, a person, custom) and their model lists |
| `process-model.ts` | Types, limits, normalisation, edit helpers, templates |
| `run-model.ts`, `engine.ts` | Run state (a pure function of plan + decisions), simulated and REST engines |
| `run-view.ts` | Run snapshot → Agent Tree cards (map and tree share them) |
| `history.ts`, `use-autosave.ts`, `use-ticker.ts` | Undo/redo, saving with backoff, the clock |
| `BackendProcess.tsx`, `ProcessDialogs.tsx` | Resource wiring, dialogs |

Shared: `workspace-resources.ts` (`process`, `processRun`), `workspace-backend/types.ts` (`"process" | "process-run"`), `affectui-agent-tree/` (cards, status bar, connectors for the Tree view).

## What a person decides

- **Blocks**: add from the dock (“Add block” → pick a role), with the `+` on each side of the selected block, or in Tree view. Drag a block to put it somewhere (it keeps `pos`); *Tidy up* gives every block back to the layout.
- **Role** (`role`): the block's label and default instructions. The person can edit the instructions afterwards.
- **AI block** (`ai`): `provider`, `model`, `instructions`. Only Ollama requires a model; with a REST engine that lists `/engines`, the engine's models are offered.
- **Rules**: `approval` + `askText` (a person decides before the block runs), `limit` (stop at a cost), `mode` (its sub-blocks run in parallel or in sequence), `sim` (simulation only).
- **Costs**: dollars, credits, tokens or none (`unit`). In simulation they are demo numbers.

## Data (JSON)

A saved process (`ProcessLibrary { version: 1, activeId, processes[] }`, resource `process`):

```json
{ "id": "proc-launch", "name": "Launch the pricing page", "goal": "…", "unit": "usd",
  "root": { "id": "launch", "name": "Coordinator", "role": "coordinator", "task": "…",
    "ai": { "provider": "anthropic", "model": "claude-opus-5-5", "instructions": "…" },
    "tools": ["slack"], "approval": false, "askText": "", "mode": "parallel", "limit": 5,
    "pos": { "x": 0, "y": 0 },
    "children": [ { "id": "planner", "…": "…", "children": [] } ] } }
```

`pos` is optional (the center of the block in map units); `role` defaults to `custom`. Providers: `anthropic, claudecode, openai, codex, gemini, kimi, hermes, ollama, qwen, deepseek, mistral, human, custom`. Limits: 50 processes, 200 blocks, depth 8.

A run is not stored in the process. In simulation the page stores the plan + the person's decisions (resource `process-run`), so a reload continues the same run. With a REST engine the server owns the run.

## REST engine contract

Enable with `serverProcess: true` next to `baseUrl` in `window.__workspaceBackendConfig` (or `NEXT_PUBLIC_WORKSPACE_SERVER_PROCESS=1`). Routes under `{base}/workspaces/{id}/process`, same auth headers as the rest of the workspace API: see “Process (engine)” in `docs/backend-api.md`.

## QA

`node scripts/qa/process.mjs [base-url]` — 28 checks: full-bleed canvas, layout without overlap, roles and brand marks, pan/zoom, panel editing and persistence, AI block and local-model typing, tools/approval/limit, add by role and by `+`, drag + reload + tidy, keyboard delete/undo, Tree toggle, simulated run (approve, fail, retry, stop, reload mid-run, run from here, freeze), settings/export/import/engine dialog, templates, library, phone (no overflow, dock fits, tap sheet, touch pan, pinch, run), WebKit, mocked REST server (engines, versions, run actions, refused save, conflict), no page errors and no third-party requests. Unit tests: `npm test` (`process/*.test.mjs`, `affectui-agent-tree/tree-model.test.mjs`).

## Limits (honest)

- The simulated engine is a demo: durations, failures and costs come from each block's `sim` settings, not from a model.
- No block calls an external tool, an email/calendar or a model; “tools” are labels the engine can use.
- Not tested on a physical iPhone; Chromium (desktop + touch emulation) and WebKit are covered.
- Brand marks come from the MIT-licensed `@lobehub/icons-static-svg@1.95.1` (Kimi, Codex, Claude Code, Qwen, DeepSeek, Mistral, Ollama, Hermes Agent) and the affectUI public-preview-derived marks for Anthropic/OpenAI/Gemini and the tools. They are trademarks of their owners.
