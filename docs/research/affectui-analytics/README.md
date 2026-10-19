# Analytics → Reports

Source: [Analytics documentation](https://www.affectui.com/screens/analytics), [full preview](https://www.affectui.com/screens/analytics/full). Captured 2026-10-19.

Local: **Guide me → Reports**, or `http://localhost:3000/personalize?section=reports`. The CRM sidebar is intentionally retained; the Revenue dashboard content follows Analytics. Home/Companies/Contacts/Deals/Reports and the three pipeline entries now navigate to working local views. Browser back/forward follows the `section` query parameter without losing company edits.

## Observed layout

- Shared `.ui-as` shell: 220px sidebar, 8px frame gap, 18px rounded main panel, scoped Inter 400/500/600.
- Revenue header: 60px high, title at a 24px left inset, period/export/save controls at the right.
- Four stat cards; then a flexible revenue chart with a 340px breakdown column; then three equal cards for products/sessions/order value. Card gap 12px, radius 14px.
- Main-container breakpoints: below 900px the main row stacks and lower row uses two columns; below 820px stat cards become 2 × 2; below 560px the lower row stacks. App width ≤600px puts toolbar actions below the title. The outer main panel scrolls vertically.
- Charts use SVG line plots, 3 y labels, 3 x labels, a 160ms tooltip fade and 220ms guide/dot movement. Initial line reveal lasts 1100ms. Tooltip entries sort by the selected value and flip to the left in the right half of the chart.
- Light/dark colors inherit from the shell. Reduced motion skips line reveal, path/counter tween duration and layout transitions.

## Source datasets

The three periods were inspected directly. All figures, line coordinates, axes, minibars, product amounts and breakdown sparklines are stored in `src/components/sites/affectui-analytics/analytics-seed.json`. Each series has seven source sample points. Tooltip dates were observed explicitly; they are not derived by dividing a nominal period into equal days.

| Period | Gross revenue | Active customers | Conversion | Refund rate |
| --- | ---: | ---: | ---: | ---: |
| Last 7 days | $96,412 | 2,847 | 3.24% | 1.8% |
| Last 30 days | $414,572 | 5,904 | 3.28% | 1.8% |
| Last 90 days | $1,243,715 | 10,225 | 3.38% | 1.9% |

Dates: 7 days = Mar 3–9; 30 days = Feb 9, Feb 14, Feb 19, Feb 24, Mar 1, Mar 5, Mar 9; 90 days = Dec 10, Dec 25, Jan 9, Jan 24, Feb 8, Feb 23, Mar 9. These are the reference's demonstration dates, not current business data. Reports use the source's revenue dataset, independently from the CRM company pipeline.

## Working interactions

- Period selector updates every metric, chart, axis, breakdown and product amount. Arrow keys/Home/End navigate the period menu; outside click/Escape dismiss it.
- Pointer, keyboard and touch select chart samples. Home/End move to first/last; Escape hides the tooltip. Touch selection remains visible until another interaction.
- Footer controls reveal a series legend. Series can be toggled while retaining at least one visible line.
- Metric captions open explanations; product rows open a detail dialog with revenue/share.
- Export downloads a real CSV containing current metrics, breakdown, products, series and sample dates.
- Save as report accepts a name; saved reports can be reopened and deleted. Their period/name persist separately per workspace.
- All remaining CRM navigation has local workflows: Home totals/record links, Contacts CRUD/search/export, pipeline search/owner filter/export, custom table/board views, Profile/Settings, local feedback and changelog.
- Sales docs retains the source covers and adds create/edit/save/download, folders and user uploads. Original document bodies are unavailable; built-in bodies are explicitly labeled workspace drafts. Uploads are limited to 2 MB each.

## Animation contract

`MotionConfig reducedMotion="user"` wraps the workspace. Selection pills share `layoutId`; screen/tab/menu transitions crossfade over roughly 180ms; table rows animate positions over 300ms; board cards move between columns with a damped spring; checklist groups animate height; dialogs/backdrops use native discrete transitions. Existing sidebar collapse/drawer timing is preserved.

On period change, numeric values tween over 700ms and SVG paths morph over 650ms with `cubic-bezier(0.22,1,0.36,1)`. Paths are resampled to a constant 85 points so differing shapes can interpolate without snapping. Initial paths retain the observed 1100ms reveal. Animations respond to interaction rather than polling or randomly changing data in the background. [Motion layout reference](https://motion.dev/docs/react-layout-animations), [presence reference](https://motion.dev/docs/react-animate-presence).

## Ownership and regeneration

| File | Purpose |
| --- | --- |
| `src/components/sites/affectui-analytics/Analytics.tsx` | Dashboard, periods, CSV, saved reports, metric/product dialogs |
| `AnalyticsChart.tsx` | SVG paths, pointer/touch/keyboard samples, tooltip and legend |
| `AnimatedNumber.tsx` | MotionValue number formatting/tween |
| `analytics-seed.json`, `icons.json`, `analytics-reference.css` | Observed public reference data and styles; generated |
| `analytics-overrides.css` | Local integration and animation adjustments |
| `src/components/sites/affectui-crm/Crm.tsx` | Shared shell, navigation, custom views and account dialogs |
| `workspace-state.ts`, `crm-engine.ts` | Query navigation, per-workspace browser storage, company undo/redo |
| `WorkspacePages.tsx`, `WorkspaceDocuments.tsx`, `WorkspaceEditors.tsx` | Additional functional workspace views |

Capture with `node scripts/forensics/affectui-analytics-inspect.mjs`, then generate reference inputs with `node scripts/forensics/affectui-analytics-prepare.mjs`. Never put local fixes in the generated CSS/JSON. Public DOM/style observations are references; no remote production JS bundle is imported by the application.

## Visual comparisons

Chrome, device scale 1, fonts and animations settled, pixelmatch threshold 0.15. Main-panel comparison excludes the deliberately different CRM sidebar. Full screenshots are also saved for review. Numbers apply to these initial states, not every interaction state.

| Viewport | Main-panel changed pixels | Source | Local | Diff |
| --- | ---: | --- | --- | --- |
| 1440 × 1000 | 0.078% | [source](comparison/source-1440.png) | [local](comparison/local-1440.png) | [diff](comparison/diff-1440.png) |
| 1920 × 1080 | 0.052% | [source](comparison/source-1920.png) | [local](comparison/local-1920.png) | [diff](comparison/diff-1920.png) |
| 1024 × 900 | 0.136% | [source](comparison/source-1024.png) | [local](comparison/local-1024.png) | [diff](comparison/diff-1024.png) |
| 768 × 1024 | 0.127% | [source](comparison/source-768.png) | [local](comparison/local-768.png) | [diff](comparison/diff-768.png) |
| 390 × 844 | 0.308% | [source](comparison/source-390.png) | [local](comparison/local-390.png) | [diff](comparison/diff-390.png) |

No page horizontal overflow or page errors were recorded. Small residual differences include icon paths, numeral antialiasing, and some wrapping at narrow widths. [Geometry and exact results](comparison/metrics.json).

Additional settled-state comparisons at 1440 × 1000: Last 30 days **0.082%**, Last 90 days **0.082%**. [30-day source](comparison/source-30-days.png), [30-day local](comparison/local-30-days.png), [90-day source](comparison/source-90-days.png), [90-day local](comparison/local-90-days.png), [state measurements](comparison/states.json). Run only these with `node scripts/forensics/affectui-analytics-compare.mjs http://localhost:3000 --states-only`.

## Validation and limits

`node scripts/qa/affectui-workspace.mjs` passes **17 workflow groups**; `node scripts/qa/affectui-crm.mjs` passes the original **11 groups**. The new suite tests intermediate path animation frames, all periods, export contents, report persistence, contact/custom-view CRUD, uploads/downloads, workspace isolation, touch and reduced motion. [Results](qa/results.json).

`npm run check` passes lint, TypeScript and production build with four pre-existing warnings outside these components. No dependency was added.

Data is stored on the current browser/device. There is no production database, authentication, email delivery, or cross-device sync. Pixel verification remains a local simulation. Reports reproduce the preview's demo data. Workspaces, uploaded documents and other locally authored content do not leave the browser.
