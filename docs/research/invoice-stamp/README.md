# Invoice stamp: "Mark as paid" as a pop-up that turns into a stamping scene

Where: Sales → Invoice → **Mark as paid** (toolbar; **Change stamp** once the invoice has one). Code: `src/components/sites/invoice/` (`StampStage.tsx` and the files named below). Evidence of the source recording: `storyboard/` (contact sheets of `docs/invoice.mp4`, 15 frames per second); evidence of this build: `qa/` and `qa/frames/`.

Nothing in the scene is a picture. The recording was only measured (positions, sizes, timings); the picker, the stamp, the paper, the shadow and the impression are DOM, CSS 3D and SVG built here. There is no screenshot, canvas, video or image in the pop-up, and the paper is the invoice's own sheet.

## What the recording shows (720 × 480, 8.9 s)

| Recording | What happens | Built as |
|---|---|---|
| 0.0 – 1.7 s | A date picker on a soft card: three wheels (day, month, year), a kind switch (Paid · Received · Approved · Due), five inks, one button. A pointer turns the day wheel from 13 to 15 | `DateWheel`, the picker controls |
| 1.73 – 2.07 | Press on the button; a ring shows the press | button press, no ring |
| 2.07 – 2.20 | The controls blur away in a tenth of a second; the card stays | chrome fade (0 → 0.11 s) |
| 2.13 – 2.40 | The page behind turns into the invoice, huge and soft; the card grows a thick body and a black rubber base; the camera pulls back | paper zoom 3.2 → 1.0, blur only in the first 0.3 s |
| 2.53 – 2.87 | The camera drops to about 44° in three or four frames (decisive, not eased), onto a grey table lit from above | tilt 0 → 46° in 0.3 s, table gradient |
| 2.87 – 3.27 | The stamp hovers high over the paper at the top right; a soft shadow lies on the paper | hover, shadow of the housing |
| 3.27 – 3.33 | The stamp drops onto the lower right of the paper in one frame | `slam` ease, 80 ms |
| 3.33 – 3.47 | It stays down for about 0.14 s | held, the housing presses into the sole |
| 3.47 – 3.53 | It lifts, and the impression is there at once: red double frame, "PAID" over the date, ink still wet and soft | ink opacity 0 → 1 in 20 ms, wet halo fading in 0.5 s |
| 3.6 – 4.0 | The stamp rises to the top and stays; the impression dries sharp | hover (lift 150), slight breathing |
| 4.07 – 4.2 | A pill appears: "Marked as paid · 15 Sep 2026", Undo, Done | toast |
| 4.7 – 5.1 | Done is pressed; the pill goes | `Done` → clip B |
| 5.4 – 5.7 | The stamp leaves upward; the paper straightens | stamp lifts out, tilt 44° → 0 |
| 5.7 – 6.3 | The paper settles flat and smaller; the backdrop turns light again | paper 0.54 → 0.5, table → flat |
| 6.3 – 6.8 | Two buttons come up: Download PDF, Next invoice | final buttons (after the paper has stopped) |

Left out on request: the small caption lines of the recording (the customer name and amount, the invoice title above the card, "Choose the payment date…", "or press Enter", "Marked as paid on …"). The pill's own text stays because it carries Undo and Done.

Measured from the frames: the paper's edges at 2.53 – 2.87 s were fitted to a perspective model (perspective 860, paper scale 0.59, tilt 44 – 48°); the fit puts the impression at the same place on screen as in the recording. The camera path, the stamp's path and every moment above are keys in `stamp-timeline.ts`.

## After the first version: what was wrong and what changed

