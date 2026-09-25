# Motion & behaviour: "forms" controller group

Ports live in `src/components/sites/stripe-com-9ababc9a/v1/controllers/forms/`. Reference modules are in
`/home/user/mirror/b.stripecdn.com/mkt-statics-srv/assets/` (read, never loaded). "src" = value read from the
reference module; "inf" = inferred / our decision.

## Shared machinery

| Piece | Port | Reference | Notes |
|---|---|---|---|
| Step model | `anim.ts` (`Exec`, `Delay`, `Type`, `Waapi`, `Group`, `Sequence`) | DSWZA3DI, E6JMO43D, PCZ6HXRS, FOMI4ROK, XUTPP436, 4Q7ZI5NX | Same play/pause/finish/cancel semantics; completion is a Promise instead of the `AnimationStep:done` event bus (inf). Delay/Type run on rAF with elapsed time, so they stop in background tabs like the reference's rAF steps. |
| WAAPI defaults | `Waapi` | 4Q7ZI5NX | duration 500ms, easing `cubic-bezier(.165,.84,.44,1)`, fill `forwards`, 1 iteration (src). |
| Typing | `Type` | FOMI4ROK + 7LUJEHON | Emits the current prefix immediately, then one char every `speed` ms; ends one interval after the last char. `humanizeSpeed` is always `true` in the reference, which makes the interval exactly `speed` (src). Default speed 40 (src). |
| sleep | `sleep()` | 7LUJEHON | Resolves on the first animation frame ≥ ms after the call; `sleep(0)` = next frame (src). |
| humanizeDuration | `humanizeDuration()` | 7LUJEHON | `ms + round(random·ms/2)` (src). |
| Reduced motion | `disableAmbientAnimations()` | W54ZCUX6 | `prefers-reduced-motion: reduce` (src). The reference also treats a SwiftShader GPU as "reduced"; **not ported** so headless QA exercises the real motion (inf). |
| Syntax highlighting | `highlight.ts` | Prism 1.29 grammars (v1-prism-*.js) | Re-implemented tokeniser (grammar order, lookbehind, greedy with rematch, inside) emitting Prism's `<span class="token …">`. The captured CSS colours the tokens with an already-monochrome grey ramp (keyword #d0d0d0, string #b1b1b1, function #c9c9c9, number #c8c8c8, comment #b9b9b9, property #bebebe, class-name #b6b6b6). Grammars are simplified re-writes: classification of edge cases can differ from Prism (inf). |
| Source text restoration | `sources.ts`, `data/codeSources.ts` | — | The page generator collapses whitespace inside the hidden source elements; originals are extracted by `scripts/forensics/products/qa/forms-extract-data.py` and loaded with a dynamic import inside the loader window (where the reference imports Prism). No-op once the generator keeps line breaks. |

## Code editors

