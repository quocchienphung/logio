# Products mega-menu → Payments + Revenue: reference map

Scope: the 18 entries of the Payments and Revenue columns of the Products mega-menu, each page from header to
footer with its on-page interactions. Links out of these pages (docs, dashboard, other products) are out of scope
and point at their absolute stripe.com URL.

## How the evidence was obtained (2026-09-24)

| Source | Status |
| --- | --- |
| Menu labels, descriptions, hrefs | **Measured** from the live navigation markup captured 2026-09-17 (`docs/research/stripe-live/nav/menus.json`) and rendered by `src/components/stripe/Navigation/menus.ts`. Re-checked on 2026-09-24: the legacy pages' server-rendered `SiteHeader` lists the same 18 labels, descriptions and hrefs (the HDS pages build their menu client-side, so their HTML has none). |
| Final URL, redirects, locale | **Measured** with `curl -L` (TLS verified) on 2026-09-24: all 18 return HTTP 200 with no redirect, `lang="en-US"` (`_raw/fetch-log.tsv`). No entry links to another domain. |
| Page markup, copy, class names, inline styles | **Measured**: the server-rendered HTML of every page (`_raw/<slug>.html`). |
| CSS, JS, images, fonts | **Measured**: every stylesheet, script and asset the pages reference was downloaded (1,609 files) to an out-of-repo mirror; lazily-loaded chunks were discovered from the JS and fetched too. Localized copies live in `public/sites/stripe-com-9ababc9a/products/`. |
| Rendered reference (screenshots, computed styles) | **Partially available.** The session's sandbox policy blocks headless Chromium from loading stripe.com, and later also blocked the local offline replay of the mirror. Before that block, three renders were captured (`docs/design-references/products/managed-payments/reference-static-1440-full.jpg`, `…/payments/reference-static-nojs-1440-full.jpg`, `…/payments/reference-replay-partial-1440-full.jpg`). Other pages have no rendered reference; their layout comes from the reference's own markup + CSS, and motion from the reference JS source. |

Two rendering stacks exist on stripe.com today:
- **hds** (Next.js, same design system as the homepage): Managed Payments, Billing, Metronome (usage-based billing), Subscriptions.
- **v1** (legacy "mkt-statics-srv" pages with `data-js-controller` behaviours): the other 14.

## Map

