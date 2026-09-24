import type { Metadata } from "next";
import { InvoicingPage } from "@/components/sites/stripe-com-9ababc9a/invoicing-e3ec2c5c/InvoicingPage";
import "@/styles/stripe/products/v1-invoicing-overrides.css";

export const metadata: Metadata = {
  title: "Create and Send Invoices Online | Stripe Invoicing",
  description: "Create and send invoices online in minutes with Stripe. Use our invoicing software to automate payment collection and recover revenue with AI-powered dunning.",
};

export default function Page() {
  return <InvoicingPage />;
}
