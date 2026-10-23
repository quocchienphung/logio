# Guide me touch navigation

Route: `/personalize?browse=1&group=sales`. Implementation: `src/components/sites/guide-navigation/`.

Homepage Guide me now enters `/guide`, a collaborative painting intro that automatically continues to `/personalize?browse=1`. See [intro reference, timing and QA](../guide-intro/README.md). Direct browse links retain immediate access to this selector.

## Touch fixes — 2026-10-20

- Previously, the page used `touch-action: pan-y` and recognized horizontal swipes only. A native vertical drag through the list produced `pointercancel` as the browser took over scrolling; touch's implicit pointer capture also prevented row `pointerenter` events from following the finger.
- The list now reserves single-finger drags with `touch-action: pinch-zoom`. Vertical dragging hit-tests the row under the finger with `elementFromPoint`. Pinch zoom remains allowed. Vertical gestures elsewhere on the page still scroll normally; horizontal swipes select the next/previous group, clamped at the ends.
- An inactive row selects immediately on touch contact. A fresh tap on an already selected row opens its workspace. Mouse hover/click and keyboard navigation retain their behavior.
- Drag clicks are suppressed until the next primary contact, replacing the old 400ms window. This prevents both delayed accidental navigation after holding a swipe and swallowed intentional taps immediately after it. Cancellation/multiple touches invalidate the gesture. Text fields, buttons and plan drag grips retain their own interactions.
- A WebKit regression reproduced a URL change to `?section=home` while the selector stayed visible after quick touch interactions. Re-dispatching `popstate` made the workspace appear. `PersonalizeApp` now reads Next's `useSearchParams` rather than depending on a synthetic `popstate` notification for its top-level route. Group URL changes no longer key/remount `GuideNavigation`, preserving ongoing gestures, focus and live-card drafts.
- Selection remains local during a gesture: a delayed URL acknowledgment cannot roll back a newer selection. Actual Back/Forward navigation restores the group from the current URL separately.

## Typography and spacing — 2026-10-22

Layout and type only; selection, hover, swipe, keyboard, the sliding bar and the strip animation are untouched (the bar still matches the active row's top and height; hover, keyboard and the strip index were checked on `?browse=1&group=skilled`).

- **Gap**: the words and the picture were side by side with nothing between them (the hairlines ran to the card's edge). The grid now has a 28-unit gutter (`--su` 433 → 494, list column 167 → 200), which also lets "Project Management" stay on one line. On phones the row gap between the list and the card is 28 units (was 20).
- **Alignment**: the `(01)` numbers were proportional, so each name started at a different x. The number is now a fixed 15-unit slot with tabular digits: every name starts on one line.
- **Font**: Inter as a variable font (weight and optical size, latin and Vietnamese) in `public/fonts/inter-*.woff2`, as `"Guide Inter"`, preloaded. The heading gets the display cut at its size, with its tracking relaxed from -.062em to -.038em plus a little word spacing, so "I can" no longer runs together; the list names use -.026em; "(SERVICES)" is medium weight with .06em tracking.

## Verification

Run `node scripts/qa/guide-touch.mjs [base-url]` for 15 groups of touch regressions. Chromium uses native CDP touch input (including actual scroll arbitration/cancellation). WebKit uses native taps; drag trajectories use DOM pointer events because Playwright exposes no native WebKit touch-move API. This is not a physical iPhone Safari test.

Evidence: `qa/touch-results.json`, `qa/touch-chromium.png`, `qa/touch-webkit.png`.

Related regressions: `node scripts/qa/guide-navigation.mjs`, `node scripts/qa/writing-assistant.mjs`. Full project checks: `npm run check`.

All 15 touch groups pass on both the development server and the production build. The 11 navigation groups and 15 Writing Assistant groups also pass. `npm run check` passes with seven existing lint warnings outside this change.
