import type { Metadata } from "next";
import { MetronomePage } from "@/components/sites/stripe-com-9ababc9a/billing--usage-based-billing-8eb0e4ea/MetronomePage";
import "@/styles/stripe/products/hds-metronome.css";
import "@/styles/stripe/products/hds-metronome-overrides.css";

export const metadata: Metadata = {
  title: "Usage-based billing software for AI | Metronome, a Stripe product",
  description: "Deploy usage-based and hybrid models faster. Support consumption billing, metered billing, token-based pricing, and other pricing models in one platform.",
};

export default function Page() {
  return <MetronomePage />;
}
