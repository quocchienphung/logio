# Files → Agent Chat

Inspected 2026-10-20: [Files public preview](https://www.affectui.com/screens/files/full), plus the linked [Brand assets folder](https://www.affectui.com/screens/folder/full?folder=Brand%20assets). Local destination: `/personalize?section=files`, with folder details at `?section=files&folder=Brand+assets`. Files follows New chat in the Agent Chat sidebar; Explore pages, Logio branding and the other workspaces remain intact.

## Source observations

- Desktop: page padding 46/32/56 px, 22/28 px title, 13.5/20 px subtitle, 38 px section gaps. Four folder cards have 59 px height, 12 px radii and 11 px gaps. Templates are 239 px wide, with 158 px previews and a 72×92 px layered document drawing. Inter and existing workspace tokens match the established shell.
- Folder tabs All/Shared/Private and template tabs All/Mine/Shared with me filter independently. Searches and ascending/descending sorting are independent. Grid/list changes folder rows to 52 px. Type filter has multi-selection and Clear all.
- Clicking a folder navigates to a folder detail page. Share copies its URL. In the public demo, Create folder immediately adds “Untitled folder”, Add template immediately inserts “Untitled”, and clicking a file template has no visible effect. These are observations, not assumptions about the gated product.
- Responsive: outer app breakpoint 900 px hides the sidebar and wraps tools; 600 px stacks the search below tools and gives templates two columns with 128 px previews. Folder container widths ≤760 px use two columns and ≤480 px one column. The original shell sidebar is 28 px wider than Logio's existing sidebar; it is intentionally preserved locally.
- Hover lifts/spreads document sheets over 420 ms and opens folder paper layers. Local motion uses CSS and respects reduced motion.

Evidence: `states.json`, `metrics.json`, `public-css.txt`, `source-*.png`. The inspection script collects live public DOM/styles and exercises source interactions; production JavaScript, authenticated APIs, gated source code and document binaries are not used by the implementation. Illustrations are native CSS with editable React markup; Lucide supplies small utility icons. No screenshot/iframe/remote bundle renders the local screen.

## Implementation and deliberate UX extensions

| File | Ownership |
| --- | --- |
| `src/components/sites/affectui-files/Files.tsx` | Page, filtering/sorting, URL/history, upload queue, folder/file operations |
| `FilesDialogs.tsx` | Validated folder forms, sharing, authored template creation and file editing |
| `FileArtwork.tsx`, `files.css` | Independent CSS artwork and scoped responsive styles |
| `files-model.ts` | Model, validation, file-kind detection and clearly local sample content |
| `file-transfer.ts` | Backend multipart upload / local IndexedDB binary storage, actual downloads |
| `../workspace-resources.ts` | `file-library` resource, plus existing chat `folders` resource |
| `../affectui-crm/Crm.tsx`, `workspace-state.ts`, `../guide-navigation/navigation-model.ts` | Lazy route mount and Agent Chat navigation |

The local app replaces the public demo's blank inserts with real creation forms. It adds file details, renaming, editable text, moving, download, deletion with confirmation, workspace sharing metadata, empty states, drag-and-drop, per-file upload retry/cancel and storage/API feedback. Native dialogs provide focus trapping, Escape and accessible names; tabs support arrows/Home/End. File binary downloads are unchanged; sample/editable text exports `.txt`, with explicit disclosure for PDF-styled samples. Removing a folder retains its files as private templates.

Existing chat folder names are reused immediately, so a folder created here appears in “Work in a folder”, and one created in the composer appears here. The source's separate Integrations/Projects sidebar is outside this request; Logio keeps New chat, Files, Run and Settings.

## Backend and limits

See [API contract](api-contract.md). Files uses the existing workspace backend URL, dynamic auth headers, credentials, resource revisions, sync feedback and upload adapter. It makes no affectUI requests. Local mode stores binaries in IndexedDB and metadata through the shared resource store. Remote mode starts empty and uses user-provided services. A live server/storage/ACL service has not been supplied; sharing and signed downloads need the documented server behavior. No live backend deployment is claimed.

Folder rename/delete spans the existing names resource and file-library metadata; these two saves are not a transaction. Blob lifecycle/garbage collection is a server responsibility. Browser files remain on the current device; removed local blob references are not immediately garbage-collected. These boundaries are detailed in the contract.

## Rendered checks

`node scripts/forensics/affectui-files-compare.mjs [base-url]` captures source/local at 390, 768, 1440 and 1920 px, then scrolls the main panels to inspect the bottom. `comparison/side-*.png` contains same-viewport comparisons, `comparison/metrics.json` records geometry/overflow and first-card pixel differences. Differences include the intentional sidebar width, small icon shapes and the independently drawn folder/document glass shading. The folder detail view adds working tools and ownership filters beyond the public demo; it is not claimed as a pixel-identical source state.

Checks: `node scripts/qa/affectui-files.mjs`, `node scripts/qa/guide-navigation.mjs`, `node scripts/qa/affectui-assistant.mjs`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Executed results are recorded in `qa/results.json` and the handoff.

Verified: 8 Files browser workflows, 11 guide navigation checks and 11 Assistant regression checks pass; 77 repository unit tests pass. TypeScript and production build pass. Full lint has 0 errors and 5 existing warnings outside this feature; targeted lint of all changed implementation/inspection/QA files is clean. Source/local first-template crop differences at the 0.15 pixelmatch threshold are 0.29% (1440/1920), 0.71% (390) and 0.63% (768). These metrics describe the first card, not the whole screen. At 390 px the page height is 1186 px on both; section headings are at the same relative coordinates.

Preview: `npm run dev`, then open `/personalize?section=files`, or Guide me → Agent Chat → Files.
