import type { Metadata } from "next";
import { TerminalPage } from "@/components/sites/stripe-com-9ababc9a/terminal-28f14ef8/TerminalPage";
import "@/styles/stripe/products/v1-terminal-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Terminal | Unified Commerce Platform",
  description: "Stripe Terminal allows businesses to offer seamless and custom in-person payments for a unified commerce experience.",
};

export default function Page() {
  return <TerminalPage />;
}
