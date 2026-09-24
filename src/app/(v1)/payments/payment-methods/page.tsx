import type { Metadata } from "next";
import { PaymentMethodsPage } from "@/components/sites/stripe-com-9ababc9a/payments--payment-methods-eb76b3d3/PaymentMethodsPage";
import "@/styles/stripe/products/v1-payment-methods-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Payment Methods for Business",
  description: "Convert more customers, and use AI to surface the most popular payment methods. Join millions of businesses like Amazon that manage payment methods globally through Stripe.",
};

export default function Page() {
  return <PaymentMethodsPage />;
}
