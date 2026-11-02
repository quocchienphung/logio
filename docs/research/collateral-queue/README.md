# Collateral: upload, Queue, Excel and JSON

2026-11-02. Requested change to the existing three connected pages. Implementation is local React/CSS/Motion and the app's home-server filesystem API. No new dependencies.

## Route and ownership

| Route | Behavior | Owner |
| --- | --- | --- |
| `/personalize?section=excel-formation` | Centered uploader, no steps before successful read/scan; four tabs enter one after another after the real worker is ready. Existing Dropzone, workbook unfurl, review, export and JSON logic retained. | `collateral/excel-formation/`, shared `Stepper.tsx` |
| `/personalize?section=json-formation` | Existing mapping, viewer, validation and export read the same worker as Excel. | `collateral/json-formation/` |
| `/personalize?section=queue` | Every accepted XLSX upload, including corrupt XLSX, has an independent persisted original and history record. Search, status filters, original download, re-open into Excel/JSON, hold to permanently delete. | `collateral/queue/` |

All three are in Rules → Collateral, searchable in workspace navigation; Queue has the Files loading skeleton. The provider is keyed by workspace, so switching workspaces terminates the old worker and cannot mix file contents.

## Source evidence and adaptations

Followed `.agents/skills/clone-website/SKILL.md`. Public references: [Hold to confirm](https://uiarc.dev/components/hold-to-confirm), [Prompt cache](https://uiarc.dev/components/prompt-cache). Rendered DOM, declared CSS, desktop/mobile/wide/dark screenshots, interactions, recorded `Element.animate` options and rAF frame samples are in [source/README.md](source/README.md). Prompt cache source is Pro gated; no registry, private source, component bundle or API was obtained.

- Hold: 44px height, 18px corners, 20px padding, 18px icon / 8px gap; a 1200ms linear fill, early release rewind, quick repress resume, .97 press, width morph, drawn check. Pointer capture; >24px outside, blur, hidden document, canceled pointer and key release cancel. Space/Enter holding works. Only a successful DELETE response triggers Deleted. While awaiting the server the button says Deleting; failed requests restore an actionable hold.
- Prompt cache: 34px card corners, 24px padding / 20px gap; 10px segmented bars / 2px gaps / 3px corners, 28% tinted cached fill with 55% outline, 192px side panel moved above the list below a 660px container, compact rows below 480px. Selection flies a copy of the real file-size bar into the detail panel in 460ms with `[.22,1,.36,1]`; details fade in 240ms. No fake token counts, costs, cache hits, TTL or time saved.
- Spring equivalents fitted from source frames: rewind k170.3/c26.1, press k406.02/c40.3, width k155/c24.9, mass1. These are measured approximations, not a claim about UIArc's private constants. Fit output and reproducible script: `source/spring-fit.json`, `scripts/forensics/queue-arc-fit.mjs`.
- Workbook-specific decisions: four steps reveal with a 460ms ease and 90ms stagger, only after real worker readiness; this stagger is an adaptation, not an observed UIArc Excel feature. Queue bars express actual byte sizes (explicitly labelled relative to the largest upload); summary segments are the bytes of saved/scanned/failed originals. The right panel shows actual name, time, SHA-256 and worker counts. Original analysis still runs in the browser. Queue is a durable upload archive, not a fabricated processing simulation.
- Reduced motion removes flight, stagger, press and rewind springs; holding still requires the full deliberate duration. Existing source-to-local workbook Link unfurl behavior remains documented in `../link-unfurl/README.md`.

## Filesystem and API

Automatic upload POST starts beside browser analysis. The UI discloses that originals are saved in Queue; failed disk/network saves remain explicitly unsaved and expose Retry. Processing-status failures are also retriable. Closing the worker does not delete history. Reopening fetches and verifies the original bytes then scans again, without creating another upload record. Unsaved corrections need export or Save progress; they are not silently restored from the original. A warning appears before replacing actual unsaved corrections.

Default disk location:

```
.logio-data/workspaces/<workspace-id>/collateral-queue/<uuid>/
  original.xlsx
  metadata.json
```

This directory is inside the project and already gitignored. `LOGIO_DATA_DIR` can relocate it. Uploads do not modify TS source files or enter a source commit. The application must run on a server with a writable, persistent filesystem to retain them across server restarts/deployments; the local Next server meets that requirement. No automatic expiry: originals remain until deliberately deleted.

`/api/workspace/workspaces/{workspaceId}/collateral-queue` uses the existing token/LAN/same-origin authorization wrapper:

| Method | Path | Body / response |
| --- | --- | --- |
| GET | collection | `{ data: QueueEntry[] }`, newest first |
| POST | collection | Raw bytes, `x-file-name: encodeURIComponent(name)`, 201 `{ data: entry }` |
| GET | `/{uuid}` | Verified original attachment |
| PATCH | `/{uuid}` | `{status,error?,sheets?,rows?}`, `{data: entry}` |
| DELETE | `/{uuid}` | 204 only after original and metadata have been removed |

Entry fields: `id,name,size,sha256,uploadedAt,status` plus worker-reported error/sheet/row counts. Status means uploaded/scanned/failed to scan; scanned does not imply a workbook is issue-free or JSON-exportable. Originals are streamed to staging, with a hard 120MiB limit; published only after metadata and original exist. Metadata updates are atomic; per-record locks serialize downloads/updates/deletion. Validated UUID and workspace segments are the only filesystem path inputs. Filename stays in metadata. Traversal, malformed metadata, oversize and canceled uploads are rejected/cleaned up. Download rechecks size and SHA-256 on server and client. A failed disk deletion propagates; a locked original retains its history for Retry.

Queue reuses the configured workspace API base/headers/credentials when present and otherwise calls this application's same-origin API. A configured external backend must implement these Queue endpoints; an unsupported backend shows an error and cannot claim a successful save. Separate application users require the same account/workspace authorization as the existing home-server API; the local demo has no new authentication system.

## Verification

- `node --experimental-strip-types scripts/qa/collateral-queue.mjs http://localhost:3002`: end-to-end synthetic uploads, persistence, worker/JSON sharing, source-based motion, hold/cancel/fail/wait/delete, actual disk contents, retry, corrupt XLSX, workspace isolation, responsive and reduced motion. Results and renders in `local/`.
- `node --experimental-strip-types --test src/lib/server/collateral-queue-store.test.mjs`: nine focused backend tests, including byte equality, hashing, duplicate upload history, concurrency, workspace isolation, size/abort cleanup and permanent deletion.
- Existing Collateral engine and skeleton tests, Rules navigation QA, import unfurl QA and JSON viewer QA are the regression targets. Commands actually completed and counts are recorded in the final handoff update.

No physical-phone test or full pixel-perfect claim. Source Prompt cache simulates AI cache requests; this implementation deliberately uses the same visual vocabulary for actual uploaded files. Existing unrelated full-suite fixture failures must be reported separately rather than inventing the missing source recordings.
