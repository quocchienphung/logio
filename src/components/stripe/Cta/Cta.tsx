/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs "main > section" 8).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function Cta() {
  return (
    <>
      <section className="hds-color-mode section hds-mode--light mono-band mono-band--075">
        <div className="section-container footer-cta-section__grid">
          <div
            className="section-row footer-cta-section__content section-row-gap"
            style={{
              "--section-row-gap-mb": "var(--hds-space-core-300)",
              "--section-row-gap-tb": "var(--hds-space-core-400)",
            }}
          >
            <div className="footer-cta-section__content-text">
              <span className="hds-heading footer-cta-section__title hds-heading--lg">
                {"Ready to get started?"}
              </span>
              <p className="hds-text footer-cta-section__description hds-text--xl hds-text--soft">
                {
                  "Create an account instantly, or contact us to design a custom package for your business."
                }
              </p>
            </div>
            <div className="hds-button-group">
              <a
                className="hds-button hds-button--primary"
                href="https://dashboard.stripe.com/register"
                data-analytics-label="ready_to_get__start_now"
              >
                {"Start now"}
                <span className="hds-nowrap-svg">
                  <svg
                    className="hds-icon hds-icon-hover-arrow"
                    width="5"
                    height="8"
                    fill="none"
                    viewBox="0 0.5 5 8"
                  >
                    <defs>
                      <clipPath id=":Rspqmr6l6:">
                        <rect x="0" y="0" width="12" height="9" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#:Rspqmr6l6:)">
                      <g className="arrow-group">
                        <rect
                          className="shaft"
                          x="-10"
                          y="3.375"
                          width="13"
                          height="1.75"
                          fill="currentColor"
                        />
                        <path
                          d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                          fill="currentColor"
                        />
                      </g>
                    </g>
                  </svg>
                </span>
              </a>
              <a
                className="hds-button hds-button--secondary"
                href="/contact/sales"
                data-analytics-label="ready_to_get__contact_sales"
              >
                {"Contact sales"}
              </a>
            </div>
          </div>
          <div className="footer-cta-section__feature-grid">
            <div className="footer-cta-section__feature-card">
              <div className="feature-detail footer-cta-section__feature-detail">
                <div className="charm-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="icon"
                    aria-hidden="true"
                  >
                    <path
                      fill="url(#tag-price-gradient-id-:R16qmr6l6:)"
                      d="m12.5311 16.4697-1.0606 1.0606-4.99997-5 1.06055-1.0606z"
                    />
                    <path
                      fill="url(#tag-price-gradient-id-:R16qmr6l6:)"
                      d="m15.0311 13.9697-1.0606 1.0606-4.99997-5 1.06057-1.06057z"
                    />
                    <path
                      fill="url(#tag-price-gradient-id-:R16qmr6l6:)"
                      d="M17.5008 5c.8284.00008 1.5.67162 1.5 1.5s-.6716 1.49992-1.5 1.5c-.8284 0-1.5-.67157-1.5-1.5s.6716-1.5 1.5-1.5"
                    />
                    <path
                      fill="url(#tag-price-gradient-id-:R16qmr6l6:)"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M22.0008 10.7749c0 .7964-.3168 1.5603-.8804 2.123l-8.2475 8.2344c-1.1718 1.1699-3.06984 1.1688-4.24075-.0019l-5.76172-5.7608c-1.17091-1.1708-1.17177-3.0693-.00195-4.2412l8.23342-8.24803C11.6646 2.31677 12.4285 2 13.2249 2h8.7759zM13.2249 3.5c-.3982 0-.7801.15859-1.0615.44043L3.93001 12.1885c-.58479.5859-.58437 1.5347.00097 2.1201l5.76172 5.7612c.5854.5853 1.5342.5858 2.1201.001l8.2476-8.2344c.2817-.2813.4404-.6633.4404-1.0615V3.5z"
                    />
                    <defs>
                      <linearGradient
                        id="tag-price-gradient-id-:R16qmr6l6:"
                        x1="15.6279"
                        x2="8.28107"
                        y1="2"
                        y2="22.009"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="var(--icon-gradient-start)" />
                        <stop
                          offset="0.5"
                          stopColor="var(--icon-gradient-middle)"
                        />
                        <stop offset="1" stopColor="var(--icon-gradient-end)" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="feature-detail__content feature-detail__content--stacked">
                  <h4 className="hds-text hds-text--md hds-text--emphasized">
                    {"See what you’ll pay"}
                  </h4>
                  <p className="hds-text hds-text--md hds-text--soft">
                    {"Integrated per-transaction pricing with no hidden fees."}
                  </p>
                </div>
                <div className="feature-detail__footer">
                  <a
                    className="hds-link hds-link--callout"
                    href="/pricing"
                    data-analytics-label="ready_to_get__pricing_details"
                  >
                    {"Pricing details"}
                    <span className="hds-nowrap-svg">
                      <span className="hds-nowrap-svg">
                        <svg
                          className="hds-icon hds-icon-hover-arrow"
                          width="5"
                          height="8"
                          fill="none"
                          viewBox="0 0.5 5 8"
                        >
                          <defs>
                            <clipPath id=":Re6qmr6l6:">
                              <rect x="0" y="0" width="12" height="9" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#:Re6qmr6l6:)">
                            <g className="arrow-group">
                              <rect
                                className="shaft"
                                x="-10"
                                y="3.375"
                                width="13"
                                height="1.75"
                                fill="currentColor"
                              />
                              <path
                                d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                fill="currentColor"
                              />
                            </g>
                          </g>
                        </svg>
                      </span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
            <div className="footer-cta-section__feature-card">
              <div className="feature-detail footer-cta-section__feature-detail">
                <div className="charm-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="icon"
                    aria-hidden="true"
                  >
                    <path
                      fill="url(#document-code-gradient-id-:R1aqmr6l6:)"
                      d="M12.5 10.6885 10.0059 12.5 12.5 14.311v1.8536l-4-2.9043v-1.521l4-2.90483z"
                    />
                    <path
                      fill="url(#document-code-gradient-id-:R1aqmr6l6:)"
                      d="M18.5 11.7393v1.521l-4 2.9043V14.311l2.4941-1.811L14.5 10.6885V8.83447z"
                    />
                    <path
                      fill="url(#document-code-gradient-id-:R1aqmr6l6:)"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M18.5 4h3v19h-12c-2.20914 0-4-1.7909-4-4V4H17V2.5H4V19H2.5V1h16zM7 19c0 1.3807 1.11929 2.5 2.5 2.5H20v-16H7z"
                    />
                    <defs>
                      <linearGradient
                        id="document-code-gradient-id-:R1aqmr6l6:"
                        x1="15.4485"
                        x2="6.45905"
                        y1="1"
                        y2="22.144"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="var(--icon-gradient-start)" />
                        <stop
                          offset="0.5"
                          stopColor="var(--icon-gradient-middle)"
                        />
                        <stop offset="1" stopColor="var(--icon-gradient-end)" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="feature-detail__content feature-detail__content--stacked">
                  <h4 className="hds-text hds-text--md hds-text--emphasized">
                    {"Start building"}
                  </h4>
                  <p className="hds-text hds-text--md hds-text--soft">
                    {
                      "Get up and running with Stripe in as little as 10 minutes."
                    }
                  </p>
                </div>
                <div className="feature-detail__footer">
                  <a
                    className="hds-link hds-link--callout"
                    href="https://docs.stripe.com/get-started"
                    data-analytics-label="ready_to_get__api_reference"
                  >
                    {"Integration options"}
                    <span className="hds-nowrap-svg">
                      <span className="hds-nowrap-svg">
                        <svg
                          className="hds-icon hds-icon-hover-arrow"
                          width="5"
                          height="8"
                          fill="none"
                          viewBox="0 0.5 5 8"
                        >
                          <defs>
                            <clipPath id=":Reaqmr6l6:">
                              <rect x="0" y="0" width="12" height="9" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#:Reaqmr6l6:)">
                            <g className="arrow-group">
                              <rect
                                className="shaft"
                                x="-10"
                                y="3.375"
                                width="13"
                                height="1.75"
                                fill="currentColor"
                              />
                              <path
                                d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                fill="currentColor"
                              />
                            </g>
                          </g>
                        </svg>
                      </span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
