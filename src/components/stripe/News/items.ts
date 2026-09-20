// "What's happening" carousel items captured from stripe.com on 2026-09-17 (details DOM + bundle item config).
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  ariaLabel?: string;
  imgSrc: string;
  collapsedOffsetX: number;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "annualLetter",
    title: "Businesses on Stripe generated $1.9T in 2025.",
    description:
      "Our annual letter explores the trends defining the internet economy—including steeper growth for newer businesses, faster international expansion, stablecoin progress, agentic commerce, and more.",
    cta: "Read the letter",
    href: "/annual-updates/2025",
    imgSrc: "/stripe/annual-letter-desktop-w1732-bb1a072f-mono.webp",
    collapsedOffsetX: 0,
  },
  {
    id: "bfcm",
    title: "150K+ users have their best day ever on Stripe.",
    description:
      "From Black Friday through Cyber Monday 2025, Stripe processed more than $40B for businesses while maintaining a 99.9999% uptime.",
    cta: "See the numbers",
    href: "/newsroom/news/bfcm2025",
    imgSrc: "/stripe/the-happenings-bfcm-w1732-0720bda9-mono.webp",
    collapsedOffsetX: -4,
  },
  {
    id: "tidemark",
    title: "Tidemark’s vertical and SMB SaaS benchmark report.",
    description:
      "Learn what’s driving growth in vertical SaaS in 2025—going multiproduct, embedding fintech, and integrating AI into the core of their products.",
    cta: "Get the data",
    href: "/lp/vertical-saas-benchmark-2025?utm_medium=owned-surfaces&utm_source=33d6&utm_campaign=GLOBAL_4250&utm_content=819a&utm_term=a6a6d7b23e01",
    ariaLabel: "Get the Tidemark SaaS benchmark data",
    imgSrc: "/stripe/the-happenings-tidemark-w1732-b5d90f21-mono.webp",
    collapsedOffsetX: 120,
  },
  {
    id: "tobiJohn",
    title: "Shopify’s Tobi Lütke sits down with John Collison.",
    description:
      "Hear them discuss the choices that shaped Shopify and Stripe, the future of commerce, and their advice for founders.",
    cta: "Watch video",
    href: "https://www.youtube.com/watch?v=eMSqlQMk480",
    ariaLabel: "Watch Tobi Lütke and John Collison conversation",
    imgSrc: "/stripe/the-happenings-cheeky-pint-w1732-f7b12dc2-mono.webp",
    collapsedOffsetX: 120,
  },
  {
    id: "appStores",
    title: "New tools to process payments outside app stores.",
    description:
      "New regulations mean new opportunities. Read how Stripe can help you process payments outside of the iOS and Android app stores, giving you more control and helping grow your revenue.",
    cta: "Learn how",
    href: "/use-cases/in-app-payments",
    ariaLabel: "Learn how to process payments outside app stores",
    imgSrc: "/stripe/the-happenings-payment-processing-w1732-0388b99e-mono.webp",
    collapsedOffsetX: 0,
  },
  {
    id: "crypto",
    title: "Crypto.com partners with Stripe to enable better crypto payments.",
    description:
      "Learn how the partnership can help you tap into a new global customer base by letting customers pay with their crypto balance directly at checkout.",
    cta: "View announcement",
    href: "/customers/crypto-com-spotlight",
    imgSrc: "/stripe/the-happenings-crypto-w1732-e6a5b602-mono.webp",
    collapsedOffsetX: 80,
  },
  {
    id: "agenticAi",
    title: "Make your products shoppable through AI platforms.",
    description:
      "Find out how the Agentic Commerce Protocol (ACP) allows any business to accept purchases from AI platforms without requiring any major technical changes.",
    cta: "Read more",
    href: "/blog/introducing-our-agentic-commerce-solutions",
    ariaLabel: "Read more about agentic commerce solutions",
    imgSrc: "/stripe/the-happenings-agentic-w1732-de7f3544-mono.webp",
    collapsedOffsetX: 0,
  },
  {
    id: "retailers",
    title: "How leading retailers unify customer experiences and drive growth.",
    description:
      "Get insights into how other brands have unified their online and in-store experiences and optimized their checkouts for a seamless shopping experience.",
    cta: "Get the report",
    href: "/lp/how-retailers-drive-growth",
    imgSrc: "/stripe/the-happenings-payment-retailers-w1732-6aecb91d-mono.webp",
    collapsedOffsetX: 0,
  },
];
