# Generation stats (clone for Flip)

Source: the open preview of UIArc's **Generation stats** (Pro). Rendered page only (DOM, declared CSS, docs, recordings of its run, details panel and copy). Code:
`src/components/sites/flip/GenerationStats.tsx`, `generation-stats.css`. Evidence: `source/`; script `scripts/forensics/generation-stats-timeline.mjs`.

Measured: four cells split by hairlines whose numbers count up in tabular numerals (a glide of about 100 ms per step, a drop cuts straight to the new value), one with a sparkline;
a Details panel that opens on a critically damped spring (about 0.26 s) with a 160 ms fade, a latency bar and a table with a caption and headers; the status label crossfades; the check
draws once; Copy puts the figures on the clipboard as JSON; container queries at 600 px and 440 px.

Not cloned: the LLM-specific fields (usage, pricing, tokens per second). The component shows what it is given and invents no reading.

Flip's use: only real figures of the opened workbook (read time, rows, cells, size, and a table per sheet). The output's own time and size are not shown until there is an output.
