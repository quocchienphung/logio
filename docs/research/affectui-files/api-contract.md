# Files backend integration

Files is an independently authored client of the existing [workspace backend](../../backend-api.md). No request targets affectUI. The user supplies the API server, authentication and storage. No backend service or credentials were provided in this checkout; authenticated HTTP workflows are verified with Playwright mocks, not a live deployment.

## Configuration

Use the existing `NEXT_PUBLIC_WORKSPACE_API_URL` setting, or configure before React mounts:

```ts
window.__workspaceBackendConfig = {
  baseUrl: "https://your-api.example/v1",
  credentials: "include",
  headers: async () => ({ Authorization: `Bearer ${await getAccessToken()}` }),
};
```

`getAccessToken` belongs to the host application. Do not put server secrets in `NEXT_PUBLIC_*`. CORS must allow the frontend origin, credentials when used, and `Authorization`, `Content-Type`, `If-Match`, `If-None-Match`. `HttpBackendConfig.resolveUrl` remaps routes; `WorkspaceBackendProvider backend={...}` accepts another transport.

## Routes

| Method | Route relative to baseUrl | Request / response |
| --- | --- | --- |
| GET | `/workspaces/:id/folders` | `{ "data": ["Research"], "version": "f1" }` |
| PUT | `/workspaces/:id/folders` | `{ "data": ["Research", "Planning"], "baseVersion": "f1" }`; `If-Match: f1` |
| GET | `/workspaces/:id/file-library` | `{ "data": FileLibrary, "version": "l1" }` |
| PUT | `/workspaces/:id/file-library` | `{ "data": FileLibrary, "baseVersion": "l1" }`; `If-Match: l1` |
| POST | `/workspaces/:id/uploads/document` | Multipart form field `file`; response `{ "data": { "url": "/files/signed-download/abc" } }` |

Successful PUT returns `{ "version": "l2" }` or an ETag. GET 204/404 means an empty library. Files deliberately seeds **no sample folders/files for remote mode**. The `folders` resource remains the existing array of unique names used by the chat composer; chat's `folderId` still holds a folder name for compatibility. File-library stores names as references, access metadata, file metadata, and authored template text. Binary bytes never enter its JSON.

The server must return a browser-accessible HTTPS or root-relative download URL (for example an expiring signed URL, or cookie-authenticated same-origin download). Link downloads cannot add bearer headers. The frontend rejects executable URLs, protocol-relative URLs, credentials in URLs, malformed records, duplicate file IDs, invalid dates and negative sizes. The upload request inherits fresh auth headers and credentials. A configured JSON Content-Type is removed for multipart so the browser supplies the correct boundary.

## Data shape

The exact exported types and validation are in `src/components/sites/affectui-files/files-model.ts`:

```ts
type FileAccess = "private" | "shared";
type FileKind = "document" | "pdf" | "spreadsheet" | "image" | "other";
interface FileLibrary {
  folderAccess: Record<string, FileAccess>; // folder name → access
  items: {
    id: string; name: string; kind: FileKind;
    owner: string; mine: boolean; access: FileAccess;
    folder: string | null; template: boolean;
    size: number; mime: string; createdAt: string; // ISO timestamp
    url?: string;       // original uploaded binary's download URL
    text?: string;      // editable plain-text template, exports .txt
    localBlobId?: string; // browser mode only; never an upload reference for a server
  }[];
}
```

Example response:

```json
{
  "data": {
    "folderAccess": { "Research": "shared" },
    "items": [{
      "id": "file_123", "name": "brief.pdf", "kind": "pdf",
      "owner": "Alex Morgan", "mine": true, "access": "shared",
      "folder": "Research", "template": false,
      "size": 14520, "mime": "application/pdf",
      "createdAt": "2026-10-20T08:00:00Z",
      "url": "/files/signed-download/file_123"
    }]
  },
  "version": "l1"
}
```

The UI sends a complete revised snapshot, without a `changes` array (file-library is an object resource). Server ownership, `mine`, MIME validation and permissions must be derived/checked against the authenticated user. Folder files inherit the folder access setting. Shared means members of the workspace, not an anonymous public link. A copied link is navigation; it does not bypass server access checks. Recheck access at download time. Restrict writes/deletion of records the user does not own or cannot manage.

Folder rename updates the shared names resource, metadata key and every affected file reference. Folder removal keeps its files as private, unfiled templates. These are **two resource saves**, not an atomic server transaction. A backend requiring cross-resource atomicity should implement a domain command/custom `WorkspaceBackend` adapter; it should tolerate ordering or reconcile dangling folder references. Independent optimistic revision conflicts can otherwise require a refresh and retry. The client keeps errors visible through the sidebar and inline retry banner.

Uploads are limited to 10 per selection and 20 MB per file. The server must enforce its own limits and validate file contents. A successful upload is followed by a metadata PUT; unreferenced binaries (including cancelled/retried uploads) need normal server garbage collection. Deleting a file removes its metadata; it does not call a separate blob-delete endpoint. Do not delete an uploaded blob while other records still reference it.

401/403 produce a visible error and retry; 409/412 use the shared store's version/conflict handling; network/5xx resource saves use its bounded retry. Upload retries are explicit. Cancelling/closing the page aborts active upload requests and suppresses late results. Failed uploads retain the file for retry while the page remains mounted.

## Browser mode

Without a configured backend, folder names and metadata use the shared resource store in localStorage. Actual files use IndexedDB (`logio-file-library`, `blobs`), referenced by `localBlobId`. This supports downloads after refresh on the same browser/device. Browser storage is a demonstration mode, not cross-device sync or a security boundary. Independently authored initial document text is marked as sample content; no source PDF/document binaries were obtained or fabricated. Uploaded files retain their original bytes and format.

## Verification

`node scripts/qa/affectui-files.mjs [base-url]` checks real browser interactions and authenticated mock REST, including multipart boundary, original bytes, retry after 503, version header, persisted reload and 401. Evidence: `qa/results.json` and `qa/http-requests.json`. Model validation is covered by `files-model.test.mjs`; the existing workspace backend tests cover shared save ordering, retry and revision conflicts.
