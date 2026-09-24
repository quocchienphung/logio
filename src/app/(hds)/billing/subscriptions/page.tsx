import type { Metadata } from "next";
import { SubscriptionsPage } from "@/components/sites/stripe-com-9ababc9a/billing--subscriptions-7c4bf123/SubscriptionsPage";
import "@/styles/stripe/products/hds-subscriptions.css";
import "@/styles/stripe/products/hds-subscriptions-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Billing | Flexible Subscription Management Tool",
  description: "Build and manage subscriptions at global scale. Launch pricing models in minutes, reduce churn automatically, and track performance metrics in one place.",
};

export default function Page() {
  return <SubscriptionsPage />;
}
