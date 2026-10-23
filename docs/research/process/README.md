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
| `roles.ts` | Roles: coordinator, planner, creator, coder, QA, reviewer, fixer, reverter, revoker, instructor, helper, processor, none. Each has default instructions and a guide (when to use it, what to give it, what it passes on, what to watch for, sub-blocks and next roles). The wording is this project's own text |
| `catalog.ts`, `agent-roster.ts` | AI engines: the first eleven (Claude, Claude Code, ChatGPT, Codex, Gemini, Kimi, Hermes Agent, Ollama, Qwen, DeepSeek, Mistral), 80 more in the roster (coding agents, agent frameworks, hosted and open models, local runtimes, routers and clouds), a person and a custom engine; grouped by kind in the picker |
| `process-model.ts` | Types, limits, normalisation, edit helpers, connections (`links`) and their rules, templates |
| `run-model.ts`, `engine.ts` | Run state (a pure function of plan + connections + decisions, with loops and waits), simulated and REST engines |
| `run-view.ts`, `trace-build.ts` | Run snapshot → Agent Tree cards (map and tree share them); run snapshot → spans for the Tracing page |
| `LinkEditor.tsx` | The card of a connection: what it means, rounds of a loop, a label, remove |
| `use-process-sources.ts`, `local-sources.ts` | The plans and runs as the Process and Tracing pages read them |
| `history.ts`, `use-autosave.ts`, `use-ticker.ts` | Undo/redo, saving with backoff, the clock |
| `BackendProcess.tsx`, `ProcessDialogs.tsx` | Resource wiring, dialogs |

Shared: `workspace-resources.ts` (`process`, `processRun`), `workspace-backend/types.ts` (`"process" | "process-run"`), `affectui-agent-tree/` (cards, status bar, connectors for the Tree view).

## What a person decides

- **Blocks**: add from the dock (“Add block” → pick a role), with the `+` on each side of the selected block, with the role guide's “Add a sub-block” / “Usually next” chips, or in Tree view. Drag a block to put it somewhere (it keeps `pos`); *Tidy up* gives every block back to the layout.
- **Connections** (`links`): the person decides who is joined to whom. Drag from a `+` handle of the selected block onto **any other block** (or use “Connect this block to” in the settings panel, which works from the keyboard and on a phone). Dropped on empty canvas, the drag makes a new block there instead. See “Connections and loops” below.
- **Role** (`role`): the block's label and default instructions; the settings panel shows the role's guide. The person can edit the instructions afterwards.
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

`pos` is optional (the center of the block in map units); `role` defaults to `custom`. Roles: `coordinator, planner, creator, coder, qa, reviewer, fixer, reverter, revoker, instructor, helper, processor, custom`. Providers: the first eleven (`anthropic, claudecode, openai, codex, gemini, kimi, hermes, ollama, qwen, deepseek, mistral`), `human`, `custom` and the 80 ids of `agent-roster.ts` (for example `cursor, windsurf, cline, devin, openhands, goose, kiro, trae, grok, perplexity, lmstudio, groq, openrouter, crewai, langgraph, n8n`). Limits: 50 processes, 200 blocks, depth 8, 100 connections.

Connections sit next to `root`: `"links": [{ "id": "l1", "from": "fixer", "to": "qa", "rounds": 3, "label": "until it passes" }]` (absent when there are none).

A run is not stored in the process. In simulation the page stores the plan + the person's decisions (resource `process-run`), so a reload continues the same run. With a REST engine the server owns the run.

## Choosing several blocks, and notifications

- **Ctrl / Cmd (or Shift) + click** adds a block to a group (the block that was selected joins it) or takes it out; a plain click clears the group. **Ctrl / Cmd + A** chooses every block, **Escape** lets the group go. A group is drawn with a dashed outline and a bar “N blocks selected · Delete · Clear”. **Delete** asks once, names the blocks, counts what hangs under them, and removes everything as **one undo step**; the first block is never removed. Dragging one block of a group moves the whole group by the same amount (one undo step). While a run is active the structure is frozen and Delete says so.
- **Notifications** (`affectui-notification-stack/`, analysis in `docs/research/notification-stack/README.md`): on the map each block that has something to say carries a **blinking star** beside it (`NoticeSparks.tsx`); clicking it opens that block's notices in a card next to the block (a read quiet notice is gone, a failure stays until the block runs again; a star for a block out of view is pinned to the map's edge). The Tree view keeps a stack under the name pill. They announce a block that finished (engine · cost · time, **Show on the map**), a block that failed (its reason and **Retry**; a failure is an alert, goes before quiet notices and never expires), and the end of the run (blocks · cost · time, **Open the trace**). Quiet notices go away by themselves after nine seconds (paused while the stack is hovered or focused); a failure notice retires itself when the block runs again.

## Connections and loops

The tree stays the structure (each block hangs under the block that hands it work); a connection is everything else, and it is decided by where it points:

