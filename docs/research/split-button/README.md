# Split button (clone engine)

Source of the idea: the public preview of UIArc's **Split button** (`https://uiarc.dev/components/split-button`). Only the rendered page was read: the visible text and the
behaviour notes printed on it (API, keyboard, accessibility, motion), the DOM of each state, the CSS the page declares for the component's classes, computed styles,
screenshots and **frame-by-frame recordings** (`source/`). No API, registry, Code tab, bundle or prompt was fetched and no source was copied;
`src/components/sites/split-button/` is written from those measurements.

## Method

1. **Record**: `scripts/forensics/split-button-inspect.mjs` drives the preview (hover, press, main action, menu open and close, keyboard, dark) and samples the group,
   the label's letters, the menu, its items and the chevron on every `requestAnimationFrame`. `split-button-label.mjs` follows every glyph of the label while
   "Publish" becomes "Published" and back, and reads the tokens the CSS refers to (including the spring curve `--ease-spring`, a 37-point `linear()` over .58s).
2. **Fit**: `split-button-fit.mjs` fits springs (mass 1) to the label width and the menu's transform. Results in `source/spring-fit.json`, pinned in `split-button-model.ts`.
3. **Validate**: `scripts/qa/split-button.mjs` records our button with the same sampler and compares it with the recordings.

## Measured values

| What | Measured | Used |
| --- | --- | --- |
| Shape | group 143 x 46 (1px border + 44px halves), main half `0 16px`, chevron half 38px, radius 18px; `secondary` variant: 36px halves, pill radius, main half min 142px, chevron 32px | `split-button.css` (`md`, `sm`) |
| Press | the **whole group** scales to .97 while the main half is held (120ms, ease-standard) and springs back on the source's `linear()` curve in .58s; the chevron half does not press the group | `.sb-group:has(> .sb-primary:active)` |
| Colours | primary: foreground fill, hover `color-mix(fg 88%, bg)`, pressed 80%; secondary: surface fill, hover `--surface-muted`; focus ring `oklab(24% 0 0 / .72)` 2px, 2px offset | tokens in the CSS |
| Chevron | rotates 180 degrees when the menu is open on the source's spring curve; our rotation over time differs from the recorded one by 0.0009 (rmse of the normalised angle) | `MENU.easeSpring` |
| Label morph | "Publish" to "Published": the seven shared letters stay, two enter, and 2.2s later two leave. Entering letters rise from a 4px blur (opacity 224ms, blur 264ms, expo-out), ~9ms apart. Leaving letters leave the flow (`position:absolute`), fade in ~100ms and blur to 2px | `morphGlyphs()`, `MORPH` |
| Label width | a ResizeObserver-driven overdamped spring: stiffness 340, damping 48 (ratio 1.3), rmse 0.011; it starts ~50ms after new letters appear when growing, at once when shrinking | `MORPH.width` |
| Menu | 4px under the chevron, end-aligned to the group, min width 192px, 12px collision padding, radius 26px, padding 5px, items 36px high; opens from scale .97 and 5px toward the button; opacity .16s expo, transform on the spring curve; items fade in 35ms apart (up to the fifth); closes in 130ms | `placeMenu()`, `MENU`, CSS |
| Keyboard | Enter/Space run the main action or open the menu from the chevron; ArrowDown/Up loop, Escape returns focus to the chevron; chevron labelled "<label> more actions" | `SplitButton.tsx` |

Fit quality in our QA (the same quantities from our button against the recordings): menu opacity rmse 0.001, menu scale rmse 0.001, item stagger 30/36ms against 30/37ms
recorded, chevron rotation 0.0009. First new letter's opacity at +16/+64/+110ms: 0.42 / 0.73 / 0.98 against 0.39 / 0.88 / 0.96 recorded.

Not observable from the public page: the crossfade curve of a changed icon (a 160ms blur fade is used), the closing curve of the menu beyond its removal at ~205ms,
and typeahead (Radix behaviour, implemented here from its documented behaviour).

## What it became here (customised)

* `SplitButton` has the documented API (`label`, `actions`, `onClick`, `icon`, `variant`, `disabled`) plus a **`compact`** size (28px halves, 30px in all) for toolbars and pills,
  a `menuLabel`, and a menu that takes the **theme** of the page it opened from (it lives in the body).
* On the Process page it replaces the two icon buttons (folder, plus) of the name pill: the main half is **New process** (opens the new-process bottom sheet);
  the menu holds **Saved processes (n)**, **Duplicate this process**, **Export as JSON**, **Import from a file…** and **Delete this process** (disabled
  with one process; it asks inline, see below). When one of them completes the main label morphs in place — Created, Duplicated, Exported, Imported, Deleted — and returns after 2.2s, like the source's
  "Publish to Published". On a narrow page the pill wraps and the split button gets its own row.
* A selected action runs after the menu has handed the focus back to the chevron, so one that opens a sheet or dialog takes it from there.

## Colours of the bar

The group and its menu use the Process page's own tokens (`--proc-panel`, `--proc-line`, `--proc-ink`, `--proc-hover`, `--proc-focus`, `--proc-danger`): `.sb-group.proc-split` in
`process-sheets.css` (it has to outrank `.sb-group`, whose light defaults won in the dark theme and made the button white). The menu lives in the body, so `matchColors`
reads those tokens from the group when it opens and puts them on the menu: in both themes the button and the menu have the bar's colour (checked in QA).

## Delete without a pop-up (Confirm morph)

Deleting a process no longer opens a dialog. It uses the Confirm morph (`skilled/ui/ConfirmMorph.tsx`, an independent build of UIArc's Confirm morph measured from its public
preview: `docs/research/uiarc-confirm-morph/`; press mode, tone danger, size `sm`, `data-interaction-own`):

* **Menu item** (`SplitButtonAction.confirm`): the row *is* the morph. Click or Enter: the row unfolds on the grow spring into "Delete? **Cancel** **Delete**" (parts arrive 36ms apart
  from a 4px blur), the menu stays open and the confirm answer takes the focus. A press within 280ms of the question opening is ignored (a double click or a held Space never
  confirms). **Delete** deletes at once (the main label morphs to *Deleted*) and the row shows *Deleted* with **Undo** (the page's own history, so the process comes back);
  the menu leaves after the result has stayed 4s (a resting pointer pauses it) or after Undo. **Cancel**, Escape (first the question, then the menu), a press elsewhere or 6s
  unanswered put the row back. While a row asks, the menu's arrows/Tab leave it alone and the pointer no longer moves the focus.
* **Saved processes sheet**: the row's trash icon unfolds in place into the same question, taking the room from the title and giving it back on Cancel; deleting keeps the
  sheet open (the focus moves to the list) and the page's Undo restores the process.
* The "Delete process" dialog is gone (blocks keep their own confirmation). `deleteProcess` no longer closes dialogs.

## QA

`node scripts/qa/split-button.mjs [base-url]` (15 checks, Chrome and a phone viewport, reduced motion), `node scripts/qa/process-delete-morph.mjs [base-url]` (the inline delete: question, Cancel/Escape,
Undo, keyboard, colours in both themes, sheet row, phone; 9 checks). `npm test` covers `split-button-model.test.mjs`.

Note (2026-10-31): a command palette being built in `src/components/sites/command-palette/` opens on every Tab press, so the Tab-based checks of `split-button.mjs` (menu closes on Tab, focus rings) and what
follows them fail while it is in the tree; `process-delete-morph.mjs` does not press Tab.
