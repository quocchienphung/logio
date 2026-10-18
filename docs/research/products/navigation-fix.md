# Navigation regression fix — 2026-10-19

The Products menu broke on `/managed-payments`, `/billing`, `/billing/subscriptions`, and
`/billing/usage-based-billing`. Their captured CSS overrode the shared desktop `aside` with
`grid-column: span 4`. At 1677px, this moved More into the first four columns and pushed Payments and
Revenue down the fifth column. The menu grew from 692px to 1466px. Next's retained route styles also
carried the conflicting rules back to the homepage after clicking the logo.

The CSS builder's shared-class filter excluded BEM suffixes such as `navigation__content`. The
corrected filter includes BEM elements/modifiers and explicitly includes `navigation-menu-content`.
The four existing HDS outputs were re-filtered with that rule; each lost four navigation rules.
Product-specific footer CTA rules remain intact.

`Navigation.tsx` now resets its menu instance when the pathname changes, clears restored menus on
persisted `pageshow`, removes obsolete timers/portals, and preserves the previous inline scroll lock
when closing the mobile menu. Reopening mobile navigation cancels the previous close timeout, which
otherwise could unmount the new popup. Popup height follows resize/content measurements, animation
frames are canceled on cleanup, and desktop anchor coordinates account for document scroll. Escape
returns focus to the trigger without reopening the menu; outside clicks/focus close it.

The shared overrides also preserve desktop document height while the popup locks background
scrolling. Previously, the captured mobile `height: 100%` rules collapsed a partially scrolled
desktop document to one viewport: opening the menu changed `scrollY` from 24px to 0px, moved the
trigger away from the pointer, and closed the popup again. After the fix, `scrollY` remains 24px
and the popup top and navbar bottom both remain at 46px.

## Repeatable browser verification

Run against a production server:

```powershell
$env:BROWSER_CHANNEL = 'msedge' # Omit for Playwright's bundled Chromium; chrome is also supported.
node scripts/forensics/products/qa/nav-history.mjs http://localhost:3000
```

The regression exercises all 18 product destinations at 1677px and 390px through actual menu links,
the client-side homepage logo link, Back, and Forward. It checks rendered product column geometry,
one live portal, closed triggers, released scroll locks, and horizontal overflow. It also exercises
all four menus at 390/939/940/1024/1299/1300/1440/1677px, open-menu breakpoint changes, repeated mobile
close/reopen, rapid hover switches, outside clicks, keyboard Escape/focus, the persisted `pageshow`
handler, and popup placement with a partially scrolled header. The `pageshow` event is dispatched
explicitly to verify that handler; the Back/Forward route checks use real browser history.

Screenshots and the machine-readable result are in
[`docs/design-references/navigation-fix/`](../../design-references/navigation-fix/).

Validation: production build with Next.js 16.3.8, TypeScript, ESLint (zero errors, four existing
warnings), and 50/50 passing browser regression scenarios with no browser runtime errors.