- **Back to a block that came before** (an ancestor, the first block included) is a **loop**. When the source block and everything under it have finished, the blocks from the target down to the source run again, up to `rounds` passes in all (2 to 10, default 2; the first pass counts). A block that failed or was stopped does not go round again. A block loops back to one place only. This is the evaluator-optimizer pattern (QA ⇄ Fixer), so a loop always has a limit.
- **To any other block** means "wait for me": the target starts only after the source (and everything under it) has finished, as well as after the block it hangs under. A connection is refused, with its reason shown, when it would make blocks wait for each other (the check models every block's start and end, including sub-blocks in a sequence).
- Every block that a loop runs again asks again if it has an approval rule: each pass is decided separately (this is also why the closed-loop template's deploy asks every round). A simulated failure (`sim.failOnce`) happens in the first pass only.
- A saved process is checked on load: connections to missing blocks, to itself, duplicates and cycles are dropped, a loop gets rounds, a waiting link loses them. Deleting or moving a block prunes the connections the tree no longer allows.

In a run, a loop's later passes are copies of the blocks with ids ending in `@<link id>-<round>`; the snapshot folds them away: every block has one entry (its newest pass that has started) with `round`, `of` (passes planned), `rounds` (the earlier passes) and `runId` (the name a decision about this pass must carry). The cards show "Round 2/3" and list the earlier rounds; the map draws loops dashed in the accent color and waiting links dotted, with a pill (`3×`, a label, `waits`) that opens the connection's card.

**Template "Closed loop: ship to production"**: Coordinator, Planner, Creator, Coder, QA (with the Fixer under it looping back to QA, 3 rounds, "until it passes"), Reviewer and Deployer; Creator waits for the Planner, the Coder for the Creator, the Reviewer for the Coder, the Deployer for the Reviewer; the Deployer asks a person before it runs and loops back to the Coordinator ("next release", 2 rounds). Nothing is deployed: it is a plan for an engine, and the simulated engine only plays it.

## Roles

The role guide in the settings panel is research-based but written for this page: planner / creator / coder / QA / reviewer / fixer follows the roles multi-agent software systems commonly use (for example AgentMesh's planner, coder, debugger and reviewer, and the product, engineering and test roles of MetaGPT and ChatDev), the orchestrator-workers pattern (coordinator → blocks) and the evaluator-optimizer loop (QA/Reviewer judge, Fixer improves, a round limit stops it). Sources are secondary summaries; the exact names differ between systems.

## AI engines

`agent-roster.ts` lists 80 engines beyond the first eleven, each with a real logo from `@lobehub/icons-static-svg@1.95.1` (MIT; generated by `scripts/forensics/agent-tree-ai-marks.mjs`, 88 marks in all, markup checked: drawing elements only, no scripts, links or styles). The model of these is free text; a connected engine decides what the id means. The logos are trademarks of their owners. Kimi's ink is drawn in the text color so it reads on a light card, and a few dark-on-dark marks are lifted in dark mode.

## Tracing

The **Tracing** page (`/personalize?section=tracing`, third section of Project Management) shows the run of a process on a Trace Waterfall rebuilt from the public preview of affectUI's Trace Waterfall (`docs/research/trace-waterfall/README.md`). It only reads: the same plans (`process`) and the same run (`process-run` for the simulated engine, `GET …/process/runs?processId=…&latest=1` and polling for a connected one), and it keeps reading while the run is active, so a run started on the Process page, even in another tab, appears there live. The Process page writes pending changes when it is left, so a run started a moment ago is there when Tracing opens. Spans are built from the run by `trace-build.ts`.

## REST engine contract

Enable with `serverProcess: true` next to `baseUrl` in `window.__workspaceBackendConfig` (or `NEXT_PUBLIC_WORKSPACE_SERVER_PROCESS=1`). Routes under `{base}/workspaces/{id}/process`, same auth headers as the rest of the workspace API: see “Process (engine)” in `docs/backend-api.md`.

## QA

### Permission request interface

The approval rule now has an interactive preview and a live, source-inspired Permission Request card shared by Map and Tree. It reviews the actual block details, handles a queue and folds into a decision receipt. The existing engine still grants approval for one run only. Read [reference observations, integration details and verification](permissions/README.md). Dedicated QA: `node --experimental-strip-types scripts/qa/process-permissions.mjs`.

`node scripts/qa/process.mjs [base-url]` — 48 checks (the first 28 below, then arrows meeting their blocks, roles and their guides, 88 engines with logos, drawing a connection and its card, refused connections and the inspector, deleting a block, the closed-loop template running two rounds, choosing and deleting groups of blocks, and the run notifications): full-bleed canvas, layout without overlap, roles and brand marks, pan/zoom, panel editing and persistence, AI block and local-model typing, tools/approval/limit, add by role and by `+`, drag + reload + tidy, keyboard delete/undo, Tree toggle, simulated run (approve, fail, retry, stop, reload mid-run, run from here, freeze), settings/export/import/engine dialog, templates, library, phone (no overflow, dock fits, tap sheet, touch pan, pinch, run), WebKit, mocked REST server (engines, versions, run actions, refused save, conflict), no page errors and no third-party requests. Unit tests: `npm test` (`process/*.test.mjs`, `affectui-agent-tree/tree-model.test.mjs`).

## Limits (honest)

- The simulated engine is a demo: durations, failures and costs come from each block's `sim` settings, not from a model.
- No block calls an external tool, an email/calendar or a model; “tools” are labels the engine can use.
- Not tested on a physical iPhone; Chromium (desktop + touch emulation) and WebKit are covered.
- Brand marks come from the MIT-licensed `@lobehub/icons-static-svg@1.95.1` (88 marks) and the affectUI public-preview-derived marks for Anthropic/OpenAI/Gemini and the tools. They are trademarks of their owners.
- A loop in the simulated engine repeats blocks for the number of rounds the person set; it does not decide "until it passes" by itself (there is no model to judge). A connected engine decides that and reports the rounds it ran.
- Calls inside a block (model calls, tool calls) are derived for the simulated engine from the block's model, tool labels and duration, and are demo values; a connected engine may report real ones (`calls`).
