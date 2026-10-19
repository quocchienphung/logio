# Local navigation policy

Stripe reference navigation is local. Dashboard login/OAuth/signin destinations lead to `/login`; registration/signup destinations lead to `/signup`. Other Stripe destinations lead to `/unavailable/stripe/<host>/<path>`, which returns **HTTP 404** for GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS. It never redirects or forwards requests. Query strings and fragments from reference destinations are discarded, including nested return URLs.

Covered domains: `stripe.com` and subdomains, the live invoice demo on `stripedemos.com`, `stripe.link`, and the payment marketing actions on `link.com`. Existing local product pages keep their paths. Third-party partner links, displayed example text, research captures, icons and asset sources retain their contents.

The user requested removal of the newly built login experience. `/login`, `/signup`, `/forgot-password`, `/login/setup`, `/login/privacy` and `/api/auth/login` are now unimplemented and return the local framework 404. Sign in stays linked to `/login`; it never opens the real Stripe login. The temporary auth components, styles, logo and auth-specific scripts have been removed.

`stripe-destinations.json` records 749 literal/embedded destinations migrated across 162 source files. The migration covers JSX attributes, menu objects, embedded HTML cards, and embedded JSON navigation fields. Dynamic CRM domain cells and the invoicing controller's `window.open` also use the shared policy directly. The CRM seed still displays its original company domain.

Files:

- `src/lib/stripe-navigation.ts`: shared normalizer; handles URL-encoded reference destinations, protocol-relative URLs, browser-normalized hostnames and trailing dots.
- `src/components/navigation/StripeNavigationScript.tsx`: root-head bootstrap, sanitizes dynamically inserted anchor/form destinations and controller navigation data; no React client bundle. MutationObserver works before the next paint; pointer/focus/context-menu/submit capture provides an additional synchronous pass. Static markup is already rewritten so JavaScript is not required for reference links.
- `src/app/unavailable/stripe/[[...destination]]/route.ts`: standalone 404 destination, without a remote iframe or proxy.

Checks:

```sh
node --experimental-strip-types --test src/lib/stripe-navigation.test.mjs
node --experimental-strip-types scripts/forensics/localize-stripe-navigation.mjs --check
node scripts/qa/local-navigation.mjs http://localhost:3000
```

The first command covers domain/auth rules, URL variants, idempotence and preserving local/unrelated paths. The second audits navigation literals without changing files (run without `--check` to migrate newly captured markup and append its manifest). Browser QA visits every static app page with JavaScript disabled, then checks live menus/controller pages, injected dynamic anchors/forms, and 404 status/no Location headers for blocked and legacy encoded paths. Its successful report is written to `qa.json`.

This is an app navigation policy, not a browser/network sandbox: a user can still manually type an unrelated external address. It does not rewrite source text, download research or proxy Stripe.
