// Payments + Revenue entries of the Products mega-menu. `href` is the value captured from the live
// navigation (docs/research/stripe-live/nav/menus.json, 2026-09-17); `route` is the local route.
export const PRODUCT_PAGES = [
  { group: "Payments", label: "Payments", slug: "payments", href: "/payments" },
  { group: "Payments", label: "Managed Payments", slug: "managed-payments", href: "/managed-payments" },
  { group: "Payments", label: "Payment links", slug: "payment-links", href: "/payments/payment-links" },
  { group: "Payments", label: "Checkout", slug: "checkout", href: "/payments/checkout" },
  { group: "Payments", label: "Elements", slug: "elements", href: "/payments/elements" },
  { group: "Payments", label: "Payment methods", slug: "payment-methods", href: "/payments/payment-methods" },
  { group: "Payments", label: "Terminal", slug: "terminal", href: "/terminal" },
  { group: "Payments", label: "Authorization Boost", slug: "authorization-boost", href: "/authorization-boost" },
  { group: "Payments", label: "Link", slug: "link", href: "/payments/link" },
  { group: "Payments", label: "Financial Connections", slug: "financial-connections", href: "/financial-connections" },
  { group: "Revenue", label: "Billing", slug: "billing", href: "/billing" },
  { group: "Revenue", label: "Metronome", slug: "metronome", href: "/billing/usage-based-billing" },
  { group: "Revenue", label: "Subscriptions", slug: "subscriptions", href: "/billing/subscriptions" },
  { group: "Revenue", label: "Invoicing", slug: "invoicing", href: "/invoicing" },
  { group: "Revenue", label: "Tax", slug: "tax", href: "/tax" },
  { group: "Revenue", label: "Revenue Recognition", slug: "revenue-recognition", href: "/revenue-recognition" },
  { group: "Revenue", label: "Stripe Sigma", slug: "sigma", href: "/sigma" },
  { group: "Revenue", label: "Data Pipeline", slug: "data-pipeline", href: "/data-pipeline" },
].map((p) => ({ ...p, route: p.href }));
