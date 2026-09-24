import type { Metadata } from "next";
import { DataPipelinePage } from "@/components/sites/stripe-com-9ababc9a/data-pipeline-3adcc219/DataPipelinePage";
import "@/styles/stripe/products/v1-data-pipeline-overrides.css";

export const metadata: Metadata = {
  title: "Stripe Data Pipeline | Sync Stripe Data to Your Data Warehouse",
  description: "Send Stripe data to Snowflake, Redshift, Databricks, or your cloud storage and combine with other sources for a complete view of your business performance.",
};

export default function Page() {
  return <DataPipelinePage />;
}
