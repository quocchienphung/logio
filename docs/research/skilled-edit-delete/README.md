# Skilled: edit and save a skill, delete a skill

Added 2026-10-23 on `/skilled`. Reference components, measured from the public previews only (no UIArc API, registry, install command, prompt or Pro source): Action button (`docs/research/uiarc-action-button/README.md`) and Confirm morph in hold mode (`docs/research/uiarc-confirm-morph/README.md`). The Storage page used earlier approximations of both (`StorageActionButton`, `StorageConfirmMorph`); on 2026-10-24 it moved to these same components, see `docs/research/storage-edit-delete/README.md`.

## What a person can now do

* **Edit** (pencil on a ready skill's card): the card opens an editor on the stored SKILL.md. Name and description come from its header (the rule used when a skill is added), so renaming a skill is editing its header. Where it runs (Local AI / AI Agent) and the three guardrails can change too. The header is checked while typing (what is wrong is said in a sentence, size limit 256 KB) and Save changes stays off until there is a valid change.
* **Save changes** is the Action button. It stays on *Saving* until the workspace has really stored the change (`settled()` waits for the store's own save status, including a retried save), then shows *Saved* with a drawn check for 2.4 s. If the store cannot save, the button does not say Saved and the editor shows the reason; a name that another active skill uses is refused in words and nothing is stored. Ctrl/Cmd+S saves; Discard / Done closes.
* What is recomputed on save: name, description, size and **SHA-256** (so bundles and receipts stay valid). Kept: id, date added, source, revision, supporting files.
* **Delete** (every card): a Confirm morph in hold mode. Delete morphs into "Delete this skill? Cancel Delete"; the Delete button must be held for one second (a quick click does nothing; Escape or a press outside cancels; Enter or Space held works too). On completion the skill is deleted from the workspace at once and its card stays in its place showing *Deleted · Undo* (8 s, paused while the pointer is on it); **Undo** puts the skill back in its old place in the workspace; after that the card leaves. Archive (reversible, with its notice) is unchanged.

## Code

`SkillEditor.tsx`, `skill-edit.ts` (pure: draft, validation, applying an edit, delete/undo placement, ghosts; tests `skill-edit.test.mjs`), `skill-persist.ts` (`settled`, tested with a fake store), `skill-edit.css`, `SkillCard.tsx` (Edit, Delete, ghost state), `Skilled.tsx` (`saveEdit`, `deleteSkill`, `undoDelete`, `settleDeleted`), `ui/ActionButton.tsx`, `ui/ConfirmMorph.tsx`, `ui/confirm-morph-model.ts`. `src/components/interaction/InteractionRuntime.tsx` got a three-line opt-out (`data-interaction-own`): the shared runtime animated any button's width and press on its own and pinned the Save button at 112 px for 0.6 s.

No schema change: a skill record has the same fields, so stored libraries, bundles, receipts and the home-server API are unaffected. Saves and deletions are recorded by the existing "Browser save / Database save" events.

## Verification (2026-10-23, Chrome on this machine)

* `npm test` 394 pass (8 for the Confirm morph rules, 11 for editing/deleting/saving), typecheck and lint clean.
* `node scripts/qa/skilled-edit-delete.mjs` **47/47** against real browser storage: edit opens on the stored SKILL.md; Save off until valid change; live header errors; Saving -> Saved timeline, success held 2.42 s; the stored text, size and SHA-256 recomputed (checked with SubtleCrypto); id/date/target kept; Ctrl+S; rename; clashing name refused with nothing stored; a failing store does not show Saved; delete question, focus, Escape, outside press, quick click ignored, early release drains and deletes nothing, hold fill straight at about 100 %/s, holding one second deletes from storage and keeps the card with Undo, Undo restores the old place in storage, keyboard hold, the card leaves after the result and the deletion survives a reload; width springs (button ω 30, pill grow ω and shrink ω within the measured ranges); dark theme colours; phone 390 px (no overflow, finger hold deletes); reduced motion (pill lands at once, hold fill still shows); no console errors. Screenshots in `qa/`.
* `node scripts/qa/skilled.mjs` 27/27 and `node scripts/qa/repo.mjs` 22/22 still pass.

## Limits (honest)

* Delete is permanent once confirmed; Undo exists while the result is on screen (8 s, or until dismissed). After a reload there is nothing to undo.
* Editing is for ready skills; restore an archived one first. Editing changes the local copy only (for a GitHub skill the original source is not touched and its recorded revision stays as imported).
* If the library changes elsewhere while the editor is open, the save is applied to the library as it is when you press Save.
* Not tried: a physical phone, Safari/WebKit, a screen reader. Timings come from this machine's frame rate.
