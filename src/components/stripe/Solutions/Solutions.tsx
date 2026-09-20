import { BentoCard } from "./BentoCard";
import { AgenticCommerceGraphic } from "./graphics/AgenticCommerceGraphic";
import { BillingGraphic } from "./graphics/BillingGraphic";
import { ConnectGraphic } from "./graphics/ConnectGraphic";
import { CryptoGlobe } from "./graphics/CryptoGlobe";
import { IssuingCardGraphic } from "./graphics/IssuingCardGraphic";
import { PaymentsGraphic } from "./graphics/PaymentsGraphic";

/** "Flexible solutions for every business model." bento (section 2 of the reference). */
export function Solutions() {
  return (
    <section className="hds-color-mode section section--white hds-mode--light mono-band mono-band--050">
      <div className="section-background modular-solutions-bg" aria-hidden="true" style={{ "--bg-fade-opacity": 0 }} />
      <div
        className="section-container section-row modular-solutions-section section-row-gap"
        style={{
          "--section-row-gap-mb": "var(--hds-space-core-500)",
          "--section-row-gap-tb": "var(--hds-space-core-600)",
          "--section-row-gap-dt": "var(--hds-space-core-800)",
        }}
      >
        <div className="section-title section-title--span-8">
          <h2 className="hds-heading hds-heading--lg hds-heading--inline">Flexible solutions for every business model.</h2>{" "}
          <p className="hds-heading modular-solutions-section__description hds-heading--lg hds-heading--subdued hds-heading--inline">
            Grow your business with a comprehensive set of payments and financial tools⁠—⁠designed to work individually or together.
          </p>
          <p className="hds-heading modular-solutions-section__description--short-for-mobile hds-heading--lg hds-heading--subdued hds-heading--inline">
            Grow your business with the most comprehensive set of payments and financial tools.
          </p>
        </div>
        <div className="modular-solutions-bento">
          <div className="modular-solutions-bento__content">
            <div className="modular-solutions-bento__layout">
              <BentoCard id="payments" title="Accept and optimize payments globally—online and in person" growY={4}>
                <PaymentsGraphic />
              </BentoCard>
              <BentoCard id="billing" title="Enable any billing model" growY={6}>
                <BillingGraphic />
              </BentoCard>
              <BentoCard id="agentic-commerce" title="Monetize through agentic commerce" growY={6}>
                <AgenticCommerceGraphic />
              </BentoCard>
              <BentoCard id="issuing" title="Create a card issuing program" growY={6}>
                <IssuingCardGraphic />
              </BentoCard>
              <BentoCard id="crypto" title="Access borderless money movement with stablecoins and crypto" growY={6}>
                <CryptoGlobe />
              </BentoCard>
              <BentoCard id="connect" title="Embed payments in your platform" growY={2}>
                <ConnectGraphic />
              </BentoCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
