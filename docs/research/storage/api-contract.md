# Storage backend API

Storage uses the same `WorkspaceBackend`, workspace IDs, authentication headers, credentials, errors, ETags and resource persistence as the other workspace pages. `createHttpBackend` also implements `backend.knowledge` for originals and full-text indexes; its `resolveUrl` callback accepts `kind: "knowledge"` to adapt another server's routes.

## Enable the built-in server

Set `NEXT_PUBLIC_WORKSPACE_API_URL=/api/workspace` before starting dev or building production, as for the existing pages. Data is stored under `LOGIO_DATA_DIR` (default `./.logio-data`; Docker defaults to `/srv/logio-data`). The same `LOGIO_API_TOKEN` / local-network guard applies. The runtime alternative is `window.__workspaceBackendConfig = { baseUrl: "/api/workspace", headers: () => ({ Authorization: "Bearer …" }) }`, set by the host before mounting the workspace; never bake a private token into a public client environment variable.

Docker Compose forwards `NEXT_PUBLIC_WORKSPACE_API_URL` as a production build argument and retains data in the `workspace-data` volume; dev has a separate `dev-workspace-data` volume. Its default data directory is owned by the production Node user. The required PDF-worker preparation script is included in the Docker context. A custom `LOGIO_DATA_DIR` needs a matching writable persistent mount. Browser-only data is not silently migrated when a backend is enabled.

## Endpoints

All paths below are relative to `{base}/workspaces/{workspaceId}`. `workspaceId` and document IDs match `[A-Za-z0-9_-]{1,128}`. Responses use `Cache-Control: no-store`; errors use `{ error: { message } }` and the existing workspace HTTP status mapping.

| Method/path | Contract |
| --- | --- |
| `GET /knowledge-library` | Existing resource envelope `{data: StorageLibrary, version}`. Returns `204` when empty; supports ETag / `If-None-Match`. Metadata is polled while the page is visible, so other devices' edits appear. |
| `PUT /knowledge-library` | Existing `{data, baseVersion?, changes?}` resource contract and `If-Match`. Metadata is validated server-side. Returns `{version}`; stale version `412`. |
| `PUT /storage/documents/{id}` | Multipart `file` (original File), `text` (normalized extracted text, possibly empty), `sha256` (lowercase 64-character hex). Server checks file format/size, actual byte fingerprint and normalized index, builds canonical passages, then commits the original and index together. Returns `{data:{id,sha256,bytes}}`. Exact retries are idempotent; replacing an ID with different bytes/text/name returns `409`. |
| `GET /storage/documents/{id}/index` | `{data:{text:string,chunks:string[]}}`. Full source text and canonical overlapping passages, available to a fresh device without IndexedDB. Missing file `404`. |
| `GET /storage/documents/{id}/original` | Byte-checked original as an attachment, `application/octet-stream`, `nosniff`, UTF-8 filename. Fetched through the configured auth/credentials, then downloaded locally; credentials are never placed in a URL. |
| `GET /storage/search?q={query}` | `{data:{ids:string[]}}`, matching original source text plus metadata in this workspace's current library. Query up to 256 characters. Does not expose orphan uploads or other workspaces. |
| `DELETE /storage/documents/{id}` | Remove stored original/index; `204` also for an already removed ID. Returns `409` while the library metadata still references that ID. |

`StorageLibrary` / `StorageDocument` are in `src/components/sites/storage/storage-model.ts`; transport types and index validation are in `src/lib/storage/knowledge-contract.ts`. Original storage is under `<data>/workspaces/<workspaceId>/storage/<id>/{original,index.json}`. User filenames never determine filesystem paths. Upload body limit is 24 MiB including multipart framing, original file limit 20 MiB, full index limit 1,000,000 characters. Existing extraction limits remain unchanged.

## Write and delete ordering

After the person's approval, upload the original/index and verify its receipt, then append metadata through the existing versioned resource. Read the resource back before reporting Complete. If metadata fails, the uploaded original remains for retry; an interrupted upload can leave an unreferenced document on the server and exact re-upload of the same ID is safe. There is no automatic orphan garbage collector or distributed transaction.

Deletion first saves and verifies metadata removal, then deletes the server original/index and optional device cache. A failed delete stays in the confirmation for retry; the original remains on the server until deletion succeeds. Independently downloaded copies remain outside the workspace. All requests use the shared token guard, same-origin write check and per-workspace paths. This is the existing home-server shared-token/LAN trust model, not a new multi-user account permission system.

Server storage is authoritative in remote mode. Device caching is optional: uploads, previews, full-text search and original/ZIP downloads work with IndexedDB unavailable. Search/text-load failures are visible with Retry rather than silently reporting full-text results. Without a configured backend, the existing local IndexedDB/resource workflow still works. A custom backend must implement `knowledge` (or the documented HTTP routes); unsupported routes fail visibly instead of pretending a local cache is a remote save.

## Verification

- Unit tests cover byte integrity, server roundtrip, canonical full indexes, path/workspace isolation, retry/conflict semantics, referenced-original deletion guards, multipart/attachment responses, configured auth/credentials, receipt validation and error handling.
- `node scripts/qa/storage-backend.mjs` launches the optimized build against a disposable isolated data directory and test token, then checks the actual API and two independent browser sessions: remote upload approval, full-text search beyond excerpts, download, no-cache operation, live updates, ZIP, denied upload/retry and failed delete/retry. Test data and its server are removed afterward.
- `node scripts/qa/storage.mjs` retains the browser-only regression coverage. Production build, TypeScript and full project tests are also required.

Docker configuration is prepared but the Docker image was not run in this environment because the Docker CLI is unavailable.