1. **The stamp was not a solid.** The first version stacked flat 2D layers (a card, a gradient, a dark bar) in screen space. Now it is a CSS 3D solid in the same camera as the paper (`Stamp3D.tsx`, `stamp-geometry.ts`): a **die** that prints (213 × 75 units, the size of the impression), a wide black **rubber sole**, and a **housing** with the picker on its top face. Each body is a pile of slices of a rounded rectangle, so under the perspective it reads as one extruded body with real sides. Its top face lies parallel to the paper, so as the camera tilts the card foreshortens with the paper and the sides come into view. Height above the paper (`lz`) drives the drop, the press and the shadow.
2. **The paper was not the invoice.** It was drawn separately from the page. Now it is `InvoiceSheetBody`, the markup extracted from `InvoiceBlock` and used by both the preview and the scene, laid out by the same stylesheet at its real width (748) and scaled onto the A4 paper. Change a line item and the paper changes.
3. **It looked soft.** The paper had `will-change` on a layer that was scaled up to 3×, so the browser drew it once and enlarged the bitmap. No scaled layer has `will-change` now (the QA asserts `auto`), blur is limited to the first 0.3 s of the zoom (8 px at most), shadows are tighter, and the ink texture is milder.
4. **The picker looked like another product.** The face and the controls now use the invoice page's own tokens and parts: white panel with a hairline, grey tray, white pill for the chosen row, the segmented control with a sliding thumb, the dark gradient button. Only the face of the stamp changed; the impression it prints is as before.
5. The stamped sheet gets room under its totals, so the impression never covers a figure.

## Files

| File | What |
|---|---|
| `StampStage.tsx` | The pop-up: portal over the page, picker, scene, toast, final buttons; keys (Enter, Escape, Tab trap), focus, announcements, reduced motion; `stamp-seek` test hook |
| `stage-clock.ts`, `stage-paint.ts` | A plain clock (`pick → play → hold → exit → final`, and `rewind` for Undo) and the painter that writes a pose to the elements every frame |
| `stamp-timeline.ts`, `stamp-geometry.ts` | The scene as a pure function of time (`poseAt`); the stamp's measures |
| `Stamp3D.tsx` | The stamp solid |
| `DateWheel.tsx` | One wheel: drag with a flick, mouse wheel, tap a neighbour, arrows, Page Up/Down, Home/End; a spinbutton |
| `StampMark.tsx`, `invoice-stamp-model.ts` | The impression (SVG, one filter for rough edges and uneven ink, seeded by the stamp) and the rules (kinds, inks, dates that exist, `InvoiceStamp`) |
| `InvoicePaper.tsx`, `InvoiceBlock.tsx` | The paper (the real sheet) and the shared `InvoiceSheetBody` |
| `invoice-stamp.css` | Look and 3D |

## Behaviour

- **Picker**: wheels for day, month, year (a short month pulls the day back), the weekday line, kind and ink (each kind has its own default ink), one button named for the kind. Enter stamps; Escape closes; a click outside closes.
- **Scene** (about 2.1 s): described above. Escape during it jumps to the hovering stamp; Enter or Escape at the hover is Done. **Undo** plays the scene backwards at 1.7× to the picker and takes the stamp off the invoice (or back to the one it had). The stamp is put on the invoice at the moment it is set down, so the invoice shows as unsaved; **Save draft** stores it with the invoice (`InvoiceData.stamp`, optional, validated on load and import).
- **Final**: Download PDF opens the print layout, which carries the stamp (kind, date, ink); Next invoice closes the scene and starts a new invoice (asking about unsaved changes like any other change). Closing leaves the stamp on the invoice sheet, and a badge ("Paid · 22 Oct 2026") in the page heading.
- **Reduced motion**: no flight. The finished paper with its impression appears at once, with Undo, Download PDF and Next invoice.
- **Phone**: the scene scales to the width, the controls under the stamp are real pixels (finger-sized on touch).
- **Dark mode**: the picker and controls follow the theme; the paper stays paper.

## Verification

`npm test` (the model and the timeline: dates, kinds, easing, ink only on contact, continuity between clips, no jumps at 60 fps); `node scripts/qa/invoice-stamp.mjs` (22 checks: picker, wheels by wheel / keys / drag / tap, kinds and inks, the scene in real time and at exact moments, Undo and Done, print, save and reload, Next invoice, keyboard and focus, reduced motion, dark, phone, WebKit, no console errors). Frames of the scene at the recording's key moments: `qa/frames/`.

Not covered: a physical iPhone; a very long invoice in the scene (its paper shows the sheet at A4 height, so lines past it are cut off there; the invoice itself is not).
