import { Divider } from "./Divider";
import { Enterprise } from "./Enterprise";
import { Platforms } from "./Platforms";
import { Startups } from "./Startups";

/** "Powering businesses of all sizes." — Enterprise, Startups and Platforms subsections. */
export function BusinessSizes() {
  return (
    <section className="hds-color-mode business-sizes-section section section--white hds-mode--light">
      <div
        className="section-container section-row section-row-gap"
        style={{
          "--section-row-gap-mb": "var(--hds-space-core-500)",
          "--section-row-gap-tb": "var(--hds-space-core-600)",
          "--section-row-gap-dt": "var(--hds-space-core-800)",
        }}
      >
        <div className="section-title section-title--span-8">
          <h2 className="hds-heading business-sizes__title hds-heading--lg hds-heading--inline">Powering businesses of all sizes.</h2>{" "}
          <p className="hds-heading hds-heading--lg hds-heading--subdued hds-heading--inline">Run your business on a reliable platform that adapts to your needs.</p>
        </div>
        <span className="section-header-divider" />
        <div
          className="section-row section-row-gap"
          style={{
            "--section-row-gap-mb": "var(--hds-space-core-600)",
            "--section-row-gap-tb": "var(--hds-space-core-700)",
            "--section-row-gap-dt": "var(--hds-space-core-1000)",
          }}
        >
          <Enterprise />
          <Divider />
          <Startups />
          <Divider />
          <Platforms />
        </div>
      </div>
    </section>
  );
}
