import type { Metadata } from "next";
import { TaxPage } from "@/components/sites/stripe-com-9ababc9a/tax-1f062b51/TaxPage";
import "@/styles/stripe/products/v1-tax-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Tax | Sales Tax Software for Global Compliance",
  description: "Simplify global tax compliance with an automated sales tax, VAT, and GST solution across 100+ countries. Identify obligations, calculate and collect taxes, and file on time.",
};

export default function Page() {
  return <TaxPage />;
}