| Controller | Trigger | Initial → final | Timing | Loop / replay | Evidence |
|---|---|---|---|---|---|
| CodeEditor | IntersectionObserver threshold 0.1 (ratio ≥ 0.1), once | empty editor + `CodeEditorAsciiLoader` → `CodeEditor--loading` → `CodeEditor--initialized` with highlighted `finalCode`, cursor state = last line | loader shows for `max(1000 − loadTime, 0)` ms (src `1e3`); loader glyph animation is CSS (`code-editor-ascii-loader` .96s step-start, disabled under reduced motion by the captured CSS) | once | IUMYW46Q `onEnterViewport` |
| CodeEditor.setCode(code, resetScroll = true, language) | called by parents | highlighted HTML replaces the editor; scroll reset; line numbers updated; `--codeEditorLineNumbersWidth` = line-number column width | instant; first call before the source table is loaded goes through initialized=false → loading → initialized (src path for "Prism not loaded") | — | IUMYW46Q `setCode` |
| CodeEditor events | — | `CodeEditor:ready` when initialized, `CodeEditor:removed` when cleared (bubbling) | — | — | IUMYW46Q (src) |
| CodeEditorLineNumbers | mount / setCode | `floor((height − 2·--codeEditorVerticalPadding)/24)` "~" rows; after setCode numbers 1…n then "~" | instant | — | GLXFB3WF (src 24px) |
| CodeEditorCursor | cursor state | `top = 5 + vPad + line·--codeEditorLineSpacing`, `left = hPad + column·--codeEditorSingleCharWidth` | instant; block when normal/focused, 2px bar in insert mode (CSS) | — | OM5R4HSS (src) |
| CodeEditorAutocomplete | AnimatedCodeEditor | `--visible` class; rows = suggestions; highlighted row class; list scrolls by 22px rows when the highlight passes row 3 of 5 | instant | — | O7IJKZBV (src `h=5`, `g=22`; top/left use swapped paddings as in the reference) |
| CodeEditorStatusBar | cursor state / mode | `NORMAL`/`INSERT`, `col+1`, `ceil((line+1)/total·100)%`, `line+1/total`; `executeCommand` types a command at 60ms/char then holds 400ms | src | — | BK2LZS3H |
| SnippetsCodeEditor, DeveloperCentricCodeEditor | `SegmentedControl:changed` (detail = [index]); `SegmentedControl:buttonMouseEnter` preloads | snippet i shown in language `[javascript, ruby, python, go, php, java, dotnet][i]` | instant (the reference may flash the loader on a first, un-hovered language click while the grammar downloads; our grammars are bundled, so no flash — inf) | — | FYZGHIMX / WUJ6UP7W (src) |
| AnimatedCodeEditor | commands from DevelopersCodeEditor | vim-like state machine (insert/normal, indent 2 spaces, new lines, autocomplete) rendered through CodeEditor.setCode(…, false) | `INSERT_MULTIPLE_CHARS`: per char one frame + `humanize(5ms)` (after a space `humanize(25ms)`); highlight jumps ≥ 2 rows walk 50ms per row | — | SKTU2ZC5 (src) |
| DevelopersCodeEditor (Sigma) | `CodeEditor:ready` + in view (threshold 0.1, not once) | empty → types `select id, amount, currency, source_id, from balance_transactions` with 7 autocomplete popups → NORMAL, unfocused | command sleeps 200/150/250/50/400ms (src script); ≈8s in total measured in headless Chromium | plays once; pauses between commands when < 10% visible or tab hidden, resumes on return | MTQ4JEO4 (script constants `a`/`m`). Reduced motion: pastes the final query and blurs (src `a`) |

## Card fields (driven by parents in other groups)

| Controller | API | Sequence | Evidence |
|---|---|---|---|
| CheckoutCardField | `playAnimation(number = "4242 4242 4242 4242", exp = "12/24", cvc = "123", network = "visa")`, `reset()`, `setCardNetwork()`, `getAnimation()` | for each of number / expiry / CVC: focus class `GraphicFormFieldInput--focused` → 300ms → type at 90ms/char → 400ms; then blur the last field | NJ7SLHQS (src) |
| InvoicingCardField | `getAnimation(…)` returns a `Step`; `reset()` | same, focus class `InvoicingFieldInput--focused`; networks visa/mastercard/amex/chinaunionpay | FMT7F2YQ (src) |
| PaymentLinksCardField | same | focus class `PaymentLinksFieldInput--focused` | 44GSCTHH (src) |
| Network detection | when ≥ 2 card-number chars are typed | brand icons (reversed order) slide `translateX(i·100% + i·4px)` and fade (500ms), the detected brand is cloned into `activeCardIcon` and scales 0.8→1 / opacity 0→1 (500ms, +100ms); default easing | src; reset = both at 0ms. Brand logos keep their colours. |

## Checkout shipping

