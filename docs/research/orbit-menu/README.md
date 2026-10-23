# Orbit menu → block shortcuts on the Process map

Source of the idea: the public preview of UIArc's **Orbit menu** (`https://uiarc.dev/components/orbit-menu`). Only the rendered page was read
(visible text, DOM of the closed/open/result states, declared CSS of the rendered page, computed styles, screenshots and sampled motion in
`source/`, collected by `scripts/forensics/orbit-menu-inspect.mjs`). No API, registry, Code tab, bundle or prompt was fetched, and none of its
source is copied: everything in `src/components/sites/orbit-menu/` is written independently from those observations.

## What was observed (kept in `source/`)

| Observation | Where it is used |
| --- | --- |
| Trigger is a 56px circle; when open it turns into a translucent close button (X) and a pill with the group label sits in the middle of the arc | `OrbitMenu.tsx`, `orbit-menu.css` |
| Five 46px actions on a 104px radius over a 150° fan, centred on "up" | `orbitPoints()` (test: `orbit-geometry.test.mjs`, the five centres match the observed ones) |
| A thin arc track is drawn behind the actions; actions spring out one after another and fold back in reverse | `OrbitMenu.tsx` (path draw + staggered spring) |
| Hovering/aiming an action lights a dark "lens" circle behind it and the pill shows its name | `orbit-menu-lens`, pill |
| Pressing the trigger and dragging toward an action (pie targeting, 34px dead zone) then releasing runs it; releasing without moving keeps/closes it | `orbitTarget()` |
| After an action the trigger shows a check and the pill says what happened for about 1.4s | `result` state |
| Dark theme, reduced motion | CSS variables, `useReducedMotion`, `[data-ui-motion="off"]` |

## What this project adds

The demo has a button in the page. Here the same orbit is a **context menu of every block** of the Process page
(`/personalize?section=process`), in addition to the right-hand panel (nothing was removed from it).

* **Open**: right click on a block (Map or Tree view) · `Menu` key / `Shift+F10` on a focused block · long press (0.48s) on a phone.
  The menu opens centred on the pointer; the close button sits where you clicked, like the demo's X.
* **Choose**: click, hover + click, the arrow keys (+ Enter), a **hotkey** (shown in the pill while an action is lit), or press-drag-release
  from the middle button. Escape or a click elsewhere closes it; the focus returns to the block when it was opened from the keyboard.
* **Fit**: the fan keeps inside the map and out from under the open settings panel (`fitOrbit()` rotates it, then narrows it only at a tight corner).

| Hotkey | Action | Same operation as |
| --- | --- | --- |
| R | Run from here / Review request / Retry block (whichever applies) | the block's *Run branch*, permission review, retry |
| T | Open run trace (while a run is going) | Tracing page |
| S | Block settings | opening the block's panel |
| A | Add sub-block | the `+` handle |
| D | Duplicate branch | settings panel *Duplicate* |
| P | Require / remove approval | the *Asks you before it runs* switch |
| Delete | Delete block (opens the usual confirmation) | settings panel *Delete* |

`block-shortcuts.ts` decides what is offered and why something is unavailable; it uses the same guards as the studio (the first block cannot be
deleted or duplicated, structure is frozen while a run is active or starting, block/depth limits, a person's block keeps its approval). An
unavailable action stays visible, is dimmed, and its pill explains why. Actions are re-checked at the moment they are chosen.

## Files

* `src/components/sites/orbit-menu/` — `OrbitMenu.tsx` (component, `anchor` mode for context menus), `orbit-geometry.ts` (pure), `orbit-menu.css`.
* `src/components/sites/process/block-shortcuts.ts` — which shortcuts a block has (pure, tested in `block-shortcuts.test.mjs`).
* `ProcessMap.tsx` (`onBlockMenu`: contextmenu + long press) and `ProcessPage.tsx` (`openBlockMenu`, `renderBlockMenu`, Tree view delegation).

## QA

* `node scripts/qa/orbit-menu.mjs [base-url]` — Chrome (right click, hotkeys, edge fitting, locked states, Tree view, Menu key), phone long press, WebKit.
  Screenshots go to `docs/research/orbit-menu/qa/`.
* `npm test` — geometry and shortcut rules.
