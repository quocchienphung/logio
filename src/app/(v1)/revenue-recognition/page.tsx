import type { Metadata } from "next";
import { RevenueRecognitionPage } from "@/components/sites/stripe-com-9ababc9a/revenue-recognition-3c995bfb/RevenueRecognitionPage";
import "@/styles/stripe/products/v1-revenue-recognition-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Revenue Recognition | Revenue Recognition Software",
  description: "Stripe’s revenue recognition software simplifies accrual accounting to close your books quickly, accurately, and in line with ASC 606 and IFRS 15 standards.",
};

export default function Page() {
  return <RevenueRecognitionPage />;
}
