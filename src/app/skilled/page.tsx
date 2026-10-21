import type { Metadata } from "next";
import { SkilledPage } from "@/components/sites/affectui-context-window/SkilledPage";

export const metadata: Metadata = {
  title: "Skilled · Logio",
  description: "Explore the model's context window.",
};

export default function Page() {
  return <SkilledPage />;
}
