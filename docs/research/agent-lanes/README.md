# Agent Lanes → CRM preview

Source: [public Clean preview](https://www.affectui.com/components/agent-lanes), inspected 2026-10-20.
Destination: `/personalize?browse=1&group=crm`. Only the CRM selector's photograph is replaced. Its row still opens `/personalize?section=home` and the actual CRM workspace is preserved.

## 1. Evidence and boundaries

Used the repo's `.agents/skills/clone-website/` workflow: observe → measure/capture → rebuild → compare/test. Inspected the visible preview, public documentation, rendered DOM, public CSS values and visible inline SVG artwork. Never opened the gated Code tab, copied a Pro prompt, fetched a registry/install API, ran affectUI's CLI/MCP, or imported its JavaScript bundle. Local `node scripts/...` commands are this repository's own inspection/QA tools.

`source-preview.html`, `source-docs.txt`, `observed-rules.css`, `measurements.json`, `tooltips.json`, `sequence.json`, and `source-*.png` are research evidence only. The implementation imports only the static brand SVGs from `icons.json`; React, layout, timing, geometry and interaction code are newly authored. Inter 400/500 font files already in the repo were checked against the currently served public font assets and are byte-identical.

## 2. Component breakdown

| Part | Observed rule | Local implementation |
| --- | --- | --- |
| Header | Spark + Agents; running/waiting counts; Last 30m. Padding 14×16, gap 10, 13px/20px Inter, title 500. | `.agl__bar`; a polite live region announces waiting-count changes. |
| Agent column | Researcher/Writer = Claude, Reviewer = ChatGPT, Ops = Gemini. 24px white logo tiles, 14px marks. Name/model and Idle/Needs you badges at larger widths. | Local SVG artwork. Model strings remain reference/demo labels, not a claim about available provider APIs. |
| Narrow layout | Container ≤520px: 48px avatar column, hidden names/models and running counter. | Same container rule; the provider marks remain visible on every screen. |
| Timeline | 48px rows; task inset 10px top/bottom → 28px blocks. 5-minute tick grid, fixed now marker; left edge fades over 40px. | Timestamp geometry in `lanes-model.ts`, DOM buttons and SVG curves, no canvas/iframe/screenshot renderer. |
| States | Done: gray; Running: blue + shimmer/right edge; Failed: red; Waiting: amber + pulsing triangle/Needs you badge. | Scoped tokens, SVG mark, 2.2s shimmer and 1.6s pulse. |
| Handoffs | Source end → target start; cubic curve between rows, dashed gray/flowing blue when target is running. | Task IDs in `handoffTo`; path and blocks share the same clock/window. |
| Details | Click/Enter opens dark tooltip, agent/state/duration header and the observed summary. | Outside click/Escape closes; keyboard focus returns to the block. Optional `onOpen` renders Open. |
| Approval | Click waiting block → white dialog, ask text, Reject/Approve; Approve receives focus. Approve resumes, Reject freezes a failed block. | Display state only by default. Optional callbacks let a caller own decisions. Popover clamps within the preview and follows the moving block. |
| Motion | Demo advances 2 minutes in ~4 real seconds. At 8s Writer finishes at 19m and hands off to Review pricing copy. | Local 30× demo clock; timestamp-based positions, interpolated movement, 900ms dashed flow. |

Initial data uses the actual observed tasks/summaries: Competitor pricing, Customer interviews, Draft pricing page, PR #482 billing, Sync CRM, Rotate API keys. Tools retain the Google/Notion/Slack/Figma/GitHub/Linear/HubSpot/Stripe SVGs shown by the preview.

## 3. Fit inside Guide me — explicit adaptations

- Preserve the existing 380:401 frame (384×405 CSS px on desktop). Center the source's compact 279px-tall card within it. Guide me supplies the exterior shadow/radius, so the inner card's duplicate shadow/radius is removed.
- For the user's request to show the providers clearly, enlarge **only** the provider tiles/marks to **28/18px**, keeping the source's 48px column and 12px task-tool logos. `title` and accessible image labels identify the provider. No new brand/logo was invented.
- Keep task buttons independent from the selector gesture handlers. Tapping a block opens its details/decision. First touch on a different section selects it; tapping the selected CRM row opens the full workspace. Blank preview space still accepts horizontal group swipes.
- Guide links now use a roving tab stop (arrows switch groups); Tab from CRM enters its tasks rather than selecting Project Management on the way past.
- Inactive/hidden frames pause the demo clock and animations. Reduced motion freezes demo time and disables continuous effects while decisions remain interactive. The source's later completion/reset sequence was not fully observed; no additional completions or automatic reset are invented. Decisions persist while switching groups, not after a page reload.
- No key rotation, AI call, CRM sync or external service is performed. The approval wording is retained from the reference; it is a local demo. No backend for lane events has been connected.

## 4. Files and reuse API

| File | Responsibility |
| --- | --- |
| `src/components/sites/affectui-agent-lanes/AgentLanes.tsx` | Generic component: `agents`, `tasks`, `span`, `now`, `onApprove`, `onReject`, `onOpen`, `title`, `className`, `active`. |
| `lanes-model.ts`, `lanes-model.test.mjs` | Window clipping, elapsed labels, handoff geometry, agent state and local approval rules. |
| `CrmAgentLanes.tsx` | Reference data/brand artwork and local demo timing; no network or storage dependencies. |
| `agent-lanes.css`, `icons.json` | Authored scoped styling and captured static SVG artwork; SVG gradient IDs get an instance prefix. |
| `guide-navigation/navigation-model.ts`, `GuideNavigation.tsx` | CRM becomes `live: "agent-lanes"`; row's workspace href remains unchanged. |

## 5. Comparison and QA

`node scripts/forensics/agent-lanes-compare.mjs [base-url]` compares **same-width compact cards** at 384/349/281px. Source clock is frozen, source demo zoom normalized to 1, and both samples are aligned to the pixel grid. Result: **1.233%, 2.815%, 2.018%** differing pixels (pixelmatch threshold .15). These are region metrics, not whole-page similarity claims. The enlarged provider marks and exterior card treatment are intentional differences; antialiasing/subpixel differences also remain. Evidence: `comparison/side-*.png`, `diff-*.png`, `metrics.json`.

Commands:

```powershell
node scripts/forensics/agent-lanes-inspect.mjs
node --experimental-strip-types --test src/components/sites/affectui-agent-lanes/lanes-model.test.mjs
node scripts/qa/agent-lanes.mjs [base-url]
node scripts/qa/guide-navigation.mjs [base-url]
node scripts/qa/guide-touch.mjs [base-url]
npm run check
```

The component QA covers 10 groups: initial states/assets, all observed tooltip summaries, keyboard/focus/approval, reject/approve persistence during time updates, reduced motion, group switching, 320/390/768/844/1920 widths, the observed timed handoff, native taps in Chromium and WebKit, and zero external requests. Five model tests cover geometry/invalid ranges/approvals. Existing selector QA covers 11 navigation and 15 touch groups. Artifacts: `qa/`.

Validation completed: all 10 component groups pass against the dev server and a freshly started production server; all 5 model tests, 11 selector navigation groups and 15 selector touch groups pass. `npm run check` and the final production build pass (seven pre-existing lint warnings elsewhere). Source/local comparisons were visually inspected as well as measured.

Physical iPhone Safari has not been tested. Playwright WebKit verifies native taps; the existing selector suite uses DOM pointer trajectories for WebKit drags and native CDP touch input for Chromium drags. Dark tokens follow the observed public stylesheet; a separate dark visual comparison was not performed because this selector uses a light page.
