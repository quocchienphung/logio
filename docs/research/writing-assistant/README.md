# Writing Assistant in the Guide me selector (Agent Chat frame)

The photo of the **Agent Chat** row in `/personalize?browse=1` is replaced by a working chat card rebuilt from the public preview at <https://www.affectui.com/components/writing-assistant> (observed 2026-10-20). Only the rendered public preview was observed: the component's code, install and usage examples are behind affectUI's Pro gate and were neither read nor used. Nothing is loaded from or sent to that site; the QA proves the page makes no request outside localhost.

## Taller reference layout — 2026-10-20

At the user's request, all four selector previews now share the public card's **380:401** proportions. A fresh read-only measurement of the rendered Clean preview found a 380 × 401 px card, a 61 px header, and a 340 px body. Only the preview was inspected; no installation command, gated source or site-generated prompt was used. Evidence: `resize/source-card.png` and `resize/selector-desktop.png`.

Typography uses a 380 px reference with a 1–1.25× cap (13–16.25 px chips), independently of frame height. Header, welcome, messages and composer align to a 16 px left inset at the base scale. The composer stays at the bottom, leaving the additional height for the greeting/conversation. All four groups retain their existing contents and navigation. Earlier compact-layout pixel comparisons below are historical, not measurements of this taller layout.

Validation: production build passes; Writing Assistant's 15 QA groups and Guide navigation's 11 QA groups pass. All 15 size/orientation samples have no horizontal overflow and chip text >= 13 px. Native-size comparison at 380 × 401 CSS px: welcome 0.83%, typed 1.01%, reply 1.25% differing pixels (`resize/comparison/results.json`, same viewport/DPR, glow frozen). Minor glyph/edge rendering differences remain; mobile behavior is emulated Chrome, not physical-device testing.

## Evidence

| Evidence | File |
| --- | --- |
| Page text/structure, screenshots of welcome, typing, writing, streaming, done, listening, multi-turn, grown field, hover, dark | `source-*.png`, `source-text.txt`, `source-dom.html` |
| The preview's own stylesheet (measurements only: tokens, geometry, keyframes, breakpoints) | `observed-rules.css` |
| Timings, replies, focus and disabled states | `states.json`, `behavior.json`, `simulated.json` |
| Probes (re-runnable) | `scripts/forensics/writing-assistant-inspect.mjs`, `-probe-css.mjs`, `-probe-states.mjs`, `-probe-behavior.mjs`, `-probe-dictation.mjs`, `-probe-simulated.mjs` |
| Pixel comparison reference vs ours at the same 300 x 255.5 px | `comparison/*` (`scripts/forensics/writing-assistant-compare.mjs`) |
| QA screenshots and per-size table | `qa/*` (`layout.json`, `results.json`) |

Measured and followed: white card, 10 px radius, hairline shadow; 61 px header (sparkle mark, name 13/500, tagline 12), New chat button that fades in once a chat exists; greeting 15/500; chips 4 x 10 px, 6 px radius; user bubble 10 px radius on 6 % ink; assistant text free; prompt row with a field that grows to four lines (28 -> 88 px) then scrolls, a mic and a Send that pops in only when there is text; three blurred pink/violet/blue blobs drifting 5.5-7 s that dim to 40 % once chatting; shimmering "Writing…" for ~700 ms, then one word every ~38 ms; the mic becomes a light-blue tile with three calm bars and a breathing ring while listening, the field turns read-only with "Listening…", words appear live (first at ~260 ms, then every ~170 ms), ~670 ms later the mic rests and ~450 ms after that the sentence is sent; mic disabled while a reply is on its way; Enter sends, Shift+Enter adds a line; reduced motion stops glow/shimmer and shows replies at once; dark theme tokens.

## Our code (all written from scratch)

