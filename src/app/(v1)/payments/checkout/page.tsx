import type { Metadata } from "next";
import { CheckoutPage } from "@/components/sites/stripe-com-9ababc9a/payments--checkout-7bae78ae/CheckoutPage";
import "@/styles/stripe/products/v1-checkout-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Checkout | Checkout Pages for Your Website",
  description: "Experience seamless online payments with Stripe Checkout. Our optimized low-code solution enhances conversion rates with a simple and secure process.",
};

export default function Page() {
  return <CheckoutPage />;
}
