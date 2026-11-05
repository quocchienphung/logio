# AI translate (clone, no longer on the Flip page)

Source: the open preview of UIArc's **AI translate** (Pro); rendered page only. Code: `src/components/sites/flip/AiTranslate.tsx`, `ai-translate.css`, kept as a finished clone.
The first Flip layout used it to flip the first rows into a chosen delimiter; it was replaced by the TL;DR toggle (the card the user asked for) and is not mounted now.

Measured: the original dims to 45% over 200 ms; the translation arrives in chunks every 34 to 35 ms with a 140 ms fade, sentence by sentence (each sentence retires as its replacement
starts); the card's height follows on a 0.24 s spring; a whole swap fades 100 ms out and 160 ms in with a 2 px rise; the language menu opens with scale .98 over 150 ms and closes in 100 ms;
results are cached per language, Retry after a failure. Not cloned: the model, and the Radix menu (own menu).
