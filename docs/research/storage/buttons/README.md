# Storage controls: public-preview evidence

Observed on 23 October 2026. The nine requested UIArc pages are independently rebuilt in `src/components/sites/storage/StorageControls.tsx` and `storage-controls.css`, then used by `/personalize?section=storage`.

Only rendered public previews, their DOM, computed styles and visitor interactions were inspected. No registry endpoint, installation command, source tab, production JavaScript bundle, Pro source, AI prompt or UIArc API was used in this implementation. The application does not request UIArc at runtime.

## References and observed behavior

| Source path at `https://uiarc.dev/components/` | Evidence | Local export and use |
| --- | --- | --- |
| `button` | `button.json`; primary, secondary, ghost and danger; heights 36/44/50, radius 18, 14px medium Inter, 8px icon gap | `StorageButton`: basic and dialog actions, loading keeps focus and suppresses repeat activation |
| `action-button` | `action-button.json`, `action-timed.json`; click enters Saving, then Saved, then returns to idle; trailing arrow in idle source example | `StorageActionButton`: real processing, storage and downloads; caller supplies label/icons, pending/success labels and async action |
| `split-button` | `split-button.json`; default action plus 38px trigger, 44px inner action and 46px outer group, menu alternatives | `StorageSplitButton`: upload and note/manifest actions; native top-layer popover, Arrow keys/Home/End/Escape, disabled-item skipping and focus restoration |
| `button-group` | `button-group.json`; adjoining actions with 18px outer corners and separators, normal and primary examples | `StorageButtonGroup`: document subject filters; Storage page adapts this into its compact controlled filter row |
| `floating-button-group` | `floating-button-group.json`; horizontal and vertical groups, muted and raised surfaces, 36px actions with 13px corners, separators | `StorageFloatingButtonGroup`: selected-file actions, arrow navigation; optional `orientation`, `appearance`, action `iconOnly` and `separatorBefore` |
| `expanding-button-group` | `expanding-button-group.json`, `motion.json`, `expanding-hover.png`; first label expanded initially, hover moves expansion to hovered item, action feedback | `StorageExpandingButtonGroup`: Open / Download / Delete on real document rows, hover and focus expansion |
| `copy-button` | `copy-button.json`; actual clipboard copy, check mark and Copied response, label and icon-only forms | `StorageCopyButton`: source text and SHA-256 fingerprint with real clipboard access and explicit failure feedback |
| `icon-morph` | `motion.json`, `icon-active-pairs.json`, `icon-active-pairs.png`; all eight rendered pairs, SVG paths/masks and settled transforms | `StorageIconMorph`: menu/close, play/pause, plus/check, copy/copied, sun/moon, chevron-down/up, bell/bell-off, heart/heart-filled. Caller controls state and color. SVG stroke is 1.75 |
| `confirm-morph` | `confirm-morph.json`, `motion.json`, `confirm-*-open/after.png`; inline arm/cancel/delete, hold, explicit 3s countdown, pending, success and Undo | `StorageConfirmMorph`: document deletion; optional `mode="hold"` or `"countdown"` and `onUndo`. Storage uses click mode. Escape collapses an armed confirmation without dismissing the surrounding native dialog |

Every page has desktop 1440×1000 and phone 390×844 screenshots, plus click-state screenshots. `storage-buttons-inspect.mjs`, `storage-controls-motion.mjs`, `storage-icon-states.mjs` and `storage-action-states.mjs` under `scripts/forensics/` reproduce the source observations. Timed action frame labels are nominal wait offsets; screenshot/read overhead is not subtracted.

## Integration and deliberate adaptations

The Storage app supplies its own real labels, icons, actions and file data. Component examples are not represented as separate clone routes. Button-group filters follow the app's compact surface. Native top-layer menus are positioned against their trigger and flip upward when necessary; they close on resize or scroll. Pointer-coarse targets grow to 44px and the floating toolbar retains its intrinsic horizontal width where it fits. The workspace's actual account theme controls light/dark colors; menus inherit the same theme while in the top layer.

Motion is independently authored using `motion/react` and CSS. Geometry, rendered SVG shapes and state transitions are based on evidence. Spring constants, exact subframe timing and the local 900ms hold threshold are implementation choices rather than a claim to have recovered the source engine. The rendered hold example completed under a 2.2s press; the source's exact hold threshold was not established. Reduced motion removes displacement/morph animation and retains essential progress feedback.

`StorageControlAction` is `{ id, label, icon?, onClick, disabled?, danger?, pressed?, iconOnly?, separatorBefore? }`. Every visible action in the app is connected to its actual file/selection behavior; no mock success timer replaces the underlying promise. Confirmation supports an optional Undo callback; the integrated document dialog closes after a successful deletion and does not expose Undo.

## Verification

`node scripts/qa/storage-controls.mjs` passes **22 checks** in a fresh isolated browser context with disposable uploaded Markdown and SQL files. It checks split/menu keyboard and viewport bounds, note action, actual processing/storage, subject filters, hover expansion, floating selection actions, actual clipboard text/SHA-256, confirmation cancel/Escape/deletion, phone layout, the real account Dark mode setting, and copied SVG stroke visibility. Images, results, measurements and dark colors are in `local/`. Local integration exercises the default click confirmation; optional hold/countdown modes are not exercised by that app-level script.

The source preview and integrated page intentionally have different labels, content and parent layouts; screenshots and measured control geometry are evidence of the reconstruction and adaptations, not a pixel-diff claim for the entire Storage page. Source light button heights are 36/44/50; split outer height is 46; copy icon button and inline confirmation are 36. Browser QA measures local desktop and phone geometry in `local/measurements.json`.
