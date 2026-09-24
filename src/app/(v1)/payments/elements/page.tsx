import type { Metadata } from "next";
import { ElementsPage } from "@/components/sites/stripe-com-9ababc9a/payments--elements-8f3d1dbd/ElementsPage";
import "@/styles/stripe/products/v1-elements-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Elements | Custom Checkout Design and UI",
  description: "Stripe’s suite of modular UI building blocks make it easy to design a secure on-brand checkout and payments experience for your customers.",
};

export default function Page() {
  return <ElementsPage />;
}
