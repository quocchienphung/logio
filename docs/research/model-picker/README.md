# Model picker

Rebuilt from the public preview at <https://www.affectui.com/components/model-picker> (observed 2026-10-20) and mounted in the New chat composer in place of the old Auto / Claude / ChatGPT / Gemini dropdown. Only the rendered public preview was observed: the component's code, its install and usage examples are behind affectUI's Pro gate and were neither read nor used. Nothing is loaded from or sent to that site; the QA proves the page makes no request outside localhost.

## What was observed, and where it is

| Evidence | File |
| --- | --- |
| Page text, structure, the open preview, state screenshots | `source-page.png`, `source-text.txt`, `source-demo-initial.png`, `source-hover-*.png`, `source-thinking-on.png`, `source-closed-*.png` |
| Public preview stylesheet rules and DOM (reference for measurements only) | `observed-rules.css`, `demo-open.html`, `source-dom.html` |
| Probes: `scripts/forensics/affectui-model-picker-inspect.mjs` (page), `-probe-dom.mjs` (keyframes, hover, click), `-probe-states.mjs` (hover, footer roll, bar fill, geometry), `-probe-keyboard.mjs` (keys, focus, effort), `-probe-behavior.mjs` (pointing, Esc/Space, effort multipliers, bar animation) | run them to regenerate |
| Computed-style comparison, reference vs rebuild | `comparison/computed-styles.json`, `comparison/reference-open.png`, `comparison/local-open.png` |

Measured behavior that the rebuild follows: 320 px menu with 4 px padding, 28 px header, 48 px two-line rows, 136 px bar block (three 40 px meters of five 2 px-gapped segments, 4 px tall), 32 px switch rows, 36 px footer outside the padded card; open = 200 ms fade + 320 ms soft scale from the trigger corner (close 160/220 ms), the chevron turns 300 ms, the bulb unfolds 360 ms; pointing at a row steps the other rows back to 55 %, fills its segments in the accent color with a delay of `meter x 70 ms + segment x 45 ms` and a 360 ms pulse; the footer rolls first-token time and price (ease-out, about 380 ms) and crossfades with a 2 px blur between figures and text; the Effort row unfolds in 420 ms and its highlight slides 220 ms; thinking multiplies the first-token time by 1.6 / 2.5 / 4. Keyboard: Enter, Space or Down on the trigger opens and focuses the list; arrows wrap, Home/End jump, Enter/Space pick and return focus to the trigger; Tab goes list, Extended thinking, Effort (one tab stop, arrows wrap and select), Web search; leaving the menu with Tab, an outside press or Esc closes it. Hovering or focusing Web search shows what it does in the footer.

## Our code (all written from scratch)

| File | Responsibility |
| --- | --- |
| `src/components/sites/affectui-model-picker/ModelPicker.tsx` | The component: trigger, native-popover menu (top layer, so no parent can clip it), keyboard, pointing, switches, effort, footer; controlled or uncontrolled props like the reference (`models`, `value`, `thinking`, `webSearch`, `effort`, `open`, `align`, `side`) plus `features` and `disabled` |
| `model-picker-logic.ts` | Pure rules: ratings, effort factors, caption and spoken text, wrap-around keys, menu placement (unit tested) |
| `useTween.ts`, `Swap.tsx` | Rolling figures and the crossfade |
| `model-picker.css` | Styles. Every color, the accent and the easing are custom properties on `.mp`; dark mode follows `.dark` or `[data-theme="dark"]` |
| `src/components/sites/affectui-assistant/assistant-models.ts` | The model list used by the composer |
| `useAssistantChat.ts`, `assistant-api.ts`, `assistant-types.ts` | `thinking` and `effort` saved with the composer preferences and sent with each message (see `../affectui-assistant/api-contract.md`) |

Differences from the reference, on purpose: the menu opens above the trigger when it has more room there (the composer sits at the bottom once a chat starts) and its model list scrolls, with faded edges, when the window is too short for nine rows; the effort highlight and footer figures follow the same measurements but are our own implementation; rows use the provider mark from the assistant icon set instead of a letter; text such as "Looks things up on the web when it helps" is reused from the preview.

## Data you should check

The model list is `assistant-models.ts`. Read the comment there before trusting it:

- Speed / quality / cost bars (1-5) are this product's own relative ratings, as requested, not published benchmarks.
- First-token time and price per million output tokens are indicative values from third-party summaries of provider price lists (Claude: Fable 5.1 $50, Opus 5.5 $20, Sonnet 5.5 $10, Haiku 5.5 $0.50). The OpenAI names, ids and prices come from third-party lists that disagree with each other and are unverified. Gemini has ratings but no latency or price. Edit the file to match your plans and backend.
- The `id` of each model is what the chat API receives in `model`.

## QA

`node scripts/qa/model-picker.mjs [base-url]` (14 checks: replaced dropdown, geometry, hover fill and rolling figures, selection and persistence, keyboard and focus, thinking and effort, Web search shared with Plugins, legacy ids, chat payload and flip above in chat mode, scrolling in a short window, touch, dark theme, reduced motion, no outside requests). `node --experimental-strip-types --test src/components/sites/affectui-model-picker/*.test.mjs src/components/sites/affectui-assistant/*.test.mjs` for the unit tests. `node scripts/forensics/affectui-model-picker-compare.mjs` repeats the style comparison with the reference.
