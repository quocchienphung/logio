# Settings page (settings command layout)

Source: the public preview of the **Settings command** block, <https://uiarc.dev/components/blocks/settings-command>. Read through the rendered page only (`scripts/forensics/uiarc-settings-command-*.mjs`): DOM, resolved and declared CSS, tokens, screenshots of each state and frame traces of the motion. No UIArc API, registry, CLI or gated Pro source was used; the component was authored independently from those measurements.

## Route map

| Source | Local |
| --- | --- |
| Settings command preview (desktop 745 px frame, phone 390 px) | **Not a sidebar page.** A panel over the page that is open: `?settings=<section>` (`1`, `general`, `members`, …) → `settings-command/SettingsOverlay.tsx` hosting `SettingsCommand.tsx`. The older `?section=settings[&settings-tab=…]` link opens the same panel. |
| (this app) agent usage, plan, members and API keys — the page that used to be Settings | `/personalize?section=usage` → `affectui-settings/SettingsBilling.tsx` (unchanged) |
| (this app) compact version | account menu → **Appearance & notifications** → `settings-command/QuickSettings.tsx`, shown in `WorkspaceEditors` |

The sidebar lists **Usage** under Agent Chat; Settings are opened from the account menu (**Settings**) or the pop-up's **All settings**, and closed with the X, Escape or a click outside (the page underneath is never left). The "Invite your teammates" step opens `section=usage&settings-tab=members` (invitations live on Usage); `section=settings&settings-tab=members` opens the Members section of the new page.

## What was observed (`source/`)

| Part | Observed | Local |
| --- | --- | --- |
| Frame | Preview: 208 px side navigation + content, 56 px header, 16 px radius. **Here the navigation is a horizontal row of tabs under the header at every width** (the preview does this below 720 px) | `.sc-frame`; fills the workspace panel (the panel supplies the radius) |
| Header | Title 14/500, search field 300 × 34, radius 10, `⌘K` key cap | `.sc-header`, `.sc-trigger`; the key cap reads `Ctrl K` off Apple platforms |
| Navigation | 32 px tabs, icon + label (icons hidden in narrow panels), a white tab with a hairline that glides to the section in view; a 6 px dot on sections with edits | `.sc-nav*`, shared `layoutId` spring (520 / 40) |
| Content | Scroller padding `8 32 120`, sections max 620 px, 20 px between sections, rows min 60 px, `12 0` padding, hairline between rows | `.sc-scroller`, `.sc-section`, `.sc-row` |
| Rows | 28 rows in 6 sections: label 13/500 + hint 12/muted + control (text 240 px, select 220 px, segmented, switch 42 × 24) | `settings-model.ts` (`rows`, `sections`), `Controls.tsx` |
| Edited row | 6 px dot after the label + hidden "Edited" text | `.sc-row__dirty` |
| Search palette | The field grows into a 560 × 382 palette (radius 10 → 14) on one spring, settled ~900 ms; results 52 px; selected result tinted; hint row "Move / Jump to setting" (hidden on phones) | `SettingsPalette.tsx`; trace: `source/trace-palette-open.json` vs `scripts/forensics/settings-command-palette-trace.mjs` |
| Jump | The palette flies to the row (width/height shrink, fades), the page scrolls on a spring (~700 ms), the row pulses twice (1.6 s) | `pick()` in `SettingsCommand.tsx`; `sc-pulse-*` keyframes |
| Unsaved bar | Grows from a 46 px puck (rises 26 px, spring), count rolls, "Discard" + "Save"; after saving it shrinks to a 146 × 42 "Settings saved" pill | `SaveBar.tsx`; traces `source/trace-bar-*.json` |
| Select | 32 px trigger, list in a layer: radius 20, padding 6, items 36 px with a check | `SelectField` (portal into the open `<dialog>` when there is one) |
| Breakpoints | < 720 px (the page's own width): tabs lose their icons; < 480 px: rows stack, switches stay inline, hint row and key cap hidden | `@container sc-root` rules |
| Reduced motion | Flights become fades, scroll is instant, a single soft pulse | `useReducedMotion` + `@media (prefers-reduced-motion)` |

Keyboard: `Ctrl/⌘ K` (anywhere on the page, taking the shortcut from the workspace search) or `/` (focus in the page, not in a field) opens the search; ↑/↓/Home/End move, Enter jumps, Esc closes and returns focus to the field. The palette is a modal `dialog` with a `combobox` input and a `listbox` (`aria-activedescendant`); a polite live region announces results, jumps, saves and errors.

## Growing out of the menu

Clicking **Settings** in the account menu turns the menu's own box into the panel: `SettingsOverlay` takes the menu's rect (place, size) as the first frame, then springs (stiffness 170, damping 24) to a centred 1040 × 760 panel (nearly full screen on phones), radius 14 → 20, settled in ~0.5 s. The panel content is laid out at its final size from the first frame and clipped by the growing box, so nothing reflows. While it grows, the title, search field, tabs, section heads and rows **rise into place one after another** (`sc-rise`: 12 px, blur 4 px → none, 0.6 s, delay 0.12 s + 30 ms × the element's place in reading order, capped at 34 steps). Closing sends the panel back into the account button and fades it. From the compact pop-up the box that grows is the pop-up. Reduced motion: no flight, no stagger. The code of the panel is fetched when the account menu opens, so the growth starts at once.
Trace: `node scripts/forensics/settings-command-morph-trace.mjs` (start rect ≈ the menu's rect, end 1040 × 760).

## Local behaviour

- **Save** validates first (workspace name, URL slug, billing email, allowed domains). An invalid row shows its message, the count turns red, focus goes to the first invalid field and nothing is saved. A valid save shows "Saving…" ~0.9 s, then "Settings saved".
- **What a saved value does.** Theme (Light / Dark / System, following the device) paints the whole app; the workspace name renames the workspace in the sidebar; the notification choices also set `preferences.emailNotifications` / `desktopNotifications`. The other values (language, time zone, text size, density, motion, security, members, billing) are stored per workspace (`command-settings` resource, `docs/backend-api.md`) but nothing else in the app reads them yet. Nothing leaves the browser.
- **Compact pop-up.** Theme, Density, Mentions, Assigned to me, Weekly digest and Email delivery, built from the same controls and values as the page, with an **All settings** link that opens the page. Saving in either place updates the other.
- Sample values are this workspace's own (name, `logio.app/<slug>`, `billing@logio.com`); labels, hints and option lists are the preview's.

## Known differences

- Headings use Inter; the preview uses Geist (not bundled in this app).
- Text size, density and interface motion are saved but do not yet restyle the app.
- The unsaved bar's "Saving…" step and the palette's flight target are measured approximations (the preview's own save endpoint is a placeholder).

## QA

```sh
node scripts/qa/settings-command.mjs http://localhost:3000
```

69 checks: structure and measured geometry, growth out of the menu (first frame = the menu's box, monotonic growth, staggered rows), closing (X, Escape, outside click, focus back on the account button), navigation and scroll-spy, edit/discard/validation/save, theme and rename applied, reload persistence, select keyboard, palette (growth, filtering, Ctrl+K, "/", jump, empty state), compact pop-up and its shared state, deep link, Usage page, phone layout, reduced motion, no page errors. Captures land in `qa/`; the source captures are in `source/` (`root.html`, `declared-styles.css`, `tokens.json`, traces).
CSS fixes belong in `src/components/sites/settings-command/settings-command.css`.
