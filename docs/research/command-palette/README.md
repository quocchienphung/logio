# Global page navigator

Reference: https://uiarc.dev/components/blocks/command-palette (public rendered preview,
2026-10-31). Local destination: all website routes, mounted once in `src/app/layout.tsx`.

## Scope and controls

The source is an inline command panel; the requested integration places it in a native modal,
centered horizontally and vertically. **Bare Tab** opens it, including while an input or another
dialog has focus. Shift+Tab, Ctrl+Tab, Alt+Tab, Cmd/Ctrl+K do not open this navigator. Once open,
native Tab/Shift+Tab cycles its search/clear/close controls within the modal. Arrow keys move
through results, Home/End jump, Enter navigates. Escape clears a nonempty query, then closes;
the Esc button and backdrop close directly. Closing restores the previous focus.

The existing workspace's separate company/view search is still available from its account menu;
its existing shortcut is independent of this navigator. No additional shortcut was added here.

The catalog has 55 real local destinations: the homepage, Guide me, Explore pages, 19 workspace
sections, all implemented product routes, seven Settings sections, four Usage tabs and four CRM
views. No entry is fabricated for an unimplemented page. Workspace entries derive from
`guideGroups`; the QA script compares the catalog with actual App Router pages and
`workspaceSections`. User-created records are searched by the existing workspace search.

Within a mounted workspace, navigation uses its existing history/popstate contract; switching
sections preserves the document/backend provider. Settings opens over the current workspace
page. Cross-document destinations use local document navigation, as the site's existing
transition runtime does. No external service is called.

## Observations and reconstruction

- Desktop panel: 440px wide, 26px corners, 1px border. Header: 54px, 8px × 14px padding,
  10px gap. Results: maximum 342px, 6px × 8px padding. Full panel: 440 × 398px.
- Rows: 38px high, 10px inset/gap, 16px Lucide icons, 14px labels, 12px inline descriptions.
  Group headings use 12px medium text and 8px 10px 4px padding; groups have 6px gaps.
- Selection: one absolute rounded highlight follows pointer/keyboard selection; focus stays on
  the combobox. Active descendant and selected option are linked, with a polite result count.
- Search: every word must match; label prefixes rank first, then substrings, keyword/description
  word starts and ordered letters in labels. Matched letters use medium weight. Local Vietnamese
  aliases also work with and without accents.
- Empty state: measured padding 26px 12px 28px, 32px icon holder, 20px icon, 14px medium heading,
  12px hint. With the captured six-character query the full panel is 203px high.
- Light and dark tokens, borders and shadows were read from computed styles. Dark was observed
  by opening Appearance, selecting Dark, and dismissing the Appearance panel with Escape.
- At widths below 480px the shortcut hint is hidden and padding tightens. The requested modal
  retains 16px viewport gutters and limits results to available height on short screens. UIArc's
  narrow documentation preview itself overflowed its container; that host overflow is not reused.
- The public preview has no visible footer in its observed open state; no footer was invented.

The panel rises 6px from scale .98 and fades for 160ms with cubic-bezier(.16,1,.3,1). The rendered
translation and highlight were sampled per frame. `source/spring-fit.json` contains least-squares
fits: entry stiffness 165 / damping 25.5 and highlight 390 / 39, unit mass, normalized RMSE below
0.003 in the recorded samples. These are **fits**, not recovered source constants. The resizing
frame uses a visually calibrated 150 / 28 spring. Nearby surviving rows glide; jumps over 80px
snap. Reduced motion removes entry travel, size/row glides and highlight travel. A 130ms exit
fade and backdrop are adaptations for the requested modal host.

Intrinsic content is observed independently of the animated height. Measurements from the
native dialog's initial `display:none` state are skipped, so opening never starts a height
animation toward zero. The native top layer keeps the navigator above other dialogs and the
homepage's high-z-index navigation; keyboard events stay inside it.

## Assets and implementation

`public/sites/command-palette/inter.woff2` is the exact Inter variable font observed at
`https://uiarc.dev/_next/static/media/6c596dfcddeca1e9-s.p.woff2`, served locally under the scoped
family `Palette Inter`. Icons use the existing Lucide dependency, as observed in the preview.
Screenshots and recorded DOM/style data are references only; the component is authored
React/CSS/Motion. No source API, registry package, production JavaScript or screenshot renderer
is used.

- `CommandPalette.tsx`: global Tab listener, native modal lifecycle, focus/theme and navigation.
- `CommandPanel.tsx`: combobox, grouping/search, cursor, rows and measured-height animation.
- `navigation-items.ts`: destination catalog and ranking.
- `command-palette.css`: scoped visual reconstruction and responsive/dark/reduced-motion states.

## Verification and evidence

`source/` holds desktop, filtered, empty, mobile and dark captures; computed styles; entry,
highlight/filter/exit frame samples; and spring fits. `local/` and `qa/` hold the local renders.
`comparison.json` records reference style assertions and a pixel comparison of the equivalent
empty state. That comparison masks the intentionally changed Tab keycap and pixels outside
the card's rounded corners, and aligns only the capture host to an integer pixel: native centering
of an odd-height panel otherwise lands on half pixels. Real application centering is unchanged.
Small raster differences remain; the adapted page labels/groups are not pixel-comparable with
the source's project action labels.

Final validation: 87 browser checks on the production build, 36 source style assertions,
TypeScript/build and targeted ESLint. No runtime errors or requests to UIArc from the local app.
The equivalent empty-state capture differs in 1.571% of the unmasked pixels; it is not asserted
to be a byte-identical screenshot. Font license: `public/sites/command-palette/OFL.txt`.

Commands (use a production server for the final browser pass):

```powershell
node scripts/forensics/command-palette-inspect.mjs
node scripts/forensics/command-palette-motion.mjs
node scripts/forensics/command-palette-details.mjs
node scripts/forensics/command-palette-fit.mjs
node scripts/forensics/command-palette-compare.mjs http://localhost:3001/
node scripts/qa/command-palette.mjs http://localhost:3001
npm run typecheck
npm run build
```
