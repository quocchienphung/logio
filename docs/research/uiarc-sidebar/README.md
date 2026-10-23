# Sidebar folder (Techniques)

Source: the public **App rail** preview of <https://uiarc.dev/components/blocks/sidebar> (expanded rail, *Projects* folder). Read through the rendered page only (`scripts/forensics/uiarc-sidebar-capture.mjs`): DOM, resolved CSS and per-frame samples of the folder opening/closing. No UIArc API, registry, CLI or gated Pro source was used; the component was authored independently.

## What was observed (`source/`)

| Part | Observed | Local |
| --- | --- | --- |
| Folder head | 32px row, folder icon, label, chevron at the right; `aria-expanded` | `SidebarFolder.tsx` head, `Folder`/`FolderOpen` icon, chevron rotates 0 ↔ −90° on a spring |
| Children | 30px rows, `margin-left: 28px`, 1px tree line under the folder icon (`top:4px; bottom:8px`) | `sidebar-folder.css`: line under the folder icon, children inset 22px (our rows are 6px-padded) |
| Height | Grows/shrinks by height; no overshoot, ~550ms to settle (98px → 0.8px at 556ms) | Spring `stiffness 150, damping 25` (≈ critically damped) |
| Opacity | Close: gone in ~80ms. Open: stays 0 until ~100ms, 1 by ~260ms | Close 100ms ease-out; open 200ms after a 70ms delay |
| Hover / active | `--row-hover` 4.5–5%, `--row-active` 7–8% foreground mix; the lit row keeps the foreground colour | Existing `ui-as-side__item` states and the shared `active-navigation` pill |
| Reduced motion | Instant | `useReducedMotion` → zero duration |

Frame traces: `source/group-collapse.json`, `group-expand.json`, `child-select.json`.

## Local behaviour

- `Crm.tsx` declares `sidebarFolders`. **Techniques** holds **Process** and **Tracing** (they keep their `Workflow` / `Waypoints` icons and their `/personalize?section=…` routes). Add another folder by adding an entry; its first child's position in the group decides where it renders.
- The folder opens by itself on a child page; after the person toggles it, their choice wins. Keyboard: Enter/Space toggle, ArrowRight opens, ArrowLeft closes. Children unmount when closed (nothing hidden is focusable).
- Phones: the same markup inside the drawer; rows are 38px on coarse pointers.

## QA

```sh
node scripts/qa/sidebar-folder.mjs http://localhost:3000
```

22 checks (structure, icons, measured open/close frames with no overshoot, keyboard, navigation, phone rows, reduced motion, no page errors). Captures in `qa/`. CSS fixes belong in `sidebar-folder.css`.