| # | Group | Menu label | Menu description | Live href | Fetch result | Local route | Stack | Components | Sections |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Payments | Payments | Online payments | `/payments` | 200 · 0 redirects · `https://stripe.com/payments` · lang `en-US` | `/payments` | v1 | `src/components/sites/stripe-com-9ababc9a/payments-2686bdb4/` | 16 |
| 2 | Payments | Managed Payments | Merchant of record solution | `/managed-payments` | 200 · 0 redirects · `https://stripe.com/managed-payments` · lang `en-US` | `/managed-payments` | hds | `src/components/sites/stripe-com-9ababc9a/managed-payments-11a73331/` | 11 |
| 3 | Payments | Payment links | No-code payments | `/payments/payment-links` | 200 · 0 redirects · `https://stripe.com/payments/payment-links` · lang `en-US` | `/payments/payment-links` | v1 | `src/components/sites/stripe-com-9ababc9a/payments--payment-links-fb118718/` | 10 |
| 4 | Payments | Checkout | Prebuilt payment UIs | `/payments/checkout` | 200 · 0 redirects · `https://stripe.com/payments/checkout` · lang `en-US` | `/payments/checkout` | v1 | `src/components/sites/stripe-com-9ababc9a/payments--checkout-7bae78ae/` | 15 |
| 5 | Payments | Elements | Flexible UI components | `/payments/elements` | 200 · 0 redirects · `https://stripe.com/payments/elements` · lang `en-US` | `/payments/elements` | v1 | `src/components/sites/stripe-com-9ababc9a/payments--elements-8f3d1dbd/` | 11 |
| 6 | Payments | Payment methods | Access to 125+ | `/payments/payment-methods` | 200 · 0 redirects · `https://stripe.com/payments/payment-methods` · lang `en-US` | `/payments/payment-methods` | v1 | `src/components/sites/stripe-com-9ababc9a/payments--payment-methods-eb76b3d3/` | 10 |
| 7 | Payments | Terminal | In-person payments | `/terminal` | 200 · 0 redirects · `https://stripe.com/terminal` · lang `en-US` | `/terminal` | v1 | `src/components/sites/stripe-com-9ababc9a/terminal-28f14ef8/` | 15 |
| 8 | Payments | Authorization Boost | Acceptance optimizations | `/authorization-boost` | 200 · 0 redirects · `https://stripe.com/authorization-boost` · lang `en-US` | `/authorization-boost` | v1 | `src/components/sites/stripe-com-9ababc9a/authorization-boost-0d9bddf1/` | 16 |
| 9 | Payments | Link | Accelerated checkout | `/payments/link` | 200 · 0 redirects · `https://stripe.com/payments/link` · lang `en-US` | `/payments/link` | v1 | `src/components/sites/stripe-com-9ababc9a/payments--link-ae7a0bc0/` | 12 |
| 10 | Payments | Financial Connections | Linked financial account data | `/financial-connections` | 200 · 0 redirects · `https://stripe.com/financial-connections` · lang `en-US` | `/financial-connections` | v1 | `src/components/sites/stripe-com-9ababc9a/financial-connections-1319d732/` | 10 |
| 11 | Revenue | Billing | Recurring revenue | `/billing` | 200 · 0 redirects · `https://stripe.com/billing` · lang `en-US` | `/billing` | hds | `src/components/sites/stripe-com-9ababc9a/billing-64862213/` | 13 |
| 12 | Revenue | Metronome | Usage-based billing | `/billing/usage-based-billing` | 200 · 0 redirects · `https://stripe.com/billing/usage-based-billing` · lang `en-US` | `/billing/usage-based-billing` | hds | `src/components/sites/stripe-com-9ababc9a/billing--usage-based-billing-8eb0e4ea/` | 9 |
| 13 | Revenue | Subscriptions | Subscription management | `/billing/subscriptions` | 200 · 0 redirects · `https://stripe.com/billing/subscriptions` · lang `en-US` | `/billing/subscriptions` | hds | `src/components/sites/stripe-com-9ababc9a/billing--subscriptions-7c4bf123/` | 10 |
| 14 | Revenue | Invoicing | One-time or recurring | `/invoicing` | 200 · 0 redirects · `https://stripe.com/invoicing` · lang `en-US` | `/invoicing` | v1 | `src/components/sites/stripe-com-9ababc9a/invoicing-e3ec2c5c/` | 10 |
| 15 | Revenue | Tax | Sales tax & VAT automation | `/tax` | 200 · 0 redirects · `https://stripe.com/tax` · lang `en-US` | `/tax` | v1 | `src/components/sites/stripe-com-9ababc9a/tax-1f062b51/` | 20 |
| 16 | Revenue | Revenue Recognition | Accounting automation | `/revenue-recognition` | 200 · 0 redirects · `https://stripe.com/revenue-recognition` · lang `en-US` | `/revenue-recognition` | v1 | `src/components/sites/stripe-com-9ababc9a/revenue-recognition-3c995bfb/` | 9 |
| 17 | Revenue | Stripe Sigma | Custom reports | `/sigma` | 200 · 0 redirects · `https://stripe.com/sigma` · lang `en-US` | `/sigma` | v1 | `src/components/sites/stripe-com-9ababc9a/sigma-ac0afe6d/` | 12 |
| 18 | Revenue | Data Pipeline | Data sync | `/data-pipeline` | 200 · 0 redirects · `https://stripe.com/data-pipeline` · lang `en-US` | `/data-pipeline` | v1 | `src/components/sites/stripe-com-9ababc9a/data-pipeline-3adcc219/` | 12 |

Notes
- Local routes mirror the live paths one-to-one, so the shared navigation's hrefs need no rewrite and a local ↔
  reference comparison uses the same path on both sides.
- "Metronome" links to `/billing/usage-based-billing` (served directly, HTTP 200, no redirect to metronome.com).
- Legacy-stack pages render the reference's own `SiteHeader`/`SiteFooterSection`; the clone uses the shared
  navigation and footer on every route instead (intentional; see qa-report.md).