| Controller | API / trigger | Sequence | Evidence |
|---|---|---|---|
| ShippingField | `resetAnimation()`, `playAnimation()` (Steps; CheckoutAddressCard drives them) | focus name → type `data-js-value` at 90ms → 300ms → focus address → 300ms → type `354 Oyste` (US, from `<html lang="en-US">`) / `1 Grand Ca` at 100ms → 500ms → hide popover, autofill street/city/state/country/zip → autofill highlights opacity .1→0 over 1500ms linear | YMSKATN7 (src) |
| AddressAutoComplete | `setSuggestions()` from ≥ 2 typed chars | popover fades in (opacity 0→1, translateY 30→0, 500ms default easing) with `data-js-loading` spinner; typed prefix wrapped in `<em>`; hide 500ms (0 on reset) | 7UHPED3L (src). Suggestion rows use the template's markup (rebuilt when the `<template>` is missing). Fictional addresses only. |

## Inputs

| Controller | Behaviour | Evidence |
|---|---|---|
| TextInput | blur → `TextInput__input--touched` (enables :invalid styling); with `data-strip-trailing="true"` trims + strips trailing `/` on paste and blur; `isValid()`, `forceErrors()`, `setDisabled()` | RAMTD5VS (src) |
| SelectInput | input → `SelectInput__input--touched` and `document` event `SelectInput:input`; same API | KLNLGD7H (src) |
| SearchInput | emits `{type:"QueryChange", query}` 160ms after typing stops; `clear()` | S7CJVUIA (src 160) |
| CountrySelectInput | change → drops `CountrySelectInput--hasPlaceholderFlag`, swaps `Flag--country<CODE>`, notifies `onChange` listeners | QACUWFLV (src) |
| Email | `animateIn()`: opacity 0→1, scale .9→1, 1000ms, delay 300ms, `cubic-bezier(0.33,1,0.68,1)`; `animateOut()`: header opacity 1→0 same timing; 0ms under reduced motion | FZRWTWAU (src) |
| Table | track scroll → sync fixed header track + reposition shown PortalTooltipItems; fixed header links scroll to column (smooth, instant under reduced motion); expand button; fixed head corners squared at viewport edge | AVBXGDDX (src). On /invoicing only `track` exists. |

## Payment-methods hub filtering

| Controller | Behaviour | Timing | Evidence |
|---|---|---|---|
| ControlledFilterSelect | trigger click toggles the list (`hidden`, `aria-expanded`); options are focusable only while open; option click is cancelled and toggled on the next task; label `data-label` / `data-selected` with `[amount]`; closes on outside click, Escape (returns focus to trigger), another dropdown opening (`popup:open`), or 700ms after the pointer leaves the list | 700ms close delay (src) | QQPCZ2NS |
| ControlledFilter | wraps the select; change events debounced 100ms | src | UYNMLKL6 |
| PaymentMethodHubGrid (+FilterText) | options built from the page's payment-method JSON (types, use cases, countries sorted by localised label); filter = AND across families, OR within; country filter sorts featured countries first; search matches name / localised name / family / use cases / country names ignoring non-word chars; states initial ↔ filtered ↔ showingAll; clear-all and "Show all" | fade out current cards: opacity 1→0, 320ms; fade in: opacity 0→1 + translateY(15px) scale(.95) → none, 360ms, stagger 40ms; easing `cubic-bezier(0.65,0,0.35,1)` | Grid-MJLPPXEZ + PE5OG4GE (src). Cards come from the card `<template>`; the generator drops it, so the grid lazily loads the same markup from `data/pmCards.ts` (mono colours outside brand logos, via the generator's rules). Controllers inside inserted cards are mounted with `mountControllers` (the reference's MutationObserver does this). |

## Mobile differences
None of these controllers branch on viewport width in the reference; layout differences are CSS only (src).

## Not ported / differences
- SwiftShader "reduced motion" heuristic (see above).
- Per-language grammar downloads (loader flash on a first un-hovered tab click): grammars are bundled.
- `CodeEditorFileTabList` is not used on these pages.
- AnimatedCodeEditor/DevelopersCodeEditor: the reference script array is module-level and consumed once per page load; the port copies it per mount so remounts replay.
