# Ghost text (clone for Flip)

Source: the open preview of UIArc's **Ghost text** (Pro). Rendered page only: DOM, declared CSS, docs, and a recording of the preview's own autoplay (it answers only scripted
contexts, so typing into it could not be recorded). Code: `src/components/sites/flip/GhostText.tsx`, `ghost-text.css`. Evidence: `source/`; scripts `scripts/forensics/ghost-text-*.mjs`.

Measured: the pause before asking 450 ms (at least 3 characters); the ghost fades in over 140 ms and out over 110 ms; accepting merges over 200 ms; the chip goes idle, loading (about
480 ms), ready, accepted (1 s), idle, crossfading in 100/160 ms with a 200 ms width tween; a key cap presses in 50 ms and returns on a 580 ms spring; the field's height follows its
text on a 180 ms tween. The ghost lives in an aria-hidden mirror with the field's exact metrics behind a native textarea (spellcheck, IME and undo stay native).

Inferred: the chip's error state and the wording of the announcements. Not cloned: the model behind it; `suggest` returns whatever the caller computes.

Flip's use: `suggestName()` completes the output file name from the workbook's own names (its file name, its sheets) and adds the extension of the chosen format; nothing is
generated. **Tab is not the accept key here**: bare Tab opens the command palette app-wide (`command-palette/CommandPalette.tsx`, a capture handler that swallows it), so the
component has an `acceptKey` ("Tab" by default as in the preview) and Flip passes `"ArrowRight"` (Command or Control + Right Arrow still takes one word, Escape dismisses).
