# Assistant API integration

The Assistant Home UI uses the real HTTP adapter in `src/components/sites/affectui-assistant/assistant-api.ts`. This is a new proposed backend contract, not an endpoint observed on affectUI. No backend URL, authentication session, LLM service or provider credentials were configured in this checkout during implementation. End-to-end live assistant responses cannot be verified until a backend implements this contract. The UI must report an unavailable backend rather than inventing responses or marking integrations connected.

## Configuration

The adapter reuses `NEXT_PUBLIC_WORKSPACE_API_URL` or `window.__workspaceBackendConfig.baseUrl`, and the same runtime `headers()`, `credentials`, `fetch`, and `timeoutMs` settings used by Claude's workspace layer. `headers()` runs for every request so refreshed session tokens are picked up. Default credentials are `same-origin`; cookie sessions on a separate API origin require `include` and the backend's credentialed CORS policy. Chat requests use `cache: no-store` and a 60-second default timeout covering auth, fetch and body reading. A supplied `timeoutMs` overrides that default.

`createConfiguredAssistantApi()` returns `null` when no base URL is configured. An injected `AssistantChatApi` can support another host. `createHttpAssistantApi(config)` supports a typed `resolveAssistantUrl(target)` override. The existing shared `resolveUrl` does not recognize assistant targets and is deliberately not passed fake resource names. A host using custom assistant routes may place `resolveAssistantUrl` alongside the workspace runtime config; its TypeScript type is `AssistantHttpConfig`.

Provider API secrets belong in the backend. The browser uses its signed-in session and never requires an LLM secret. The backend must authorize the current person against the workspace for every route, enforce attachment access and size limits, and validate model/plugin availability. UI provider choices are `auto`, `claude`, `chatgpt`, `gemini`; these are routing hints rather than claims that a specific model is available.

## Routes

All paths are relative to the configured API base. IDs are URL encoded individually. Except documented empty responses, successful responses have the JSON envelope `{ "data": ... }`. Errors should use `{ "error": { "message": "Readable message" } }` with an appropriate HTTP status.

| Method | Path | Request | Response data |
| --- | --- | --- | --- |
| GET | `/workspaces/{workspaceId}/assistant/threads` | — | `AssistantThreadSummary[]` |
| GET | `/workspaces/{workspaceId}/assistant/threads/{threadId}` | — | `AssistantThread` |
| POST | `/workspaces/{workspaceId}/assistant/messages` | `AssistantSendInput` JSON | `AssistantSendResult` |
| POST | `/workspaces/{workspaceId}/assistant/threads/{threadId}/requests/{requestId}/cancel` | `{}` JSON | any `data`, or HTTP 204 |
| DELETE | `/workspaces/{workspaceId}/assistant/threads/{threadId}` | — | any `data`, or HTTP 204 |
| POST | `/workspaces/{workspaceId}/assistant/attachments` | multipart field `file` | `AssistantAttachment` |
| GET | `/workspaces/{workspaceId}/assistant/integrations` | — | `AssistantIntegration[]` |
| POST | `/workspaces/{workspaceId}/assistant/integrations/{integrationId}/connect` | `{}` JSON | `{ authorizationUrl: string }` |

`AssistantSendInput` contains `threadId?`, `clientMessageId`, `text`, `model`, `plugins: string[]`, `thinking?: true`, `effort?: "low" | "medium" | "high"`, `folderId?`, and `attachments: AssistantAttachment[]`. `thinking` and `effort` come from the model picker's Extended thinking switch and Effort choice: they are present only when thinking is on (effort then always accompanies it), and absent otherwise. `model` is the picker's model id (`auto`, `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `gpt-6-astra`, `gpt-6-1-sol`, `gpt-6-luna`, `gemini`; the list lives in `assistant-models.ts`), so the backend must accept the ids it offers or the list must be edited to match. Earlier versions sent `claude`, `chatgpt` or `gemini`; saved browser preferences with those values are mapped to `claude-sonnet-5-5`, `gpt-6-1-sol` and `gemini`. The Web search switch in the picker is the same setting as the `web-search` entry of `plugins`. The UI can generate a thread ID before the first send and pass it to the backend. The backend must honor that ID or map it for cancellation and return the stored conversation in `AssistantSendResult.thread`, with optional `requestId`. Replies are a complete JSON response in this version; SSE is not implemented.

Each send carries `Idempotency-Key: {clientMessageId}`. Retry must reuse both the same `clientMessageId` and logical payload, so the backend must scope/deduplicate that key by signed-in account and workspace. The adapter performs no automatic send retries. It never fabricates assistant content. Cancellation aborts the browser request when its `AbortSignal` fires; stopping remote generation also requires the explicit cancel endpoint. Before a send response supplies `requestId`, cancellation identifies the request by `clientMessageId` and the preallocated thread ID. The backend must support that lookup and cancellation arriving before generation starts.

## Data and validation

```ts
AssistantAttachment = { id: string; name: string; type: string; size: number; url?: string }
AssistantMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string; attachments?: AssistantAttachment[] }
AssistantThreadSummary = { id: string; title: string; updatedAt: string; folderId?: string }
AssistantThread = AssistantThreadSummary & { messages: AssistantMessage[] }
AssistantSendResult = { thread: AssistantThread; requestId?: string }
AssistantIntegration = { id: string; name: string; connected: boolean }
```

Timestamp strings must parse as valid dates; ISO 8601 UTC is recommended. Attachment sizes are nonnegative safe integers. IDs must be nonempty strings without CR/LF/null. Unsupported roles, malformed arrays, missing envelopes and invalid fields produce a typed `BackendError` with code `invalid`. The adapter reconstructs accepted objects to drop unrelated fields. Message content stays plain text for normal React text rendering; it must not be passed to `dangerouslySetInnerHTML`. Attachment URLs allow HTTP(S) or same-origin root-relative paths, and reject executable schemes. OAuth authorization URLs must be absolute HTTP(S) without embedded credentials. Only an explicit Connect click should open one; connection state comes from the backend's integrations list, including after returning from OAuth.

Uploads return backend-owned metadata; identifiers can reference stored attachments even if a URL is omitted. Uploads send the actual File with a browser-generated multipart boundary. The backend must ensure attached IDs belong to the same workspace and account.

HTTP 401/403/404/409/412/429/5xx map to actionable error codes. A missing route is an error, never an empty/demo success. Timeout and cancellation remain distinct; the timeout includes reading the full response body. New history is loaded from the server through list/get. Local drafts may exist independently, but must not be presented as a successful remote reply.

## Verification

`node --experimental-strip-types --test src/components/sites/affectui-assistant/assistant-api.test.mjs`

Tests inject mocked fetch and cover auth refresh, credentials, URL encoding, real route/method/body shapes, send idempotency, multipart files, cancellation, complete-request timeouts, strict response validation, OAuth URL validation and configuration absence. These tests do not contact or verify a live backend.
