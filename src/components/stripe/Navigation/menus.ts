// Mega-menu content captured from stripe.com on 2026-09-17 (scripts/forensics/parse-nav-menus.mjs).
export interface MenuLink {
  href: string;
  label: string;
  desc?: string;
}
export interface MenuBlock {
  tag: "section" | "aside";
  className?: string;
  title: string;
  titleId: string;
  links: MenuLink[];
  /** products-only extras rendered by the component */
  banner?: "sessions";
}
export interface Menu {
  id: "products" | "solutions" | "developers" | "resources";
  label: string;
  blocks: MenuBlock[];
  personalize?: boolean;
}

export const MENUS: Menu[] = [
  {
    id: "products",
    label: "Products",
    personalize: true,
    blocks: [
      {
        tag: "section",
        title: "Payments",
        titleId: "payments-section-title",
        links: [
          { href: "/payments", label: "Payments", desc: "Online payments" },
          { href: "/managed-payments", label: "Managed Payments", desc: "Merchant of record solution" },
          { href: "/payments/payment-links", label: "Payment links", desc: "No-code payments" },
          { href: "/payments/checkout", label: "Checkout", desc: "Prebuilt payment UIs" },
          { href: "/payments/elements", label: "Elements", desc: "Flexible UI components" },
          { href: "/payments/payment-methods", label: "Payment methods", desc: "Access to 125+" },
          { href: "/terminal", label: "Terminal", desc: "In-person payments" },
          { href: "/authorization-boost", label: "Authorization Boost", desc: "Acceptance optimizations" },
          { href: "/payments/link", label: "Link", desc: "Accelerated checkout" },
          { href: "/financial-connections", label: "Financial Connections", desc: "Linked financial account data" },
        ],
      },
      {
        tag: "section",
        title: "Revenue",
        titleId: "revenue-section-title",
        links: [
          { href: "/billing", label: "Billing", desc: "Recurring revenue" },
          { href: "/billing/usage-based-billing", label: "Metronome", desc: "Usage-based billing" },
          { href: "/billing/subscriptions", label: "Subscriptions", desc: "Subscription management" },
          { href: "/invoicing", label: "Invoicing", desc: "One-time or recurring" },
          { href: "/tax", label: "Tax", desc: "Sales tax & VAT automation" },
          { href: "/revenue-recognition", label: "Revenue Recognition", desc: "Accounting automation" },
          { href: "/sigma", label: "Stripe Sigma", desc: "Custom reports" },
          { href: "/data-pipeline", label: "Data Pipeline", desc: "Data sync" },
        ],
      },
      {
        tag: "section",
        title: "Money Management",
        titleId: "money-management-section-title",
        links: [
          { href: "/treasury", label: "Treasury", desc: "Business finances" },
          { href: "/payouts", label: "Global Payouts", desc: "Payouts to third parties" },
          { href: "/capital", label: "Capital", desc: "Business financing" },
          { href: "/use-cases/crypto", label: "Crypto", desc: "Wallet, stablecoin issuing, and card infrastructure" },
          { href: "/crypto-onramp", label: "Crypto Onramp", desc: "Embeddable crypto purchases" },
        ],
      },
      {
        tag: "section",
        title: "Platforms and marketplaces",
        titleId: "platforms-and-marketplaces-section-title",
        links: [
          { href: "/connect", label: "Connect", desc: "Payments for platforms" },
          { href: "/capital/platforms", label: "Capital for platforms", desc: "Customer financing" },
          { href: "/treasury/platforms", label: "Treasury for platforms", desc: "Embedded financial services" },
          { href: "/issuing", label: "Issuing", desc: "Physical and virtual cards" },
        ],
      },
      {
        tag: "aside",
        className: "navigation__section--secondary",
        title: "More",
        titleId: "more-products-section-title",
        banner: "sessions",
        links: [
          { href: "/roadmap", label: "Product roadmap", desc: "See what’s ahead" },
          { href: "/radar", label: "Radar", desc: "Fraud prevention" },
          { href: "/atlas", label: "Atlas", desc: "Startup incorporation" },
          { href: "/climate", label: "Climate", desc: "Carbon removal" },
          { href: "/identity", label: "Identity", desc: "Online identity verification" },
        ],
      },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    blocks: [
      {
        tag: "section",
        title: "By stage",
        titleId: "by-stage-section-title",
        links: [
          { href: "/enterprise", label: "Enterprises" },
          { href: "/startups", label: "Startups" },
        ],
      },
      {
        tag: "section",
        title: "By use case",
        titleId: "by-use-case-section-title",
        links: [
          { href: "/use-cases/agentic-commerce", label: "Agentic commerce" },
          { href: "/use-cases/crypto", label: "Crypto" },
          { href: "/use-cases/ecommerce", label: "Ecommerce" },
          { href: "/use-cases/embedded-finance", label: "Embedded finance" },
          { href: "/use-cases/finance-automation", label: "Finance automation" },
          { href: "/use-cases/global-businesses", label: "Global businesses" },
          { href: "/use-cases/in-app-payments", label: "In-app payments" },
          { href: "/use-cases/marketplaces", label: "Marketplaces" },
          { href: "/money-management/availability", label: "Money management" },
          { href: "/use-cases/platforms", label: "Platforms" },
          { href: "/use-cases/saas", label: "SaaS" },
        ],
      },
      {
        tag: "section",
        title: "By industry",
        titleId: "by-industry-section-title",
        links: [
          { href: "/use-cases/ai", label: "AI companies" },
          { href: "/use-cases/creator-economy", label: "Creator economy" },
          { href: "/industries/fintech", label: "Fintech" },
          { href: "/industries/gaming", label: "Gaming" },
          { href: "/industries/travel", label: "Hospitality, travel, and leisure" },
          { href: "/industries/insurance", label: "Insurance" },
          { href: "/industries/media-entertainment", label: "Media and entertainment" },
          { href: "/industries/nonprofits", label: "Nonprofits" },
          { href: "/industries/professional-services", label: "Professional services" },
          { href: "/industries/public-sector", label: "Public sector" },
          { href: "/industries/retail", label: "Retail" },
        ],
      },
      {
        tag: "section",
        className: "navigation__section--secondary navigation__section--ecosystem",
        title: "Ecosystem",
        titleId: "ecosystem-section-title",
        links: [
          { href: "/partners", label: "Partners" },
          { href: "https://marketplace.stripe.com/", label: "Stripe App Marketplace" },
        ],
      },
    ],
  },
  {
    id: "developers",
    label: "Developers",
    blocks: [
      {
        tag: "section",
        title: "Documentation",
        titleId: "documentation-section-title",
        links: [
          { href: "https://docs.stripe.com/", label: "Stripe docs" },
          { href: "https://docs.stripe.com/api", label: "API reference" },
          { href: "https://docs.stripe.com/development", label: "Libraries and SDKs" },
          { href: "/apps", label: "Stripe Apps" },
        ],
      },
      {
        tag: "section",
        title: "Guides",
        titleId: "guides-section-title",
        links: [
          { href: "https://docs.stripe.com/payments", label: "Accept online payments" },
          { href: "https://docs.stripe.com/payments/checkout", label: "Implement a prebuilt checkout" },
          { href: "https://docs.stripe.com/connect", label: "Build a platform or marketplace" },
          { href: "https://docs.stripe.com/billing", label: "Manage subscriptions" },
          { href: "https://docs.stripe.com/billing/subscriptions/usage-based", label: "Offer usage-based billing" },
          { href: "https://docs.stripe.com/treasury/stablecoins", label: "Issue stablecoin-backed cards" },
          { href: "https://docs.stripe.com/projects", label: "Provision and manage services with agents" },
        ],
      },
      {
        tag: "section",
        title: "Resources",
        titleId: "resources-section-title",
        links: [
          { href: "https://marketplace.stripe.com/", label: "App integrations" },
          { href: "https://github.com/stripe-samples", label: "Code samples" },
          { href: "https://stripe.dev/", label: "Developer blog" },
          { href: "https://status.stripe.com/", label: "API status" },
        ],
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    blocks: [
      {
        tag: "section",
        title: "Learn",
        titleId: "learn-section-title",
        links: [
          { href: "/blog", label: "Blog" },
          { href: "/customers", label: "Customer stories" },
          { href: "/guides", label: "Guides" },
        ],
      },
      {
        tag: "section",
        title: "Support",
        titleId: "support-section-title",
        links: [
          { href: "https://support.stripe.com/", label: "Get support" },
          { href: "/support-plans", label: "Managed support plans" },
          { href: "/professional-services", label: "Professional services" },
        ],
      },
      {
        tag: "section",
        title: "Company",
        titleId: "company-section-title",
        links: [
          { href: "/roadmap", label: "Product roadmap" },
          { href: "/sessions", label: "Sessions annual conference" },
          { href: "/careers", label: "Careers" },
          { href: "/newsroom", label: "Newsroom" },
          { href: "https://press.stripe.com/", label: "Stripe Press" },
          { href: "/about", label: "About" },
        ],
      },
      {
        tag: "section",
        className: "navigation__section--secondary navigation__section--contact",
        title: "Contact",
        titleId: "contact-section-title",
        links: [
          { href: "/contact/sales", label: "Contact sales" },
          { href: "/partners/become-a-partner", label: "Become a partner" },
        ],
      },
    ],
  },
];
