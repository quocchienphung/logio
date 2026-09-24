import type { Metadata } from "next";
import { PaymentsPage } from "@/components/sites/stripe-com-9ababc9a/payments-2686bdb4/PaymentsPage";
import "@/styles/stripe/products/v1-payments-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Payments | Global Payment Processing Platform",
  description: "Capture more revenue with a unified payments solution that eliminates the need for one-off merchant account, payment gateway, and processor integrations.",
};

export default function Page() {
  return <PaymentsPage />;
}