| File | Responsibility |
| --- | --- |
| `src/components/sites/affectui-writing-assistant/WritingAssistant.tsx` | The card. Props like the reference: `name`, `tagline`, `greeting`, `suggestions`, `placeholder`, `respond`, `speech`, `dictation`, `className` |
| `useWritingAssistant.ts` | State machine: send, Writing beat, streaming, dictation (simulated or the browser's `SpeechRecognition`), cancel on New chat/unmount |
| `writing-assistant-model.ts` (+ `.test.mjs`, 12 tests) | Copy, timings, sample writer, message reducer |
| `writing-assistant.css` | Styles. `--k = clamp(1px, frame width / 380, 1.25px)` keeps text readable while the frame determines height |
| `src/components/sites/guide-navigation/*` | Frame integration, portrait/landscape layout |

Backend-ready: `respond(message, { signal })` may be async and cancellable; reject/throw shows the error line and the chat recovers. Texts/suggestions/dictation sentence are props (defaults in `defaultContent`). The built-in sample writer is a small keyword matcher of our own; the five measured prompts (four suggestions and the dictation sentence) get the replies observed on the preview, everything else a neutral "first draft" reply. Replace it with `respond`.

## Selector integration and responsive rules

- The Agent Chat frame is a live frame (`live: "writing-assistant"` in `navigation-model.ts`): the card fills the frame edge to edge, with a hairline and soft shadow. Typing, chips, mic and New chat work in place. The **Agent Chat row** still opens the page; photo frames keep their whole-frame link.
- **Aspect ratio is locked** at 380:401 for every group. At the desktop 1.5u scale, the frame is 384 × 405 px (480 × 506 device pixels at 1.25 DPR).
- **Portrait (<= 899 px wide) and all screens <= 639 px:** list above, frame below at full width. Wider landscape screens stay side by side; short landscape screens (`max-height: 560px`) permit vertical scrolling to preserve readable controls.
- While the field has focus, hovering rows does not pull the frame away; the card is `inert` and its animations paused while another group is selected, and keeps its conversation. At rest only the active frame is painted (prevents a sliver of the neighbouring frame at fractional offsets).
- Touch: bigger targets (34 px design), fields never below 16 px (no iOS zoom), a chip tap does not raise the keyboard.

Current text sizes and frame measurements are recorded in `qa/layout.json`; suggestion chips stay between 13 and 16.25 px across the tested viewports.

## Differences and decisions (assumptions are ours, listed honestly)

- Dictation defaults to **`simulate`** in the selector (a sample take; no microphone permission, no audio sent anywhere). `speech="auto"` is implemented (browser `SpeechRecognition`, falls back to the simulated take when absent, shows "Microphone unavailable" on error) and was verified with a stubbed engine, not with a real microphone.
- Pressing the mic again while listening **sends what was heard so far**; on the preview a manual stop did not interrupt the sample take (observed), we chose the behaviour the label "Stop dictation" promises. Starting dictation with text already typed replaces the draft, as the preview did.
- The Send button is disabled for blank text (the preview left it enabled and ignored the click).
- Reply text is streamed word by word but announced to screen readers once, when finished (the preview's list is a live region that updates per word).
- The card name "Quill / Your writing companion." and the welcome copy are the preview's; change them through props.
- The previous Agent Chat photo (`public/sites/guide-navigation/agent-chat.jpg`) is no longer referenced but left in place.
- Pixel comparison vs the reference (glow frozen, 300 px wide): welcome 0.5 %, typed 0.6 %, reply 1.2 % of pixels differ, all glyph anti-aliasing.
- The field's pixel height is re-measured on resize (ResizeObserver): a stale pixel height after rotation was found and fixed during the 2026-10-20 enlargement.
- Not tested: real devices (iOS Safari / Android Chrome); emulated touch, orientation and DPR in Chrome only.

## QA

`node scripts/qa/writing-assistant.mjs [base-url]` (15 checks: live frame, suggestions and measured replies, streaming, typing/growth/blank/busy, scroll, dictation, early stop and cancel, hover guard and inert, no navigation from the card, no external requests, 15 viewport sizes in both orientations, rotation, touch, reduced motion, keyboard/aria). `node scripts/qa/guide-navigation.mjs` was updated for the live frame (two photos, `.wra` excluded from the "no animations" and "no text" assertions). Unit tests: `node --experimental-strip-types --test src/components/sites/affectui-writing-assistant/*.test.mjs`.
