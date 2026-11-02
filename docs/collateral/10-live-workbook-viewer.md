# 10 · Live workbook viewer

2026-11-02. Route: `/personalize?section=excel-formation`, Review and fix. This supersedes the placeholder-bar/default-overview behavior and restrained popup entrance in 08/09.

- The inline stage defaults to readable source text, with native horizontal/vertical scrolling, a row/column address and actual worksheet dimensions. It displays all worksheets, including sheets unrelated to the correction profile and trailing empty rows declared in the workbook. Hidden source rows with values remain reachable and are marked in the gutter.
- Whole cell values cross the worker boundary without the former 120-character truncation. The full-value disclosure preserves arbitrary selected-cell text and line breaks. Go to cell accepts a valid in-bounds A1 reference; invalid input is marked without inventing cells. Empty cells remain empty.
- The detector's existing findings determine severity tints, corner flags, issue-strip markers and the selected location. Selecting another issue brings that row and column into view; a brief desktop spotlight points to its first recorded character mark. Back to issue returns after browsing other cells/sheets.
- Hover renders a small window of actual nearby cells at 2×–5× font size, with the lens following a spring. Buttons or Alt + wheel change zoom. It stays inside the sheet at edges. Touch users have native scrolling, cell selection and the full-value disclosure; they do not need a hover gesture.
- Clicking a cell, Expand file, Open fullscreen, or Enter/Space on the stage opens the popup. **The same live sheet DOM is moved into it**, so its selected sheet/cell and viewport survive. The existing live editor is also retained: drafts, word choices and exception reasons do not remount. Changes to frame size bring the selection into view.
- The popup grows from the inline slot and closes back into its freshly measured slot, using geometry sampled from the public Card to article preview. Escape, outside click, Close and a pull past the handle's dismissal threshold close it. Tab stays in the modal, document scroll is locked, focus returns on close, and reduced motion eliminates the travel. The underlying stage has no CSS visibility transition: the global reduced-motion transition override had otherwise delayed focus restoration.
- Original/suggested/draft controls continue to work. A value differing from the worker's current source is labelled **Preview · not applied**. Its old character offsets are not applied to new text. Only the existing approval action changes the worker's data; actual changes invalidate the row cache, and Undo reads current values again.
- The workbook remains inspectable when filters match no issue. A failed row/sheet read shows an error and Retry; a failed sheet change leaves the previous sheet visible.

Rows are read in 40-row chunks, at most 200 per RPC; the UI keeps at most 12 completed chunks, scopes pending responses to the correct sheet/edit epoch, and virtualizes readable columns/rows. Selected-cell chunks are also loaded so scrolling elsewhere does not blank the formula bar. Request keys are evicted with their values, fixing the old failure to reload an evicted region.

## Boundaries

This is a data viewer, not an Excel formatting/layout engine. It retains source string/numeric text (including leading zeros) and cached formula values; it does not recalculate formulas or reproduce Excel's custom number formats, merged-cell presentation, charts, images, column widths or print layouts. The original file's bytes and the existing XML-preserving export path remain in the worker.

The existing correction rules still scan the primary mapped worksheet. Other sheets can be inspected without becoming editable correction targets or acquiring fabricated findings. Errors are shown only when an existing rule reports them; this work does not claim that every possible spreadsheet error can be detected. Guesses remain evidence-based suggestions requiring reviewer approval.

No remote service, new dependency or persistent file cache was introduced. Real file content is not included in evidence screenshots, logs or documentation. Source and local motion evidence: [Card to article](../research/card-to-article/README.md).
