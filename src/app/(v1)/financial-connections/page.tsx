import type { Metadata } from "next";
import { FinancialConnectionsPage } from "@/components/sites/stripe-com-9ababc9a/financial-connections-1319d732/FinancialConnectionsPage";
import "@/styles/stripe/products/v1-financial-connections-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Financial Connections | Secure Open Banking Platform",
  description: "Stripe Financial Connections is an open banking solution that lets users securely share financial data to streamline ACH payments and payouts, reduce fraud, and underwrite risk.",
};

export default function Page() {
  return <FinancialConnectionsPage />;
}
