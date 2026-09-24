import type { Metadata } from "next";
import { ManagedPaymentsPage } from "@/components/sites/stripe-com-9ababc9a/managed-payments-11a73331/ManagedPaymentsPage";
import "@/styles/stripe/products/hds-managed-payments.css";
import "@/styles/stripe/products/hds-managed-payments-overrides.css";

export const metadata: Metadata = {
  title: "Your Merchant of Record Provider | Stripe Managed Payments",
  description: "Sell globally in 195 markets. Stripe’s merchant of record solution handles tax, fraud, disputes, localized checkout, and support for you.",
};

export default function Page() {
  return <ManagedPaymentsPage />;
}
