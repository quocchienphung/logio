// Legacy-stack product pages (Payments, Checkout, Tax, …): the captured stylesheet is scoped under
// .v1-root, so it only styles page content and never the shared navigation/footer.
import "@/styles/stripe/products/v1-base.css";
import "@/styles/stripe/products/v1-overrides.css";
import "@/styles/stripe/products/v1-ctl-core.css";
import "@/styles/stripe/products/v1-ctl-carousels.css";
import "@/styles/stripe/products/v1-ctl-forms.css";
import "@/styles/stripe/products/v1-ctl-pg-payments.css";
import "@/styles/stripe/products/v1-ctl-pg-checkout.css";
import "@/styles/stripe/products/v1-ctl-pg-payment-links.css";
import "@/styles/stripe/products/v1-ctl-pg-elements.css";
import "@/styles/stripe/products/v1-ctl-pg-link.css";
import "@/styles/stripe/products/v1-ctl-pg-payment-methods.css";
import "@/styles/stripe/products/v1-ctl-pg-terminal.css";
import "@/styles/stripe/products/v1-ctl-pg-authorization-boost.css";
import "@/styles/stripe/products/v1-ctl-pg-financial-connections.css";
import "@/styles/stripe/products/v1-ctl-pg-invoicing.css";
import "@/styles/stripe/products/v1-ctl-pg-tax.css";
import "@/styles/stripe/products/v1-ctl-pg-revenue-recognition.css";
import "@/styles/stripe/products/v1-ctl-pg-sigma.css";
import "@/styles/stripe/products/v1-ctl-pg-data-pipeline.css";

export default function V1Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
