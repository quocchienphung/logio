import type { Metadata } from "next";
import { LinkPage } from "@/components/sites/stripe-com-9ababc9a/payments--link-ae7a0bc0/LinkPage";
import "@/styles/stripe/products/v1-link-overrides.css";

export const metadata: Metadata = {
  title: "Link by Stripe: One-click payments",
  description: "Link allows your customers to securely save and reuse payment details for a faster checkout at hundreds of thousands of Link-enabled online businesses.",
};

export default function Page() {
  return <LinkPage />;
}
