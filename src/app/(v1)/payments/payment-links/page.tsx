import type { Metadata } from "next";
import { PaymentLinksPage } from "@/components/sites/stripe-com-9ababc9a/payments--payment-links-fb118718/PaymentLinksPage";
import "@/styles/stripe/products/v1-payment-links-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Payment Links | Simple Links to Accept Payments",
  description: "Effortlessly create and share a comprehensive payment page in just a few clicks with Stripe Payment Links. No website or coding skills required.",
};

export default function Page() {
  return <PaymentLinksPage />;
}
