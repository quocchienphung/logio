import type { Metadata } from "next";
import { SigmaPage } from "@/components/sites/stripe-com-9ababc9a/sigma-ac0afe6d/SigmaPage";
import "@/styles/stripe/products/v1-sigma-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Sigma | Analyze Stripe Data Using SQL and AI",
  description: "Use SQL and our AI-powered assistant to easily analyze Stripe data in your Dashboard to uncover revenue drivers, payment trends, and create custom reports.",
};

export default function Page() {
  return <SigmaPage />;
}
