import type { Metadata } from "next";
import { Crm } from "@/components/sites/affectui-crm/Crm";

export const metadata: Metadata = {
  title: "Guide me · Company CRM",
  description: "Company CRM with an editable spreadsheet, sales pipelines, integrations and documents.",
};

export default function PersonalizePage() {
  return <Crm />;
}
