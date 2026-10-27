# Docked settings panel: motion learned from UIArc's AI side panel

Source of the idea: the public preview of UIArc's **AI side panel** (`https://uiarc.dev/components/blocks/ai-side-panel`). Only the rendered
page was read: its DOM and declared CSS (`source/panel-structure.json`, `source/declared-styles-all.css`) and **frame-by-frame recordings of the
panel closing and opening** (`source/motion-*.json`, collected by `scripts/forensics/ai-side-panel-motion.mjs`). No API, registry, Code tab,
bundle or prompt was fetched and no source was copied: the implementation is written from the recordings.

## What the recordings show

* The assistant panel is a fixed 360px column on the right of the block. It is **docked**: closing it does not fade it, the page column takes
  the width back (the column's width changes on every frame), and the panel's content never changes size or opacity while it moves.
* The only thing that moves is the panel's left edge (and with it the page column): 360px of travel in a **critically damped spring** — no
  overshoot, 90% of the way after ~240ms, 99% after ~475ms. Opening and closing are the same curve in opposite directions.
* The floating "Assistant" re-open button fades out in ~75ms while it opens and in over ~100ms while it closes.

`scripts/forensics/ai-side-panel-fit.mjs` fits a spring (mass 1) to the three recordings: **stiffness 300, damping 37** (damping ratio 1.07),
rmse 0.0056 of the travel (about 2px). Result in `source/spring-fit.json`.

## What it became here

The Process page's settings panel (block inspector) used to appear instantly over the map. Now:

* The panel is docked: it slides in by its own width plus margins (372px) with that spring, and **the map is pushed over by half of it** (the
  visible part of the page loses 372px, so what you were looking at stays centred in what is left). The Tree view makes room with the same
  value (`padding-right`). Closing returns everything the same way and then removes the panel from the page.
* One animated number (`reserve`, a motion value in `ProcessPage.tsx`) drives all of it: the panel's `x`, the task list's padding and the map.
  Nothing re-renders per frame: the map reads it as a CSS variable (`--push`, written straight to the DOM for the stage, the grid, the link
  pills and the notification stars) and folds it into its view once the motion has stopped, in the same commit that removes the variable.
* The spring starts when the browser is idle (at most ~90ms after the click), because mounting the settings is the slow part and it would
  otherwise land in the middle of the motion. Reopening mid-way continues from where the panel is. While it leaves, the panel is `inert`.
* Reduced motion (or Interface motion off) skips the animation. Phones keep the settings dialog.
* "Reveal" (bringing a block that was just opened into view) counts the push that has not happened yet, so a block under the future panel is
  not covered.

## Clearer text when zooming the map (same pass)

Blocks looked soft when zoomed in. Two causes were removed, no logic changed:

* Every block, `+` handle and notice kept a *finished* `animation-fill-mode: both` entrance animation (`agt-rise`, `agt-pop`, `notice-pop`).
  A transform animation that never goes away keeps each block on its own compositor layer with a fixed raster scale, so the text is stretched
  bitmap after a zoom. The entrances now use `backwards` (the end state is the natural state), so nothing is left running:
  `document.querySelector('.pmap').getAnimations({subtree:true})` is empty when the map is idle.
* The map stage had a permanent `will-change: transform` (same effect on the whole map). It is now only set while the background is being dragged,
  and the stage is moved by whole device pixels.

## QA

* `node scripts/qa/ai-side-panel.mjs [base-url]` records our panel and map on every frame and compares them with the recordings from the
  public preview (opening and closing), checks the push (186px), the Tree view, reduced motion and the phone dialog. Screenshots in `qa/`.
  Run it on a production build (`npm run build && npx next start -p 3002`) for frame times that mean something: the dev server renders React
  in development mode and drops frames.
