# Storage: edit details, hold-to-remove with Undo, Action button

Added 2026-10-24 on `/personalize?section=storage`. It reuses the two components built for Skilled (`src/components/sites/skilled/ui/ActionButton.tsx`, `ConfirmMorph.tsx`), which were measured from the public UIArc previews only (`docs/research/uiarc-action-button/README.md`, `docs/research/uiarc-confirm-morph/README.md`; no UIArc API, registry, install command, prompt or Pro source). Nothing new was measured for Storage and the app never requests UIArc.

## What changed for a person

* **Edit a document's details** (document dialog, new editor above the text): name (without its extension, which is the file's real type and stays as a fixed suffix) and knowledge area. **Save changes** is the Action button: off until there is a valid change, *Saving* until the library metadata is stored **and read back** (`persistStorage`), *Saved* for 2.4 s. A bad name is refused in words (empty, `/` or `\`, control characters, over 240 characters). *Discard* returns to the stored values; closing the dialog drops an unsaved draft. Only name and knowledge area change: id, SHA-256, size, date, text index and the stored original are untouched, so download, dedupe and full-text search keep working (a downloaded file now carries the new name).
  * Before this, the knowledge area changed the moment it was picked, with no confirmation and no way to rename. It is now a draft saved with Save changes.
* **Remove with a hold** (dialog of a single document, and the Remove dialog behind a row's Delete or the selection bar's Delete): the Confirm morph in hold mode. *Remove 2 documents* morphs into "Confirm removal? Cancel Remove"; Remove must be held for one second (a click does nothing, letting go early drains the fill, Escape or a press outside cancels).
* **Undo.** On completion the documents leave the library at once (metadata saved and verified) and the dialog shows *Removed · Undo* for 8 s, then closes by itself. Undo puts them back where they stood (original and index were never deleted). Closing the dialog early keeps an *N documents removed · Undo* note under the map until 10 s after the removal. After that the originals and indexes are deleted for good.
* **Process files, Approve & store, Download original** are the Action button (they were a first approximation, `StorageActionButton`, now removed together with `StorageConfirmMorph`).

## How removal stays safe (the part that is easy to get wrong)

Removal is two steps: (1) the metadata leaves the library and is saved and verified; (2) the stored original and index are deleted after the Undo window. So:

* Undo never has to re-upload anything, and restoring refuses (in words) when an identical copy was uploaded meanwhile or the library changed so it cannot be placed.
* The files of a document that is back in the library are never deleted (`finalizeTrash` re-checks the library).
* Closing the tab inside the window: `pagehide` tries to delete at once, but a page that is being destroyed cannot be trusted to finish, so every removal is also noted (ids only, `logio-storage-pending-purge` in local storage, `storage-purge.ts`) until its files are really gone. The next visit to Storage finishes the job once the window and a 2 s grace for other tabs are over, and drops notes of documents that came back. QA: leaving the page inside the window leaves nothing in storage and no note.
* A backend that refuses the deletion (QA: HTTP 503): the document is already out of the library, the files stay on the server, and a **Retry delete** banner stays until they are gone (before, the same confirmation retried; it still can). Remote mode is unchanged otherwise (originals are never cached locally or downloaded for Undo).

## Code

`StorageDocumentEditor.tsx` (editor), `storage-edit.ts` (pure: split name, draft, inspect, apply, `withoutDocuments` / `restoreDocuments`), `storage-purge.ts` (the note kept for the next visit), `storage-edit.css` (also maps the workspace tokens to the `--sk-*` names the shared components read), `Storage.tsx` (`removeDocuments`, `undoRemoval`, `finalizeTrash`, `purgeStored`, `saveDetails`, `removalPhase`, the sweep effect and the Undo note). The dialogs' Remove morph mounts fresh each time the dialog opens (a closed `<dialog>` keeps its children, so it kept its old *Removed* result).

## Verification (2026-10-24, Chrome, production build on a spare port for timing-sensitive runs)

* `npm test` 404 pass (6 for `storage-edit`, 4 for `storage-purge`), typecheck and lint clean.
* `node scripts/qa/storage-edit-delete.mjs [base-url]` **35/35**: the Action buttons, the editor (extension fixed, refusals, Discard, idle -> pending -> Saved -> idle with Saved held 2.35 s, title/row/reload persistence, fingerprint unchanged, download name), hold-remove (quick click ignored, original still in IndexedDB during the window), Undo from the dialog and from the note (old place, text still loads), the window ending (dialog closes, files gone, reload), leaving inside the window, a save the store cannot keep (reason shown in the editor, never *Saved*, old name kept, draft kept, pressable again), dark theme, phone 390 px (no overflow, hold and Undo).
* Existing Storage QA updated for the new flows and passing: `storage-controls.mjs` 27 (new: hold, Undo, files kept then deleted), `storage.mjs` (bulk remove, bulk Undo), `storage-layout.mjs` 15 (Save changes after choosing an area), `storage-backend.mjs` against a real `next start` server (refused deletion kept visible, Retry delete succeeds, original kept during the window). `skilled-edit-delete.mjs` 47/47 still passes.
* Dev server vs production: on the dev server approving 25 documents takes 7-11 s (many 1 s long tasks) and made `storage-layout.mjs` fail intermittently; production takes about 1 s and all runs passed three times. The dev server also lists a missing build chunk on every `/personalize` page while files are being edited (reported by the QA, not counted as an error).

## Limits (honest)

* After the window the removal is permanent; a reload also ends Undo for that session (the files are removed by the next visit).
* The note that backs this is local to one browser. With a remote backend, a removal in which the browser closed before the deletion call and was never opened again leaves the original on the server.
* The text of a document cannot be edited (the original and its fingerprint would no longer match); only name and area.
* A failed save of the details puts the old values back in the library, keeps the typed draft and shows the reason in the editor (`persistStorage`'s sentence, which still says "Retry save"; here that means pressing Save changes again). If the store keeps failing, its own *Retry save* banner appears on the page.
* The old `.stg-confirm*` CSS in `storage-controls.css` is no longer used.
* Not tried: a physical phone, Safari/WebKit (beyond the existing layout QA), a screen reader.
