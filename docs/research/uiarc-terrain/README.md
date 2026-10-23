# Activity terrain on /skilled

Added 2026-10-22 under the Skilled workspace (after the skill library and the realtime stream). Source of the idea: the public preview <https://uiarc.dev/components/blocks/activity-terrain> (a Pro block of UIArc; its source and install are gated, its preview is open). Everything here was **measured from what that preview draws in a real browser**: no UIArc API, registry, CLI, MCP, downloaded bundle or Pro source was used, and no screenshot is part of the implementation.

Code: `src/components/sites/skilled/terrain/` (mounted by `Skilled.tsx`). QA: `node scripts/qa/terrain.mjs` (53 checks). Unit tests: `terrain.test.mjs` (13), fixtures in `fixtures/`.

## What it is

*The shape of your week*: the workspace's operations, deliveries and errors by hour (7 days x 24 hours) as a 3D terrain on a 2D canvas that you can orbit (drag, with momentum), zoom, fly into (click a column, Enter, or a peak hour), and flatten into a heatmap. A panel follows the hour under the pointer, a summary sits beside it (total and change on last week, three peak hours, busiest day), and every figure rolls like the preview's counters.

Data is the workspace's own recorded operations (`skill-events`): **Operations** (every event), **Deliveries** (successful exports and transfers), **Errors** (failures), counted by hour of the workspace clock (UTC+7, as the rest of the page) for the current Monday-Sunday week, with the week before as "last week". Nothing is invented: with no events the terrain is flat and says so. While there are none, a **sample week** (the preview's own demo numbers, `Sep 14 to 20, 2026`) is shown, labelled as a sample, so there is something to explore; the "Your activity / Sample week" switch is always available.

## Method (the clone engine)

The preview paints a 2D canvas with plain polygons, so the whole scene can be read from its *output*:

1. `scripts/forensics/lib/canvas-trace.mjs` wraps `CanvasRenderingContext2D` and `requestAnimationFrame` before the page loads and records, per frame, every polygon (with fill and stroke), label, line, dash, pill and the input events that caused it. Only output is recorded.
2. The polygons give back the camera: `uiarc-terrain-series.mjs` fits a pinhole orbit camera to the platform quad of **every frame** (rms 0.01-0.06 px). From the series, springs, delays and limits were fitted (`uiarc-terrain-spring.mjs`, `-wavefit.mjs`, `-tune.mjs`, `-scan.mjs`).
3. Scenarios were driven with real input at 1440 px, 390 px (touch), 1920 px, dark, reduced motion: load, metric changes, flatten and back, drag slow / flick / vertical / to the limits, zoom keys and ctrl+wheel, Shift+arrow orbit, hover sweep, fly to 15 columns, from rest and from an orbited yaw (`uiarc-terrain-capture.mjs`, `-dom.mjs`, `-behaviors.mjs`, `-data.mjs`, `-tokens.mjs`, `-css.mjs`).
4. Declared CSS, resolved tokens and DOM of the block (`source/`), its public documentation (`docs.txt`) and the sample week with last-week values (`source/sample-data.json`, read by stepping through every hour with the keyboard) complete the picture.
5. The local engine is validated against those recordings: polygon for polygon (`uiarc-terrain-render-compare.mjs`), camera and columns frame by frame (`uiarc-terrain-sim.mjs`, `-columns-sim.mjs`), and end to end in a browser (`uiarc-terrain-compare.mjs`).

Raw traces are large (about 25 MB each) and stay out of the repository; `fixtures/` keeps the small slice the tests need (about 640 KB).

## What was measured, and where it lives

