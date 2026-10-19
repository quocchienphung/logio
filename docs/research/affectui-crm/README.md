# CRM reference and validation

Source: [affectUI CRM](https://www.affectui.com/screens/crm), [full preview](https://www.affectui.com/screens/crm/full). Captured 2026-10-19. Local route: `http://localhost:3000/personalize`, linked by **Guide me** in desktop and mobile navigation.

Read [the implementation handoff](../../affectui-handoff.md) for the clone workflow, UI architecture, file ownership and known limits. [The library inventory](../affectui-library/README.md) covers the other public items.

## Initial view comparisons

Pixelmatch threshold 0.15, device scale 1, Chrome; fonts loaded and entrance transitions settled. Percentages count changed pixels over the full viewport. A low percentage does not verify untested states or backend behavior.

| Viewport | Changed pixels | Reference | Local | Diff |
| --- | ---: | --- | --- | --- |
| 1440 × 1000 | 0.081% | [source](comparison/source-1440.png) | [local](comparison/local-1440.png) | [diff](comparison/diff-1440.png) |
| 1920 × 1080 | 0.056% | [source](comparison/source-1920.png) | [local](comparison/local-1920.png) | [diff](comparison/diff-1920.png) |
| 900 × 900 | 0.106% | [source](comparison/source-900.png) | [local](comparison/local-900.png) | [diff](comparison/diff-900.png) |
| 768 × 1024 | 0.096% | [source](comparison/source-768.png) | [local](comparison/local-768.png) | [diff](comparison/diff-768.png) |
| 390 × 844 | 0.159% | [source](comparison/source-390.png) | [local](comparison/local-390.png) | [diff](comparison/diff-390.png) |

No document horizontal overflow at these widths. Mobile table and tabs scroll within their own panels. Geometry/computed styles are recorded in [metrics.json](comparison/metrics.json).

## Other CRM tabs at 1440 × 1000

| State | Changed pixels | Reference | Local |
| --- | ---: | --- | --- |
| Team strategy | 0.152% | [source](comparison/source-Team-strategy.png) | [local](comparison/local-Team-strategy.png) |
| Pixel integration | 0.016% | [source](comparison/source-Pixel-integration.png) | [local](comparison/local-Pixel-integration.png) |
| Sales docs | 0.013% | [source](comparison/source-Sales-docs.png) | [local](comparison/local-Sales-docs.png) |

Remaining small differences include the breadcrumb/favorite icon geometry, company mark framing, and some board detail. Hidden menus and the local search/document dialogs are not covered by the pixel comparison percentages. Source menu, checklist, tag-picker and drawer captures are saved as `source-*.png` with matching HTML/text files.

## Functional checks

`node scripts/qa/affectui-crm.mjs` passed **11 workflow groups**, with no page errors. [Exact results](qa/results.json):

- Initial route and original company data.
- Cell edit/commit/cancel, undo and redo.
- Tag editing, shared board data, pointer drag/drop and keyboard stage changes.
- Three-state sorting and selected-row duplicate/delete.
- Multi-cell TSV paste, range copy and keyboard navigation.
- Adding and editing a company.
- Pixel snippet copy and simulated connection.
- Document covers/dialog, sidebar, workspace switching and dark mode.
- Checklist progress/accordion and workspace search.
- Mobile drawer, horizontal table scroll and page overflow.
- Guide me navigation from the existing homepage on desktop and mobile.

`npm run check` passed lint, TypeScript and production build. Four pre-existing lint warnings remain outside the CRM implementation. No dependencies or remote production runtime were added.

## Scope

This is a client-side UI reconstruction from public previews. Company edits reset on refresh. Pixel connection is simulated and document contents are unavailable from the original demo. Pro installation source, Classic variants and other library interaction states are outside this delivery. See the handoff for local extensions and how Claude Code should continue.
