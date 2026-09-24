import type { Metadata } from "next";
import { AuthorizationBoostPage } from "@/components/sites/stripe-com-9ababc9a/authorization-boost-0d9bddf1/AuthorizationBoostPage";
import "@/styles/stripe/products/v1-authorization-boost-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Authorization Boost | Increase Your Authorization Rates",
  description: "Increase your payment authorization rates and lower network costs with AI-powered optimizations that help boost your revenue.",
};

export default function Page() {
  return <AuthorizationBoostPage />;
}
