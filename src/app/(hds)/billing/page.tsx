import type { Metadata } from "next";
import { BillingPage } from "@/components/sites/stripe-com-9ababc9a/billing-64862213/BillingPage";
import "@/styles/stripe/products/hds-billing.css";
import "@/styles/stripe/products/hds-billing-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Billing | Recurring Payments & Subscription Solutions",
  description: "Power your subscriptions with Stripe Billing. Set up recurring and usage-based pricing with APIs or within the Dashboard. Reduce churn with AI-powered tools.",
};

export default function Page() {
  return <BillingPage />;
}
