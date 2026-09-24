# Products mega-menu → Payments + Revenue: reference map

Scope: the 18 entries in the Payments and Revenue columns of the Products mega-menu.

## Evidence status (2026-09-24)

| Source | Status |
| --- | --- |
| Menu labels, descriptions, hrefs | **Measured.** Captured from the live stripe.com navigation on 2026-09-17 (`docs/research/stripe-live/nav/menus.json`, `nav/products.html`, `nav/products-1440.png`). Already rendered by `src/components/stripe/Navigation/menus.ts`. |
| Final URL after redirect, locale | **Not verified.** stripe.com cannot be reached from this session: see below. |
| Page sections, copy, assets, geometry, typography, motion | **Not captured.** Same reason. Nothing is filled in from memory or search snippets. |

Network check from this session (2026-09-24):
- `curl https://stripe.com/managed-payments` → `CONNECT tunnel failed, response 403` (egress policy).
- Headless Chromium `page.goto` → `net::ERR_TUNNEL_CONNECTION_FAILED`.
- WebFetch → `EGRESS_BLOCKED (stripe.com)`.
- Same result for `b.stripecdn.com`, `images.stripeassets.com`, `web.archive.org`, `archive.org`.

Hosts the capture needs: `stripe.com`, `images.stripeassets.com` (images/video, 289 refs on the homepage),
`b.stripecdn.com` (JS/CSS bundles, which contain the WebGL shaders to port).

## Map

| # | Group | Menu label | Menu description | Live href (measured) | Final URL / locale | Local route | Status |
|---|---|---|---|---|---|---|---|
| 1 | Payments | Payments | Online payments | `/payments` | unverified | `/payments` | not built: blocked on reference |
| 2 | Payments | Managed Payments | Merchant of record solution | `/managed-payments` | unverified | `/managed-payments` | not built: blocked on reference |
| 3 | Payments | Payment links | No-code payments | `/payments/payment-links` | unverified | `/payments/payment-links` | not built: blocked on reference |
| 4 | Payments | Checkout | Prebuilt payment UIs | `/payments/checkout` | unverified | `/payments/checkout` | not built: blocked on reference |
| 5 | Payments | Elements | Flexible UI components | `/payments/elements` | unverified | `/payments/elements` | not built: blocked on reference |
| 6 | Payments | Payment methods | Access to 125+ | `/payments/payment-methods` | unverified | `/payments/payment-methods` | not built: blocked on reference |
| 7 | Payments | Terminal | In-person payments | `/terminal` | unverified | `/terminal` | not built: blocked on reference |
| 8 | Payments | Authorization Boost | Acceptance optimizations | `/authorization-boost` | unverified | `/authorization-boost` | not built: blocked on reference |
| 9 | Payments | Link | Accelerated checkout | `/payments/link` | unverified | `/payments/link` | not built: blocked on reference |
| 10 | Payments | Financial Connections | Linked financial account data | `/financial-connections` | unverified | `/financial-connections` | not built: blocked on reference |
| 11 | Revenue | Billing | Recurring revenue | `/billing` | unverified | `/billing` | not built: blocked on reference |
| 12 | Revenue | Metronome | Usage-based billing | `/billing/usage-based-billing` | unverified | `/billing/usage-based-billing` | not built: blocked on reference |
| 13 | Revenue | Subscriptions | Subscription management | `/billing/subscriptions` | unverified | `/billing/subscriptions` | not built: blocked on reference |
| 14 | Revenue | Invoicing | One-time or recurring | `/invoicing` | unverified | `/invoicing` | not built: blocked on reference |
| 15 | Revenue | Tax | Sales tax & VAT automation | `/tax` | unverified | `/tax` | not built: blocked on reference |
| 16 | Revenue | Revenue Recognition | Accounting automation | `/revenue-recognition` | unverified | `/revenue-recognition` | not built: blocked on reference |
| 17 | Revenue | Stripe Sigma | Custom reports | `/sigma` | unverified | `/sigma` | not built: blocked on reference |
| 18 | Revenue | Data Pipeline | Data sync | `/data-pipeline` | unverified | `/data-pipeline` | not built: blocked on reference |

Notes:
- Local routes mirror the live paths one-to-one, so the existing menu hrefs need no rewrite and a
  local ↔ reference comparison uses the same path on both sides.
- "Metronome" links to `/billing/usage-based-billing` in the captured menu, not to a `/metronome` path.
  Whether that page now redirects (e.g. to metronome.com) must be checked on the first capture.

## Capture procedure (ready to run once the hosts are allowed)

`scripts/forensics/product-pages.mjs` holds the 18 entries; `scripts/forensics/capture-products.mjs`
captures each page at 1440×900, 1280×800, 768×1024, 390×844 (DPR 1, en-US, cookie banner dismissed, fonts
loaded, lazy content swept) into `docs/research/products/<slug>/<vp>/`:
`meta.json` (requested URL, redirect chain, final URL, `lang`, loaded fonts, page size), `dom.html`,
`topology.json` (every header/main child/footer rect + background), `type.json` (computed font family,
size, weight, line-height, tracking, max-width, rendered line count of each text landmark), `full.png`
and `sections/NN.png`.

```
node scripts/forensics/capture-products.mjs                       # reference, all 18 × 4
node scripts/forensics/capture-products.mjs --base http://localhost:3000 \
  --out docs/design-references/products-local                     # same capture of the local build
```

The script was dry-run against the local dev server (18 slugs resolve, all outputs written) and against
stripe.com (fails with the tunnel error above).