| Measured from the preview | Value | Where |
| --- | --- | --- |
| Grid | 24 x 7 columns, 0.8 of a cell wide, platform 0.29 cell wider on every side | `terrain-constants.ts` |
| Height | value / busiest hour of the shown metric x 5.377 grid units, linear | `terrain-columns.ts` |
| Faces | top, one of west/east, one of south/north (back-face culled); brightness 1 / 0.87 / 0.67 / 0.85 / 0.67 of the top colour; 0.6 px stroke of the same colour; painter's order far to near | `terrain-draw.ts`, `terrain-colors.ts` |
| Colours | cubic fits per theme and tone (grey, danger) of the top face against its share of the peak; legend ramp from the same curve | `terrain-colors.ts` |
| Camera | pinhole at 41.985 units, rest yaw -32.008 deg (compact canvases -50.03), pitch 31.02; intro starts steep (-5.99, 76.7) | `terrain-camera.ts` |
| Framing | scale and pan fit the scene's bounding box at the current pitch (rest yaw), cap 20.65 px per unit, paddings and centring depend on pitch and grow slowly with canvas height | `terrain-math.ts` |
| Orbit | 0.3187 deg per px, 6 px threshold before a press becomes a drag, momentum decays at 3.2 per second, pitch limits 11.14 to 84.6 (rubber-band to 2.4 / 90, springs back) | `terrain-pointer.ts`, `terrain-camera.ts` |
| Zoom | x1.25 per key, ctrl+wheel/pinch exp(-deltaY/100), 0.7 to 2.8, about the point where the pivot (0, 0.87, 0) sits | `terrain-math.ts` |
| Fly | angles kept, scale x1.5, shifted 7 px down, pivot at the column's foot rising by half of its height above 1.7 units; in 4.5 rad/s, out 5.75 | `terrain-constants.ts` |
| Flatten | yaw, pitch and distance blend with one spring (5.76 rad/s); scale and pan follow measured arcs, different each way (pull back 0.55 on the way down, swoop in 1.54 on the way up); columns fold flat after 0.1 s | `terrain-constants.ts` (`FLIGHT_DOWN/UP`) |
| Columns | critically damped springs: 6.43 rad/s with a 34.5 ms delay per step of hour + day on load, 12.39 rad/s and 11 ms per step on a metric change | `terrain-columns.ts` |
| Highlight | two 5 % ground bands, two guide lines (55 %), solid and dashed 3-3 outline, dark label pills with white text, neighbouring labels hidden | `terrain-draw.ts` |
| Panel | 208 px, 22 px right of the column (flips left near the edge), 71.3 px above its top-face centre, above the column when it is low in the plot; follows with a 12 rad/s spring; day, hour, value, last week, change, share, 24-hour sparkline | `terrain-engine.ts`, `ActivityTerrain.tsx` |
| Keys | arrows move hour/day, Home/End ends of the day, Enter/Space fly, Escape: whole week then clear, Shift+arrows orbit (15 deg, 7.84 deg), + and - zoom; focus highlights the busiest hour | `terrain-engine.ts` |
| Layout / type / tokens | declared CSS of the block (grid 1fr + 224 px, 880 px and 560 px steps, plot clamp(280, 44cqi, 460), segmented control, counters) | `activity-terrain.css`, `Segmented.tsx`, `AnimatedNumber.tsx` |

## Verification

Run on 2026-10-22 (Chrome and WebKit, this machine).

* **Polygons**: at the rest pose the local renderer produces the same number of polygons as the preview (505, 498 and 481 in the three states checked, culling included); vertices within 0.5 px (mean 0.25), colours within 2.7 levels on average; labels within 1 px.
* **Camera** (platform corners over every frame, px mean / max): intro 1.0 / 5.8, flatten 0.95 / 3.8, back 2.8 / 20, slow drag 0.6 / 1.0, vertical drag 1.4 / 2.7, zoom keys 1.0 / 3.2, fly in 1.4 / 3.3, fly out 0.4 / 1.0, metric change 0.4-0.6 / 0.7, limits 2-3 / 4-9, keyboard orbit 3.4 / 12. A hard flick lands about 6 % short (mean 20 px): the release velocity estimate of a handful of coalesced events is not known.
* **Columns**: mean 0.007-0.009 grid units (0.1 px) on load and metric change, worst 4-5 px.
* **End to end** (`compare.json`, the block narrowed so its plot is 622 x 291 like the preview's at 1440 px, platform corners over every frame, px mean / max): intro 1.8 / 5.8, metric changes 0.9-1.2 / 1-3, flatten 1.3 / 4.7, zoom keys 2.3-2.5 / 5-8, back to perspective (the largest flight) 4-9 / 19-21 depending on the frame rate the browser achieved that run. Dragging is not compared here (Playwright cannot pace pointer events like the recording and momentum scales with speed); the recorded drags are replayed against the camera in node instead. The last frame of each run sits about 1 px from the recording because the two canvases differ by under a pixel.
* **Idle**: with nothing moving the loop draws zero frames; offscreen and in a hidden tab it pauses; reduced motion lands every change in one frame.
* `npm test` 312 pass (13 for the terrain); `node scripts/qa/terrain.mjs` 53/53 (desktop, keyboard, real and empty data, reduced motion, dark and the workspace's theme switch, phone 390, WebKit, no console errors); `node scripts/qa/skilled.mjs` 27/27 still passes; lint, typecheck and production build are clean.

## Differences and limits (honest)

* **Not a copy of private source**: spring constants, framing rules and arcs are fitted to behaviour; where the preview's internals are unknown the nearest measured rule is used. The vertical placement of the framing at pitches other than the measured ones (11, 31, 39, 72, 85 deg) is interpolated; on a phone it sits within about 1 px of the recording at rest, but only that pose was recorded. The hover panel's placement matches every settled position recorded (beside the column, or above it when low), but the exact threshold between the two is inferred from a handful of cases.
* Colours of the preview come from `color-mix` and the browser's gamut mapping; the local curves are cubic fits (within 1-3 levels), so a column can differ by two or three greys.
* Working hours in "busiest day" are 09:00-18:00 of the workspace clock; the preview's own definition could not be recovered (its 70.8 % does not match any whole-hour window of its table).
* The preview's `Fullscreen` view and canvases wider than 742 px were not recorded, so very wide blocks use the same rules scaled by height (cap and bottom padding) and are unverified against the preview. Touch pinch and a physical iPhone were not tested; touch orbit (sideways) and the layout were exercised with emulation.
* No operations are simulated: with no recorded events the terrain is flat (or the labelled sample week).
