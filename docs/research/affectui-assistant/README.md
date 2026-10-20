# Assistant Home → Agent Chat

Observed 2026-10-20. Source: [affectUI Assistant Home](https://www.affectui.com/screens/assistant-home/full). Local route: `/personalize?section=new-chat`. **Agent Chat** now opens this page, with **New chat, Run, Settings** in the shared workspace sidebar. The Logio branding and single Explore pages header remain as requested.

## Observed layout and behavior

The source main panel has an invitation action in its upper right, a vertically centered greeting, a 672 px composer, a gray folder/apps tray, and seven suggestion chips in two rows. At 600 px container width the greeting changes from 28/34 px to 23/29 px, the composer uses the available width minus 24 px, and chips wrap into four rows. Inter and the shell tokens are reused from the existing app. SVG paths, app marks and the layered glass-folder illustration were captured from the public DOM. No screenshot, iframe or production JavaScript renders the local UI.

`source-desktop.png`, `source-mobile.png`, `metrics.json`, `states.json`, state PNGs/HTML and `source-styles.css` hold the inspection evidence. The source Plugins menu has Web search, Canvas and Image generation; Model has Auto, Claude, ChatGPT and Gemini; Work in a folder lists the workspace projects. Sending or choosing a suggestion fades the greeting/chips before showing the conversation. The local transition uses the observed 180 ms duration and respects reduced motion.

The shared sidebar remains the existing 220 px Logio sidebar rather than duplicating the source's navigation to its separate Folders/Integrations demo screens. Folder selection/creation is implemented in the composer; connected apps are managed in an API-backed dialog. Invite people opens the existing Settings → Members flow. Run and Settings remain independently addressable.

## Implementation and ownership

| File | Responsibility |
| --- | --- |
| `src/components/sites/affectui-assistant/AssistantHome.tsx` | Greeting, composer, attachments, dictation, messages, history and apps |
| `AssistantMenu.tsx` | Native top-layer menus, viewport placement, keyboard selection and dismissal |
| `useAssistantChat.ts` | Draft/preferences, remote history, optimistic user messages, retry/cancel and stale-response protection |
| `assistant-api.ts`, `assistant-types.ts` | Authenticated HTTP transport and strict response types |
| `assistant-reference.css` | Generated, scoped public-preview CSS; do not edit directly |
| `assistant-overrides.css` | Integration, accessible focus, chat/error states and dialogs |
| `icons.json`, `folder-mark.ts` | Static observed vector assets |
| `../guide-navigation/navigation-model.ts` | Agent Chat entry and section membership |
| `../affectui-crm/Crm.tsx`, `workspace-state.ts` | Lazy page mount, New chat navigation/reset, Invite navigation and route label |

The backend work being developed by Claude Code supplies `WorkspaceBackendProvider`, `useResource`, and `resources.folders`. Chat reuses its runtime API URL, per-request auth headers, credentials and transport configuration. Chat-specific methods live separately, so existing backend resource names, contracts and adapters are preserved.

## API and data behavior

See [the chat API contract](api-contract.md) for routes and JSON examples/shapes. The adapter sends real HTTP requests for history, messages, uploads, cancellation, deletion, integration status and OAuth. Model, plugin, selected folder and uploaded attachment references are included in sends. Retries reuse the client message ID and Idempotency-Key. The server owns the response and conversation history. A delayed restored-thread response cannot replace a newly opened chat; stopped requests cannot display late answers. Successful send/retry clears attachments.

Draft, selected model/plugins/folder and active thread ID are device preferences stored under `affectui:{workspaceId}:assistant-session`. Conversation content is retrieved from the backend; no canned assistant text is generated. The existing workspace folder resource handles folder persistence through the shared backend. The current folder model is an array of unique names; the selected name is the `folderId` reference in the chat contract. A backend using separate folder IDs should map that reference in its adapter.

Up to five actual files (10 MB each) can be uploaded per message. Failed uploads remain removable/retryable and block sending. Dictation uses the browser's speech-recognition API when supported and reports denied permission or missing support. Message content is rendered as plain React text, including strings that resemble HTML. Server-provided assistant messages do not execute markup.

**Live limitation:** no chat backend URL, authenticated session or model service was supplied/configured in this checkout. The HTTP adapter and workflows are verified against explicit test responses; live model generation/OAuth remain unverified until the user's backend implements/configures the documented contract. Without a backend, Send keeps the draft and explains the missing connection. It never shows a fabricated reply or connected app. JSON responses are supported; SSE streaming is not implemented.

## Verification

- `node scripts/forensics/affectui-assistant-compare.mjs [base-url]`: same-viewport source/local rendered comparison at 390, 768, 1440 and 1920 px. Crops cover the Assistant Home content, not the intentionally different shared sidebar. Metrics include layout geometry, font properties and overflow. The settled welcome-state captures have 0 differing pixels at the tool's 0.15 threshold in all four sizes; this applies only to those captured states.
- `node scripts/qa/affectui-assistant.mjs [base-url]`: offline, composer controls, mobile and authenticated mocked HTTP workflows. Results in `qa/results.json` distinguish mocks from live services.
- `node --experimental-strip-types --test src/components/sites/affectui-assistant/assistant-api.test.mjs`: ten transport/validation groups.
- `node scripts/qa/guide-navigation.mjs [base-url]`: existing group navigation regression, updated for New chat.
- `npm run check`: lint, TypeScript and production build.

Preview with `npm run dev`, then open `/personalize?section=new-chat`, or choose Agent Chat in Guide me.
