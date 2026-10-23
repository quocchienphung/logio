# Shared interaction motion and Process permission expansion

Inspected 2026-10-22. This change transfers the public UIArc previews' interaction rules into the existing local interface, retaining each page's content, styles and business actions.

## Evidence and method

Sources:

- <https://uiarc.dev/components/dropdown-menu>
- <https://uiarc.dev/components/button>
- <https://uiarc.dev/components/blocks/kpi-drilldown>

The browser exercised real pointer clicks, hover, Escape and arrow keys at 1440×1000 and 390×844. `source/` contains rendered DOM, declared CSS, **resolved component-level** transitions, screenshots and timestamped animation-frame samples. The tools read the public pages and their public Code tab. No UIArc API, registry JSON, CLI, MCP endpoint, downloaded runtime bundle or gated KPI source was used. The KPI implementation is Pro; its public live preview's geometry was observed, and the local implementation was authored independently.

Timing evidence is a combination of declared/resolved CSS and actual frames. It is not a claim of one measurement per millisecond: the browser supplies frames at its native cadence. Frame collection itself incurs work, so resolved CSS is authoritative for declared durations; samples establish trajectories, visible states and the shape of expansion.

| Rule | Observed evidence | Local treatment |
| --- | --- | --- |
| Menu opening | 160ms opacity, 580ms transform; initial `translateY(-5px) scale(.97)` | Native Web Animations for shared React/imperative menus; equivalent CSS for native popovers |
| Menu exit | 130ms opacity/transform, `translateY(-2.5px) scale(.985)` | Retained exit with immediate inert/pointer disabling; rapid reversal handled |
| Items | 240ms reveal, 35ms stagger, capped at four delays | Same values, staggered work limited to the first 12 mounted rows |
| Easing | `cubic-bezier(.22,1,.36,1)`, enter `.16,1,.3,1`, 37-point CSS `linear()` spring | Shared measured tokens, cubic fallback where CSS `linear()` is unsupported |
| Press | 120ms; `.97`, `.96` for icon widths, `.985` for widths over 220px | Delegated native button feedback; popup anchors remain steady |
| Highlight | One moving layer; pointer glide, immediate keyboard selection | Shared moving layer using the observed spring vocabulary; local selection semantics retained |
| Label changes | Width morph and short blur/fade; existing focus retained | Recent interacted-button width morph; known label spans fade/blur without rewriting React DOM |
| KPI expansion | A card grows into a detail panel, then folds back; much of the motion settles over about one second | Permission surface uses a normalized 41-point height trajectory measured from the phone preview, at 25ms intervals, over 1000ms |

The highlight/label adaptations share the measured motion vocabulary; this does not assert access to UIArc's unpublished JavaScript spring parameters. Raw observations are retained rather than claiming the two differently populated products are pixel identical.

## The Process surface

`/personalize?section=process`: the Permission request no longer swaps a chip for a full-size mounted card. A stable section grows from a compact surface on first appearance, folds to Review, and expands back from that exact chip. Explicit **Needs you / Review request** now updates the existing surface instead of changing its React key. Requests and decision receipts retarget the same surface's measured size. A mid-animation reversal starts from its current visible dimensions.

The panel is anchored above the map dock and clips its growing outline. Its content retains final text metrics while the real width/height animate, then returns to natural responsive sizing. Header, request summary, preview and footer reveal in a short stagger. Short screens retain the existing internal scroll area; the map dock and run controls remain reachable. Reduced motion skips size changes. Geometry is read only at a state or viewport change; the browser interpolates keyframes without a JavaScript animation loop.

The permission engine is unchanged: no new approval scope, timing gate or delayed request is introduced. Allow/Deny, queue, errors, busy protection, focus and keyboard decision rules remain operational while the visual transition runs.

## Ownership and coverage

| Owner | Coverage |
| --- | --- |
| `src/components/interaction/motion-tokens.ts`, `src/styles/interaction.css` | Shared values and scoped native/fold styles |
| `InteractionRuntime.tsx`, root layout | Delegated press, recent label changes and native-details preparation across all routes, including lazy pages; no attribute observer or per-control idle loop |
| `menu-motion.ts`, `MenuSurface.tsx` | Presence-aware opening/exit, stagger, highlight, interruption/cancellation, list-preserving surface |
| `useMorphingPanel.ts`, `observed-expansion.json` | Bounded, interruptible, measured size change and content reveal |
| CRM, Settings, Analytics, Run | Shared workspace dropdowns, saved reports and spreadsheet tag picker, with retained exit and disabled-aware keys |
| AssistantMenu, ModelPicker, Combobox | Existing top-layer and selection engines preserved; shared timing for surfaces and folds; model positioning uses resize/scroll observation instead of an idle frame loop |
| ProcessPermissions, ProcessPage, NoticeSparks, AgentBar | Permission card, Add block menu and notification/failure popovers |
| Stripe Navigation and Stats | Desktop/mobile header timing, retained exit, time-of-day listbox with keyboard selection |
| Legacy v1 nav controller, HDS revenue subnav | Product dropdown adapters with retained exit, original placement/hover intent/focus behavior |

Native details use progressive `::details-content`/`interpolate-size` styling; existing HDS fallback and native semantics remain. Browser-native select/picker UI and specialized canvas/tree/3D/trace motion keep their existing engines. The Guide intro's decorative controls are excluded from the delegated press effect. Existing Motion-controlled button transforms are also preserved. No global `transition: all`, blanket `will-change`, page-wide row scaling or layout measurements on every pointer move were introduced.

## Verification

Production build and full lint/typecheck passed (six existing lint warnings outside this change). `npm test`: **280 passed**.

Verified results:

- Shared motion suite: **14/14**, including 37 route smoke checks, actual intermediate permission sizes on Chromium/touch/WebKit, native product menus, and idle model-menu positioning (zero trigger geometry reads over one idle second, followed by successful resize anchoring).
- Menu exit/focus: **Chromium and WebKit passed**; Escape restores the trigger and opening Search preserves the new dialog's focus.
- Existing permission workflow: **13/13**; Combobox: **14**; workspace/Analytics: **17**; Settings tabs: **9**; Model picker: **14**, all passed with no uncaught page errors in their reports.
- Desktop example from the real frame capture: **260×42** initially, **355×379** around 350ms after capture began, and **400×537** settled. These are local content-dependent dimensions, not hard-coded UI sizes or a source pixel-match claim.

Commands:

```sh
node --experimental-strip-types scripts/qa/uiarc-interactions.mjs http://localhost:3013
node scripts/qa/uiarc-menu-focus.mjs http://localhost:3013
node --experimental-strip-types scripts/qa/process-permissions.mjs http://localhost:3013
node scripts/qa/combobox.mjs http://localhost:3013
node scripts/qa/affectui-workspace.mjs http://localhost:3013
node scripts/qa/affectui-settings-tabs.mjs http://localhost:3013
node scripts/qa/model-picker.mjs http://localhost:3013
```

`qa/report.json` records actual intermediate panel sizes on desktop, touch emulation and WebKit, reversals, reduced motion, menu presence/highlight/keyboard behavior, press feedback, navigation and route smoke coverage. Source inspection scripts are `scripts/forensics/uiarc-*.mjs`; they operate through the public browser pages. Existing interaction workflows are covered by the adjacent suites. No physical iPhone FPS or complete pixel-identical clone of gated UIArc implementations is claimed.
