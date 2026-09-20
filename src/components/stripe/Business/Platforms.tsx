"use client";

import { useRef } from "react";
import { usePlatformTimeline } from "./usePlatformTimeline";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs ".business-sizes-section > .section-container > .section-row > section" 2).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function Platforms() {
  const graphicRef = useRef<HTMLDivElement>(null);
  const { done, replay } = usePlatformTimeline(graphicRef);
  return (
    <>
      <section
        className="section-row section-row-gap"
        style={{
          "--section-row-gap-mb": "var(--hds-space-core-700)",
          "--section-row-gap-tb": "var(--hds-space-core-800)",
          "--section-row-gap-dt": "var(--hds-space-core-1200)",
        }}
      >
        <header className="section-header section-header--title-span-5">
          <div className="section-header__primary">
            <h3 className="hds-heading section-header__title hds-heading--md">
              {"Make your SaaS platform a complete financial operating system"}
            </h3>
            <div className="hds-button-group section-header__actions">
              <a
                className="hds-button hds-button--primary"
                href="/use-cases/platforms"
                data-analytics-label="stripe_for_platforms"
              >
                {"Stripe for platforms"}
                <span className="hds-nowrap-svg">
                  <svg
                    className="hds-icon hds-icon-hover-arrow"
                    width="5"
                    height="8"
                    fill="none"
                    viewBox="0 0.5 5 8"
                  >
                    <defs>
                      <clipPath id=":Reirnmr6l6:">
                        <rect x="0" y="0" width="12" height="9" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#:Reirnmr6l6:)">
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
            </div>
          </div>
          <p className="hds-text section-header__description hds-text--lg hds-text--soft">
            {
              "From the Fortune 100 to the Forbes Cloud 100, vertical SaaS platforms use Stripe to expand their product offerings with embedded payments and financial services."
            }
          </p>
        </header>
        <div className="platform-value__graphic-container">
          <div className="platform-graphic-wrapper">
            <div className="platform-graphic" ref={graphicRef}>
              <div className="platform-graphic__background">
                <picture className="platform-graphic__background-image">
                  <source
                    type="image/webp"
                    srcSet="/stripe/platform-graphic-background_2x-w296-e2192ed5-mono.webp 296w, /stripe/platform-graphic-background_2x-w396-e97093d5-mono.webp 396w, /stripe/platform-graphic-background_2x-w608-e7b1f54d-mono.webp 608w, /stripe/platform-graphic-background_2x-w816-826af5af-mono.webp 816w, /stripe/platform-graphic-background_2x-w1232-96e8b0fa-mono.webp 1232w, /stripe/platform-graphic-background_2x-w1632-9faf806b-mono.webp 1632w, /stripe/platform-graphic-background_2x-w2460-a99c352a-mono.webp 2460w"
                  />
                  <img
                    loading="lazy"
                    width="2460"
                    height="1064"
                    alt=""
                    sizes="(min-width: 1298px) 1232px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                    srcSet="/stripe/platform-graphic-background_2x-w296-356626bc-mono.png 296w, /stripe/platform-graphic-background_2x-w396-40aec0ea-mono.png 396w, /stripe/platform-graphic-background_2x-w608-36e05bb0-mono.png 608w, /stripe/platform-graphic-background_2x-w816-15a48f1b-mono.png 816w, /stripe/platform-graphic-background_2x-w1232-d6af2a43-mono.png 1232w, /stripe/platform-graphic-background_2x-w1632-f08f96fb-mono.png 1632w, /stripe/platform-graphic-background_2x-w2460-31a7f1ff-mono.png 2460w"
                    src="/stripe/platform-graphic-background_2x-w296-356626bc-mono.png"
                  />
                </picture>
              </div>
              <div>
                <div className="platform-graphic__features--stacked">
                  <div
                    className="platform-graphic-features"
                    style={{ height: "auto" }}
                  >
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__payments"
                      style={{ height: "auto" }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Payments"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show a list of payments with export, refund, and dispute capabilities."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'payments'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__capital"
                      style={{ height: "auto" }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Capital financing promotion"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show a connected account's financing offer and allow them to apply."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'capital-financing-promotion'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__payouts"
                      style={{ height: "auto" }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Payouts"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show total balance and allow a connected account to initiate payouts."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'payouts'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__notification"
                      style={{ height: "auto" }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Notification banner"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show a banner listing required actions for risk and onboarding."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'notification-banner'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="platform-graphic__dom">
                  <div
                    className="dom-graphic dom-graphic--variant-default platform-graphic__dom__browser"
                    data-status="ready"
                    role="img"
                    aria-label="The payments dashboard for Daybreak Yoga showing an available balance, a notice to provide more information, and a recent activity log of transactions including several payments that have succeeded and one that was disputed."
                    style={{
                      "--graphic-source-width": "800px",
                      "--graphic-source-height": "600px",
                      "--graphic-aspect-ratio": "800 / 600",
                      "--graphic-scale": "1",
                      "--graphic-max-width": "800px",
                    }}
                  >
                    <div
                      className="dom-graphic__content dom-graphic__content--horizontal-scale-left"
                      aria-hidden="true"
                    >
                      <div
                        className="browser-graphic platform-graphic__container__browser browser-graphic--on-dark"
                        style={{
                          "--browser-graphic-desktop-width": "800px",
                          "--browser-graphic-desktop-height": "600px",
                          "--browser-graphic-mobile-width": "800px",
                          "--browser-graphic-mobile-height": "600px",
                        }}
                      >
                        <div className="browser-graphic__window">
                          <div className="browser-graphic__window-top-bar">
                            <svg
                              width="32"
                              height="8"
                              viewBox="0 0 32 8"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle
                                cx="4"
                                cy="4"
                                r="4"
                                fill="var(--browser-graphic-dots-color)"
                              />
                              <circle
                                cx="16"
                                cy="4"
                                r="4"
                                fill="var(--browser-graphic-dots-color)"
                              />
                              <circle
                                cx="28"
                                cy="4"
                                r="4"
                                fill="var(--browser-graphic-dots-color)"
                              />
                            </svg>
                            <div className="browser-graphic__url-box">
                              <div className="browser-graphic__url-box-content">
                                <svg
                                  width="7"
                                  height="8"
                                  viewBox="0 0 7 8"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M1.06342 2V3H0.563415C0.287273 3 0.0634155 3.22386 0.0634155 3.5V6.5C0.0634155 7.32843 0.734988 8 1.56342 8H5.06342C5.89184 8 6.56342 7.32843 6.56342 6.5V3.5C6.56342 3.22386 6.33956 3 6.06342 3H5.56342V2C5.56342 0.895431 4.66798 0 3.56342 0H3.06342C1.95885 0 1.06342 0.895431 1.06342 2ZM4.81342 3V2C4.81342 1.30964 4.25377 0.75 3.56342 0.75H3.06342C2.37306 0.75 1.81342 1.30964 1.81342 2V3H4.81342Z"
                                    fill="#828282"
                                  />
                                </svg>
                                <div className="browser-graphic__url-box-text">
                                  {"dashboard.zenflow.com"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="browser-graphic__page">
                          <div className="platform-graphic-browser-container">
                            <div className="platform-graphic-browser-sidebar">
                              <div className="platform-graphic-browser-sidebar-company">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="platform-graphic-browser-sidebar-company-logo"
                                  width="28"
                                  height="28"
                                  fill="none"
                                  viewBox="0 0 28 28"
                                >
                                  <rect
                                    width="28"
                                    height="28"
                                    fill="#e1e1e1"
                                    rx="14"
                                  />
                                  <path
                                    fill="#6c6c6c"
                                    d="M16.2114 7.93293c-.1027-.32375-.2984-.61367-.5062-.87822-.3866-.49166-1.0292-1.22854-1.7117-1.22854-.6826 0-1.2914.70668-1.6731 1.17901-.2235.27664-.4361.58468-.5448.92775-.1909.60158.7538.85889.9434.25972.1184-.37448.8372-1.34088 1.2745-1.34088s1.156.9664 1.2744 1.34088c.1897.59796 1.1343.34307.9435-.25972m-2.6237 9.89297c-.738-2.1032-2.3785-4.0879-4.3705-5.0893-.81057-.4071-1.67671-.6584-2.57788-.7599-.54119-.0616-1.08721-.0628-1.6296-.0133-.54239.0496-1.21404.0568-1.65134.3733-1.2225.8867.54119 3.1831 1.2225 3.926 1.64892 1.7975 4.00936 1.9811 6.19222 1.0969.5762-.2332.3237-1.1802-.2597-.9435-1.65861.6717-3.47665.7804-4.87793-.4856-.48079-.4349-.86614-.9519-1.18505-1.5148-.12926-.2283-.24764-.4627-.35516-.7019-.14012-.3141-.30683-.5762.14859-.6632 3.05383-.5822 5.82745.7599 7.50165 3.3184.261.3987.4953.8154.6995 1.2467.122.2585.1172.2343.1993.4687.2066.5907 1.1524.3358.9434-.2597z"
                                  />
                                  <rect
                                    width="1.01785"
                                    height="2.60824"
                                    x="13.3647"
                                    y="19.3735"
                                    fill="#6c6c6c"
                                    rx=".508924"
                                  />
                                  <path
                                    fill="#6c6c6c"
                                    d="M12.9381 13.6396c.1462-1.5282-.2537-3.1481-1.2853-4.31018-.8154-.91929-2.00286-1.45927-3.19636-1.68034-1.60906-.29716-1.67188 1.9316-1.69483 3.04172-.01329.6294.96519.6294.97848 0 .01208-.5907.02537-1.29857.26576-1.85183.12926-.29959.21382-.25006.53515-.17275.26334.06282.52548.14013.77795.23677.81665.31529 1.54025.85768 2.00285 1.60781.5726.9278.7405 2.0549.6378 3.1276-.0604.6269.9193.6221.9785 0zm2.403 4.4462c.1329-.3769.4144-.9278.6982-1.3977.6077-1.005 1.3965-1.928 2.3677-2.5984 1.3494-.9314 2.9403-1.2986 4.5675-1.1476.331.0302 1.1114.0024 1.0594.424-.0266.2162-.2017.4796-.2959.6704-.2755.5521-.6077 1.08-1.0256 1.5354-1.4303 1.5571-3.3643 1.6055-5.2404.8456-.5834-.2368-.8371.7103-.2597.9435 1.963.7948 4.0879.7683 5.7441-.662.5895-.5086 1.0691-1.1537 1.4484-1.8313.3044-.5449.8202-1.376.6052-2.015-.3298-.9785-1.9667-.9253-2.8014-.9241-.9845 0-1.969.1824-2.8811.5569-1.4786.6076-2.6878 1.6694-3.6252 2.9499-.5315.726-1.0038 1.5402-1.3034 2.3919-.209.5955.7357.8516.9434.2597zm5.3921-6.9047c.6294 0 .6306-.9785 0-.9785s-.6306.9785 0 .9785"
                                  />
                                  <path
                                    fill="#6c6c6c"
                                    d="M16.024 13.6391c-.1027-1.0727.0653-2.1998.6379-3.1276.4469-.72476 1.1367-1.25507 1.9207-1.57519.2525-.10268.5134-.18241.7767-.24885.3081-.07731.4579-.1812.5992.09181.2766.53393.2718 1.33123.2839 1.91223.0133.6294.9917.6306.9785 0-.023-1.11133-.0858-3.34009-1.6949-3.04172-1.1947.22107-2.3773.76104-3.1964 1.68033-1.0328 1.15969-1.4314 2.78329-1.2853 4.31019.0592.6209 1.0389.6269.9785 0z"
                                  />
                                </svg>
                                <div>{"Zenflow"}</div>
                              </div>
                              <div className="platform-graphic-browser-sidebar-nav">
                                <div>{"Home"}</div>
                                <div className="platform-graphic-browser-sidebar-nav--active">
                                  {"Payments"}
                                </div>
                                <div>{"Reporting"}</div>
                                <div>{"Settings"}</div>
                              </div>
                            </div>
                            <div className="platform-graphic-browser-content">
                              <div className="platform-graphic-browser-content__greeting">
                                {"Hello, Daybreak Yoga"}
                              </div>
                              <div className="platform-graphic-browser-cards">
                                <div className="platform-graphic-browser-card-item platform-graphic-browser-card-item--capital">
                                  <div className="platform-graphic-browser-card-item__placeholder"></div>
                                  <div className="platform-graphic-browser-card-item__gradient"></div>
                                  <div className="platform-graphic-browser-card-item__border"></div>
                                  <div className="platform-graphic-browser-card-item__content">
                                    <div className="platform-graphic-browser-card-item__capital-content">
                                      <div className="platform-graphic-browser-card-item__capital-copy">
                                        <div className="platform-graphic-browser-content__label platform-graphic-browser-card-item__capital-header">
                                          <div>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="10"
                                              height="10"
                                              fill="none"
                                              viewBox="0 0 10 10"
                                            >
                                              <path
                                                fill="#5f5f5f"
                                                d="M2.5 6.09375c0-.25888.20987-.46875.46875-.46875h1.25c.25888 0 .46875.20987.46875.46875s-.20987.46875-.46875.46875h-1.25c-.25888 0-.46875-.20987-.46875-.46875M2.96875 3.125c-.25888 0-.46875.20987-.46875.46875s.20987.46875.46875.46875h3.75c.25888 0 .46875-.20987.46875-.46875S6.97763 3.125 6.71875 3.125z"
                                              />
                                              <path
                                                fill="#5f5f5f"
                                                fillRule="evenodd"
                                                d="M.625 7.8125v-5.625c0-.86294.69956-1.5625 1.5625-1.5625h5.625c.86295 0 1.5625.69956 1.5625 1.5625v4.16973c0 .33152-.13169.64947-.36611.88389L7.24112 9.00888c-.23442.23442-.55237.36612-.88389.36612H2.1875C1.32455 9.375.625 8.67544.625 7.8125m.9375 0v-5.625c0-.34518.27982-.625.625-.625h5.625c.34518 0 .625.27982.625.625v3.125H6.40625c-.60406 0-1.09375.48969-1.09375 1.09375V8.4375h-3.125c-.34518 0-.625-.27982-.625-.625m4.6875.625h.10723c.08288 0 .16237-.03292.22097-.09153L8.34597 6.5782c.05861-.0586.09153-.13809.09153-.22097V6.25H6.40625c-.08629 0-.15625.06995-.15625.15625z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          </div>
                                          <div>{"Action required"}</div>
                                        </div>
                                        <div>
                                          {
                                            "To make sure your business is supportable, we need to collect additional information."
                                          }
                                        </div>
                                      </div>
                                      <div className="platform-graphic-browser-card-item__capital-button">
                                        <div className="platform-graphic-browser-content__button-container">
                                          <div className="platform-graphic-browser-content__button">
                                            {"Add information"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="platform-graphic-browser-card-item platform-graphic-browser-card-item--payouts">
                                  <div className="platform-graphic-browser-card-item__placeholder"></div>
                                  <div className="platform-graphic-browser-card-item__gradient"></div>
                                  <div className="platform-graphic-browser-card-item__border"></div>
                                  <div className="platform-graphic-browser-card-item__content">
                                    <div className="platform-graphic-browser-card-item__payouts-content">
                                      <div className="platform-graphic-browser-content__label">
                                        {"Total balance"}
                                      </div>
                                      <div className="platform-graphic-browser-card-item__payouts-balance--amount tabular-nums--tight">
                                        {"$820.56"}
                                      </div>
                                      <div className="platform-graphic-browser-card-item__payouts-available">
                                        <div className="platform-graphic-browser-card-item__payouts-available-label">
                                          {"Available to pay out"}
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payouts-available-amount tabular-nums--tight">
                                          {"$341.80"}
                                        </div>
                                      </div>
                                      <div className="platform-graphic-browser-content__button-container">
                                        <div className="platform-graphic-browser-content__button">
                                          {"Pay out"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="platform-graphic-browser-card-item platform-graphic-browser-card-item--notification">
                                  <div className="platform-graphic-browser-card-item__placeholder"></div>
                                  <div className="platform-graphic-browser-card-item__gradient"></div>
                                  <div className="platform-graphic-browser-card-item__border"></div>
                                  <div className="platform-graphic-browser-card-item__content">
                                    <div className="platform-graphic-browser-card-item__notification-content">
                                      <div className="platform-graphic-browser-content__label">
                                        {"Expires on "}
                                        <span className="tabular-nums--tight">
                                          {"Jan 12"}
                                        </span>
                                      </div>
                                      <div className="platform-graphic-browser-card-item__title">
                                        {"You’re pre-qualified for up to "}
                                        <span className="tabular-nums--tight">
                                          {"$37,000"}
                                        </span>
                                        {" in financing"}
                                      </div>
                                      <div className="platform-graphic-browser-card-item__description">
                                        {
                                          "If approved, you’ll receive funds in as little as one to two business days."
                                        }
                                      </div>
                                      <div className="platform-graphic-browser-content__button-container">
                                        <div className="platform-graphic-browser-content__button">
                                          {"Start application"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="platform-graphic-browser-card-item platform-graphic-browser-card-item--payments">
                                  <div className="platform-graphic-browser-card-item__placeholder"></div>
                                  <div className="platform-graphic-browser-card-item__gradient"></div>
                                  <div className="platform-graphic-browser-card-item__border"></div>
                                  <div className="platform-graphic-browser-card-item__content">
                                    <div className="platform-graphic-browser-card-item__payments-content">
                                      <div className="platform-graphic-browser-card-item__payments-header">
                                        {"Payments"}
                                      </div>
                                      <div className="platform-graphic-browser-card-item__payments-table">
                                        <div className="platform-graphic-browser-card-item__payments-table-row platform-graphic-browser-card-item__payments-table-row--header">
                                          <div>{"Amount"}</div>
                                          <div>{"Status"}</div>
                                          <div>{"Payment Method"}</div>
                                          <div>{"Description"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$15.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>
                                            {"Mastercard ••••"}
                                            <span className="tabular-nums--tight">
                                              {"1234"}
                                            </span>
                                          </div>
                                          <div>{"Single class"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$15.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--disputed">
                                              {"Disputed"}
                                            </span>
                                          </div>
                                          <div>
                                            {"Visa ••••"}
                                            <span className="tabular-nums--tight">
                                              {"4010"}
                                            </span>
                                          </div>
                                          <div>{"Single class"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$999.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>{"Klarna"}</div>
                                          <div>{"Annual subscription"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$119.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>
                                            {"AMEX ••••"}
                                            <span className="tabular-nums--tight">
                                              {"0608"}
                                            </span>
                                          </div>
                                          <div>{"Monthly subscription"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$15.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>
                                            {"Apple Pay ••••"}
                                            <span className="tabular-nums--tight">
                                              {"5678"}
                                            </span>
                                          </div>
                                          <div>{"Single class"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$15.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--refunded">
                                              {"Refunded"}
                                            </span>
                                          </div>
                                          <div>
                                            {"Google Pay ••••"}
                                            <span className="tabular-nums--tight">
                                              {"1224"}
                                            </span>
                                          </div>
                                          <div>{"Single class"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$15.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>{"PayPal"}</div>
                                          <div>{"Single class"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$119.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>
                                            {"Visa ••••"}
                                            <span className="tabular-nums--tight">
                                              {"4010"}
                                            </span>
                                          </div>
                                          <div>{"Monthly subscription"}</div>
                                        </div>
                                        <div className="platform-graphic-browser-card-item__payments-table-row">
                                          <div className="tabular-nums--tight">
                                            {"$119.99"}
                                          </div>
                                          <div>
                                            <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                              {"Succeeded"}
                                            </span>
                                          </div>
                                          <div>
                                            {"Mastercard ••••"}
                                            <span className="tabular-nums--tight">
                                              {"1234"}
                                            </span>
                                          </div>
                                          <div>{"Monthly subscription"}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="dom-graphic dom-graphic--variant-default platform-graphic__dom__phone"
                    data-status="measuring"
                    role="img"
                    aria-label="The payments dashboard for Daybreak Yoga showing an available balance, a notice to provide more information, and a recent activity log of transactions including several payments that have succeeded and one that was disputed."
                    style={{
                      "--graphic-source-width": "336px",
                      "--graphic-source-height": "686px",
                      "--graphic-aspect-ratio": "336 / 686",
                      "--graphic-scale": "1",
                      "--graphic-max-width": "336px",
                    }}
                  >
                    <div
                      className="dom-graphic__content dom-graphic__content--horizontal-scale-left"
                      aria-hidden="true"
                    >
                      <div
                        className="phone-graphic"
                        style={{
                          "--phone-graphic-width": "336px",
                          "--phone-graphic-height": "686px",
                          "--phone-graphic-mobile-width": "356px",
                          "--phone-graphic-mobile-height": "706px",
                        }}
                      >
                        <div className="phone-graphic__screen">
                          <div className="platform-graphic__phone-wrapper">
                            <div className="platform-graphic__phone-header">
                              <div className="platform-graphic__phone-header-logo">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="28"
                                  height="28"
                                  fill="none"
                                  viewBox="0 0 28 28"
                                >
                                  <rect
                                    width="28"
                                    height="28"
                                    fill="#e1e1e1"
                                    rx="14"
                                  />
                                  <path
                                    fill="#6c6c6c"
                                    d="M16.2114 7.93293c-.1027-.32375-.2984-.61367-.5062-.87822-.3866-.49166-1.0292-1.22854-1.7117-1.22854-.6826 0-1.2914.70668-1.6731 1.17901-.2235.27664-.4361.58468-.5448.92775-.1909.60158.7538.85889.9434.25972.1184-.37448.8372-1.34088 1.2745-1.34088s1.156.9664 1.2744 1.34088c.1897.59796 1.1343.34307.9435-.25972m-2.6237 9.89297c-.738-2.1032-2.3785-4.0879-4.3705-5.0893-.81057-.4071-1.67671-.6584-2.57788-.7599-.54119-.0616-1.08721-.0628-1.6296-.0133-.54239.0496-1.21404.0568-1.65134.3733-1.2225.8867.54119 3.1831 1.2225 3.926 1.64892 1.7975 4.00936 1.9811 6.19222 1.0969.5762-.2332.3237-1.1802-.2597-.9435-1.65861.6717-3.47665.7804-4.87793-.4856-.48079-.4349-.86614-.9519-1.18505-1.5148-.12926-.2283-.24764-.4627-.35516-.7019-.14012-.3141-.30683-.5762.14859-.6632 3.05383-.5822 5.82745.7599 7.50165 3.3184.261.3987.4953.8154.6995 1.2467.122.2585.1172.2343.1993.4687.2066.5907 1.1524.3358.9434-.2597z"
                                  />
                                  <rect
                                    width="1.01785"
                                    height="2.60824"
                                    x="13.3647"
                                    y="19.3735"
                                    fill="#6c6c6c"
                                    rx=".508924"
                                  />
                                  <path
                                    fill="#6c6c6c"
                                    d="M12.9381 13.6396c.1462-1.5282-.2537-3.1481-1.2853-4.31018-.8154-.91929-2.00286-1.45927-3.19636-1.68034-1.60906-.29716-1.67188 1.9316-1.69483 3.04172-.01329.6294.96519.6294.97848 0 .01208-.5907.02537-1.29857.26576-1.85183.12926-.29959.21382-.25006.53515-.17275.26334.06282.52548.14013.77795.23677.81665.31529 1.54025.85768 2.00285 1.60781.5726.9278.7405 2.0549.6378 3.1276-.0604.6269.9193.6221.9785 0zm2.403 4.4462c.1329-.3769.4144-.9278.6982-1.3977.6077-1.005 1.3965-1.928 2.3677-2.5984 1.3494-.9314 2.9403-1.2986 4.5675-1.1476.331.0302 1.1114.0024 1.0594.424-.0266.2162-.2017.4796-.2959.6704-.2755.5521-.6077 1.08-1.0256 1.5354-1.4303 1.5571-3.3643 1.6055-5.2404.8456-.5834-.2368-.8371.7103-.2597.9435 1.963.7948 4.0879.7683 5.7441-.662.5895-.5086 1.0691-1.1537 1.4484-1.8313.3044-.5449.8202-1.376.6052-2.015-.3298-.9785-1.9667-.9253-2.8014-.9241-.9845 0-1.969.1824-2.8811.5569-1.4786.6076-2.6878 1.6694-3.6252 2.9499-.5315.726-1.0038 1.5402-1.3034 2.3919-.209.5955.7357.8516.9434.2597zm5.3921-6.9047c.6294 0 .6306-.9785 0-.9785s-.6306.9785 0 .9785"
                                  />
                                  <path
                                    fill="#6c6c6c"
                                    d="M16.024 13.6391c-.1027-1.0727.0653-2.1998.6379-3.1276.4469-.72476 1.1367-1.25507 1.9207-1.57519.2525-.10268.5134-.18241.7767-.24885.3081-.07731.4579-.1812.5992.09181.2766.53393.2718 1.33123.2839 1.91223.0133.6294.9917.6306.9785 0-.023-1.11133-.0858-3.34009-1.6949-3.04172-1.1947.22107-2.3773.76104-3.1964 1.68033-1.0328 1.15969-1.4314 2.78329-1.2853 4.31019.0592.6209 1.0389.6269.9785 0z"
                                  />
                                </svg>
                                <div>{"Zenflow"}</div>
                              </div>
                              <div>{"Hello, Daybreak Yoga"}</div>
                            </div>
                            <div className="platform-graphic__phone-content">
                              <div className="platform-graphic__phone-content-placeholder">
                                <div className="platform-graphic__phone-content-placeholder-top"></div>
                                <div className="platform-graphic__phone-content-placeholder-bottom"></div>
                              </div>
                              <div className="platform-graphic__phone-content-container platform-graphic__phone-content-capital">
                                <div className="platform-graphic__phone-content-gradient"></div>
                                <div className="platform-graphic__phone-content-border"></div>
                                <div className="platform-graphic__phone-content-wrap">
                                  <div>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="10"
                                      height="10"
                                      fill="none"
                                      viewBox="0 0 10 10"
                                    >
                                      <path
                                        fill="#5f5f5f"
                                        d="M2.5 6.09375c0-.25888.20987-.46875.46875-.46875h1.25c.25888 0 .46875.20987.46875.46875s-.20987.46875-.46875.46875h-1.25c-.25888 0-.46875-.20987-.46875-.46875M2.96875 3.125c-.25888 0-.46875.20987-.46875.46875s.20987.46875.46875.46875h3.75c.25888 0 .46875-.20987.46875-.46875S6.97763 3.125 6.71875 3.125z"
                                      />
                                      <path
                                        fill="#5f5f5f"
                                        fillRule="evenodd"
                                        d="M.625 7.8125v-5.625c0-.86294.69956-1.5625 1.5625-1.5625h5.625c.86295 0 1.5625.69956 1.5625 1.5625v4.16973c0 .33152-.13169.64947-.36611.88389L7.24112 9.00888c-.23442.23442-.55237.36612-.88389.36612H2.1875C1.32455 9.375.625 8.67544.625 7.8125m.9375 0v-5.625c0-.34518.27982-.625.625-.625h5.625c.34518 0 .625.27982.625.625v3.125H6.40625c-.60406 0-1.09375.48969-1.09375 1.09375V8.4375h-3.125c-.34518 0-.625-.27982-.625-.625m4.6875.625h.10723c.08288 0 .16237-.03292.22097-.09153L8.34597 6.5782c.05861-.0586.09153-.13809.09153-.22097V6.25H6.40625c-.08629 0-.15625.06995-.15625.15625z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                  <div>{"Your information is in review"}</div>
                                </div>
                              </div>
                              <div className="platform-graphic__phone-content-container platform-graphic__phone-content-payouts">
                                <div className="platform-graphic__phone-content-gradient"></div>
                                <div className="platform-graphic__phone-content-border"></div>
                                <div className="platform-graphic__phone-content-wrap">
                                  <div>{"Total balance"}</div>
                                  <div className="platform-graphic__phone-content-payouts-balance--amount tabular-nums--tight">
                                    {"$820.56"}
                                  </div>
                                  <div className="platform-graphic__phone-content-payouts-available">
                                    <div>{"Available to pay out"}</div>
                                    <div className="platform-graphic__phone-content-payouts-available--amount tabular-nums--tight">
                                      {"$341.80"}
                                    </div>
                                  </div>
                                  <div className="platform-graphic__phone-content-button">
                                    {"Pay out"}
                                  </div>
                                </div>
                              </div>
                              <div className="platform-graphic__phone-content-container platform-graphic__phone-content-notification">
                                <div className="platform-graphic__phone-content-gradient"></div>
                                <div className="platform-graphic__phone-content-border"></div>
                                <div className="platform-graphic__phone-content-wrap">
                                  <div>
                                    {"Expires on "}
                                    <span className="tabular-nums--tight">
                                      {"Jan 12"}
                                    </span>
                                  </div>
                                  <div className="platform-graphic__phone-content-notification-title">
                                    {"You’re pre-qualified for up to "}
                                    <span className="tabular-nums--tight">
                                      {"$37,000"}
                                    </span>
                                    {" in financing"}
                                  </div>
                                  <div className="platform-graphic__phone-content-notification-description">
                                    {
                                      "If approved, you’ll receive funds in as little as one to two business days."
                                    }
                                  </div>
                                  <div className="platform-graphic__phone-content-button">
                                    {"Start application"}
                                  </div>
                                </div>
                              </div>
                              <div className="platform-graphic__phone-content-container platform-graphic__phone-content-payments">
                                <div className="platform-graphic__phone-content-gradient"></div>
                                <div className="platform-graphic__phone-content-border"></div>
                                <div className="platform-graphic__phone-content-wrap">
                                  <div className="platform-graphic__phone-content-payments-title">
                                    {"Payments"}
                                  </div>
                                  <div className="platform-graphic__phone-content-payments-table">
                                    <div className="platform-graphic__phone-content-payments-table-row platform-graphic__phone-content-payments-table-row--header">
                                      <div>{"Amount"}</div>
                                      <div>{"Status"}</div>
                                      <div>{"Payment Method"}</div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$15.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>
                                        {"Mastercard ••••"}
                                        <span className="tabular-nums--tight">
                                          {"1234"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$15.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--disputed">
                                          {"Disputed"}
                                        </span>
                                      </div>
                                      <div>
                                        {"Visa ••••"}
                                        <span className="tabular-nums--tight">
                                          {"4010"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$999.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>{"Klarna"}</div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$119.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>
                                        {"AMEX ••••"}
                                        <span className="tabular-nums--tight">
                                          {"0608"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$15.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>
                                        {"Apple Pay ••••"}
                                        <span className="tabular-nums--tight">
                                          {"5678"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$15.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--refunded">
                                          {"Refunded"}
                                        </span>
                                      </div>
                                      <div>
                                        {"Google Pay ••••"}
                                        <span className="tabular-nums--tight">
                                          {"1224"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$15.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>{"PayPal"}</div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$119.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>
                                        {"Visa ••••"}
                                        <span className="tabular-nums--tight">
                                          {"4010"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="platform-graphic__phone-content-payments-table-row">
                                      <div className="tabular-nums--tight">
                                        {"$119.99"}
                                      </div>
                                      <div>
                                        <span className="platform-graphic__status-label platform-graphic__status-label--succeeded">
                                          {"Succeeded"}
                                        </span>
                                      </div>
                                      <div>
                                        {"Mastercard ••••"}
                                        <span className="tabular-nums--tight">
                                          {"1234"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="platform-graphic__features">
                  <div
                    className="platform-graphic-features"
                    style={{ height: "89px" }}
                  >
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__payments"
                      style={{
                        height: "89px",
                        opacity: "0",
                        transform: "translate3d(0px, 30px, 0px)",
                      }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Payments"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show a list of payments with export, refund, and dispute capabilities."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'payments'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__capital"
                      style={{
                        height: "89px",
                        opacity: "0",
                        transform: "translate3d(0px, 30px, 0px)",
                      }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Capital financing promotion"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show a connected account's financing offer and allow them to apply."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'capital-financing-promotion'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__payouts"
                      style={{
                        height: "89px",
                        opacity: "0",
                        transform: "translate3d(0px, 30px, 0px)",
                      }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Payouts"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show total balance and allow a connected account to initiate payouts."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'payouts'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="platform-graphic__feature-card__container platform-graphic-features__notification"
                      style={{
                        height: "89px",
                        opacity: "0",
                        transform: "translate3d(0px, 30px, 0px)",
                      }}
                    >
                      <div className="platform-graphic__feature-card__shadow"></div>
                      <div className="platform-graphic__feature-card__wrap">
                        <div className="platform-graphic__feature-card__content">
                          <div className="platform-graphic__feature-card__title">
                            {"Notification banner"}
                          </div>
                          <div className="platform-graphic__feature-card__description">
                            {
                              "Show a banner listing required actions for risk and onboarding."
                            }
                          </div>
                        </div>
                        <div className="platform-graphic__feature-card__code-snippet-container">
                          <div className="platform-graphic__feature-card__code-snippet">
                            {"stripeConnectInstance."}
                            <span className="platform-graphic__feature-card__code-snippet--blue">
                              {"create"}
                            </span>
                            {"("}
                            <span>
                              <span className="platform-graphic__feature-card__code-snippet--green">
                                {"'notification-banner'"}
                              </span>
                            </span>
                            {");"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className={`platform-graphic__replay-button${done ? " platform-graphic__replay-button--visible" : ""}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    replay?.();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 12 12"
                  >
                    <path
                      fill="#888888"
                      d="M1.5 6c0-2.636 2.15-4.312 4.313-4.312 1.801 0 3.389 1.182 3.821 3.187H6.75a.656.656 0 1 0 0 1.313h4.406a.656.656 0 0 0 .656-.657V1.125a.656.656 0 0 0-1.312 0v2.248C9.616 1.496 7.796.374 5.813.374 3.025.375.188 2.543.188 6s2.837 5.588 5.625 5.588c1.484 0 2.891-.55 3.964-1.623a.656.656 0 1 0-.928-.928 4.26 4.26 0 0 1-3.036 1.275C3.649 10.313 1.5 8.637 1.5 6"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div
            className="columns columns--auto columns-row-gap"
            style={{
              "--columns-row-gap-mb": "var(--hds-space-core-300)",
              "--columns-row-gap-tb": "var(--hds-space-core-400)",
            }}
          >
            <div className="feature-detail">
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
                    fill="url(#fast-forward-gradient-id-:R2dbnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.75 11.2529V12.7461L4 21L4 3L15.75 11.2529ZM5.5 18.1133L14.2021 12L5.5 5.8877L5.5 18.1133Z"
                  />
                  <path
                    fill="url(#fast-forward-gradient-id-:R2dbnmr6l6:)"
                    d="M22 11.4287V12.5703L10 21V16.7852L11.5 15.7314V18.1133L20.2021 12H20.2051L10 4.83105V3L22 11.4287Z"
                  />
                  <defs>
                    <linearGradient
                      id="fast-forward-gradient-id-:R2dbnmr6l6:"
                      x1="16.267"
                      y1="21"
                      x2="9.65783"
                      y2="3.00008"
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
              <div className="feature-detail__content">
                <h4 className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                  {"Get to market faster."}
                </h4>
                <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                  {
                    "Launch and scale payments products with lower operational overhead using embedded components and no-code tools."
                  }
                </p>
              </div>
              <div className="feature-detail__footer">
                <a
                  className="hds-link hds-link--callout"
                  href="/guides/best-practices-for-launching-and-scaling-platform-payments"
                  data-analytics-label="get_to_market__read_the_guide"
                >
                  {"Read the guide"}
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
                          <clipPath id=":Rsdbnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Rsdbnmr6l6:)">
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
            <div className="feature-detail">
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
                    fill="url(#arrow-growth-gradient-id-:R2lbnmr6l6:)"
                    d="M9.36859 9.53092L12.9038 13.0661L18.3921 7.57774L14.7958 8.14812L13.4849 6.83714L20.1982 5.77234L21.2589 6.833L20.1937 13.546L18.8831 12.2354L19.4538 8.63736L12.9038 15.1874L9.36824 11.6519L2.82751 18.1926L1.76685 17.132L9.36859 9.53092Z"
                  />
                  <defs>
                    <linearGradient
                      id="arrow-growth-gradient-id-:R2lbnmr6l6:"
                      x1="15.0507"
                      y1="5.77234"
                      x2="11.9241"
                      y2="19.1356"
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
              <div className="feature-detail__content">
                <h4 className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                  {"Grow new lines of revenue."}
                </h4>
                <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                  {
                    "Monetize platform transactions—including payments, card interchange, and financing fees."
                  }
                </p>
              </div>
              <div className="feature-detail__footer">
                <a
                  className="hds-link hds-link--callout"
                  href="/guides/introduction-to-monetizing-payments"
                  data-analytics-label="grow_new_lines__read_the_guide"
                >
                  {"Read the guide"}
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
                          <clipPath id=":Rslbnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Rslbnmr6l6:)">
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
            <div className="feature-detail">
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
                    fill="url(#shield-gradient-id-:R2tbnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M21 9.44629C21 15.5177 16.6024 19.468 11.999 22.5 7.39625 19.4674 3 15.5176 3 9.44629V3h18zm-16.5 0c0 4.62111 2.92882 7.93331 6.75 10.71291V4.5H4.5zm8.25 10.71191c3.8211-2.779 6.75-6.0915 6.75-10.71191V4.5h-6.75z"
                  />
                  <defs>
                    <linearGradient
                      id="shield-gradient-id-:R2tbnmr6l6:"
                      x1="15.267"
                      x2="7.66716"
                      y1="3"
                      y2="22.1058"
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
              <div className="feature-detail__content">
                <h4 className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                  {"Manage platform risk."}
                </h4>
                <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                  {
                    "Stay ahead of global regulations with tools for compliance, credit risk, fraud prevention, and account security."
                  }
                </p>
              </div>
              <div className="feature-detail__footer">
                <a
                  className="hds-link hds-link--callout"
                  href="/guides/introduction-to-risk-management"
                  data-analytics-label="manage_platform_risk___read_the_guide"
                >
                  {"Read the guide"}
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
                          <clipPath id=":Rstbnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Rstbnmr6l6:)">
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
        <div className="testimonial-carousel-container">
          <div>
            <div className="testimonial-carousel__cards">
              <div className="testimonial-card testimonial-carousel__card">
                <picture className="testimonial-card__headshot">
                  <source
                    type="image/webp"
                    srcSet="/stripe/KurtisMoyer-w48-06301521-mono.webp 1x, /stripe/KurtisMoyer-w96-358d8e91-mono.webp 2x"
                  />
                  <img
                    loading="lazy"
                    width="96"
                    height="96"
                    alt=""
                    srcSet="/stripe/KurtisMoyer-w48-539cedc7-mono.png 1x, /stripe/KurtisMoyer-w96-0daa2ad0-mono.png 2x"
                    src="/stripe/KurtisMoyer-w48-539cedc7-mono.png"
                  />
                </picture>
                <q className="testimonial-card__quote">
                  {
                    "With Stripe, we have a global technology partner to help our customers—from Canadian yoga studios to British boxing classes—keep growing and evolving in a new wellness world."
                  }
                </q>
                <div className="testimonial-card__author">
                  {"Kurtis Moyer, "}
                  <span className="testimonial-card__author-role">
                    {"Lead Product Manager of Payments, Mindbody"}
                  </span>
                </div>
                <a
                  className="hds-link hds-link--callout"
                  href="/customers/mindbody"
                  data-analytics-label="mindbody__read_the_story"
                >
                  {"Read the story"}
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
                          <clipPath id=":R1obrnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:R1obrnmr6l6:)">
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
              <div className="testimonial-card testimonial-carousel__card">
                <picture className="testimonial-card__headshot">
                  <source
                    type="image/webp"
                    srcSet="/stripe/testimonial-headshot-jobber-w48-ca56e281-mono.webp 1x, /stripe/testimonial-headshot-jobber-w96-19307fdd-mono.webp 2x"
                  />
                  <img
                    loading="lazy"
                    width="96"
                    height="96"
                    alt=""
                    srcSet="/stripe/testimonial-headshot-jobber-w48-cebd0588-mono.png 1x, /stripe/testimonial-headshot-jobber-w96-0cfe9745-mono.png 2x"
                    src="/stripe/testimonial-headshot-jobber-w48-cebd0588-mono.png"
                  />
                </picture>
                <q className="testimonial-card__quote">
                  {
                    "Without Stripe, it would have taken significant time and engineering effort to offer these resources to our customers. The financial infrastructure Stripe offers is incredibly valuable to Jobber, and we look forward to seeing what comes next."
                  }
                </q>
                <div className="testimonial-card__author">
                  {"Laura Collinson, "}
                  <span className="testimonial-card__author-role">
                    {"Director of Fintech, Jobber"}
                  </span>
                </div>
                <a
                  className="hds-link hds-link--callout"
                  href="/customers/jobber"
                  data-analytics-label="jobber__read_the_story"
                >
                  {"Read the story"}
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
                          <clipPath id=":R1ojrnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:R1ojrnmr6l6:)">
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
              <div className="testimonial-card testimonial-carousel__card">
                <picture className="testimonial-card__headshot">
                  <source
                    type="image/webp"
                    srcSet="/stripe/testimonial-headshot-substack-w48-18ac692b-mono.webp 1x, /stripe/testimonial-headshot-substack-w96-c1c8bb55-mono.webp 2x"
                  />
                  <img
                    loading="lazy"
                    width="96"
                    height="96"
                    alt=""
                    srcSet="/stripe/testimonial-headshot-substack-w48-16f00f37-mono.png 1x, /stripe/testimonial-headshot-substack-w96-d28e3cff-mono.png 2x"
                    src="/stripe/testimonial-headshot-substack-w48-16f00f37-mono.png"
                  />
                </picture>
                <q className="testimonial-card__quote">
                  {
                    "Stripe makes the subscriptions and payment piece really easy for everyone involved. And that helps us make it easy for writers and other creators to do the work they want to do on Substack and get paid for it."
                  }
                </q>
                <div className="testimonial-card__author">
                  {"Seth McMillan, "}
                  <span className="testimonial-card__author-role">
                    {"Engineering Manager, Substack"}
                  </span>
                </div>
                <a
                  className="hds-link hds-link--callout"
                  href="/customers/substack"
                  data-analytics-label="substack__read_the_story"
                >
                  {"Read the story"}
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
                          <clipPath id=":R1orrnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:R1orrnmr6l6:)">
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
              <div className="testimonial-card testimonial-carousel__card">
                <picture className="testimonial-card__headshot">
                  <source
                    type="image/webp"
                    srcSet="/stripe/testimonial-headshot-lightspeed-w48-f6d58adf-mono.webp 1x, /stripe/testimonial-headshot-lightspeed-w96-443e186e-mono.webp 2x"
                  />
                  <img
                    loading="lazy"
                    width="96"
                    height="96"
                    alt=""
                    srcSet="/stripe/testimonial-headshot-lightspeed-w48-34ac3ed6-mono.png 1x, /stripe/testimonial-headshot-lightspeed-w96-d760c52f-mono.png 2x"
                    src="/stripe/testimonial-headshot-lightspeed-w48-34ac3ed6-mono.png"
                  />
                </picture>
                <q className="testimonial-card__quote">
                  {
                    "Stripe offers an enterprise-grade infrastructure that puts our customers on the cutting edge of modern payments technology. The combination of Terminal and Connect is a powerful integrated solution."
                  }
                </q>
                <div className="testimonial-card__author">
                  {"Dax Dasilva, "}
                  <span className="testimonial-card__author-role">
                    {"Founder and CEO, Lightspeed"}
                  </span>
                </div>
                <a
                  className="hds-link hds-link--callout"
                  href="/customers/lightspeed-terminal"
                  data-analytics-label="lightspeed__read_the_story"
                >
                  {"Read the story"}
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
                          <clipPath id=":R1p3rnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:R1p3rnmr6l6:)">
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
          <div className="testimonial-carousel__navigation">
            <div className="testimonial-carousel__navigation-divider"></div>
            <div className="testimonial-carousel__navigation-selection">
              <div
                className="testimonial-carousel__navigation-selection-bar"
                style={{ transform: "translateX(0%)", width: "25%" }}
              ></div>
            </div>
          </div>
          <div className="testimonial-carousel__navigation-customers">
            <div
              className="testimonial-carousel__navigation-customers-inner"
              style={{ transform: "translateX(0px)" }}
            >
              <button
                type="button"
                className="hds-button testimonial-carousel__navigation-button testimonial-carousel__navigation-button--active hds-button--primary"
                aria-label="Show testimonial from Mindbody"
              >
                <div className="">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="150"
                    height="36"
                    fill="none"
                    viewBox="0 0 200 48"
                    aria-hidden="true"
                  >
                    <g transform="translate(0, -0.4)">
                      <path
                        fill="var(--customerLogoColor, #2d2d2d)"
                        d="M59.325 22.764v8.628h-3.273v-7.42c0-2.82-.993-3.854-3.04-3.854-2.045 0-3.214 1.467-3.214 4.112v7.16h-3.273v-7.42c0-2.819-.965-3.854-2.98-3.854-2.22 0-3.273 1.468-3.273 4.113v7.16H37V17.356h3.273v2.07h.058c1.169-1.552 2.747-2.271 4.5-2.271 2.162 0 3.653.949 4.413 2.646 1.402-1.754 3.126-2.646 5.055-2.646 3.273 0 5.026 2.128 5.026 5.608m2.652 8.628h3.273V17.356h-3.273zM63.613 11c-1.227 0-2.192.978-2.192 2.128s.965 2.157 2.192 2.157c1.226 0 2.221-.978 2.221-2.157S64.841 11 63.613 11m12.629 6.155c-1.87 0-3.565.69-4.763 2.272h-.058v-2.071h-3.273v14.036h3.273v-7.16c0-2.647 1.14-4.113 3.536-4.113 2.191 0 3.244 1.035 3.244 3.854v7.42h3.273v-8.628c0-3.48-1.811-5.608-5.23-5.608zm18.36-5.868h3.244V31.39H94.72v-2.014h-.057c-1.023 1.496-2.572 2.244-4.618 2.244-3.944 0-6.926-2.848-6.926-7.191 0-4.344 2.98-7.277 6.897-7.277 1.87 0 3.478.604 4.529 1.927h.058zm.117 13.087c0-2.732-1.548-4.315-4.148-4.315-2.28 0-4.12 1.669-4.12 4.315s1.695 4.315 4.09 4.315c2.396 0 4.18-1.439 4.18-4.315zm20.571.057c0 4.343-2.98 7.19-6.926 7.19-2.045 0-3.593-.747-4.617-2.243h-.058v2.014h-3.127V11.287h3.244v7.794h.058c1.052-1.323 2.66-1.926 4.529-1.926 3.916 0 6.897 3.048 6.897 7.276m-3.331-.057c0-2.646-1.841-4.315-4.12-4.315-2.6 0-4.15 1.582-4.15 4.315 0 2.876 1.695 4.315 4.179 4.315s4.091-1.783 4.091-4.315m19.569.034c-.002 4.253-3.099 7.214-7.481 7.214-4.383 0-7.482-3.106-7.482-7.22s2.961-7.226 7.435-7.247c4.136-.02 7.53 3.182 7.527 7.253zm-3.331-.006c0-2.674-1.811-4.486-4.149-4.486-2.484 0-4.149 1.956-4.149 4.486 0 2.531 1.696 4.43 4.149 4.43 2.309 0 4.149-1.812 4.149-4.43m16.095-13.115h3.244V31.39h-3.127v-2.014h-.058c-1.022 1.496-2.571 2.244-4.617 2.244-3.945 0-6.926-2.848-6.926-7.191 0-4.344 2.98-7.277 6.897-7.277 1.87 0 3.477.604 4.529 1.927h.058zm.117 13.087c0-2.732-1.549-4.315-4.149-4.315-2.28 0-4.12 1.669-4.12 4.315s1.695 4.315 4.091 4.315 4.179-1.439 4.179-4.315zm15.319-7.018v6.701c0 2.646-1.11 4.112-3.448 4.112-2.133 0-3.156-1.035-3.156-3.854v-6.96h-3.273v8.226c0 3.48 1.783 5.608 5.143 5.608 1.84 0 3.624-.747 4.675-2.215h.058v1.15c0 2.474-1.431 3.97-4.237 3.97-2.045 0-3.302-.575-4.851-1.38l-.789 2.819c1.607.949 3.682 1.467 5.815 1.467 5.318 0 7.335-3.193 7.335-7.593V17.356h-3.273z"
                      />
                    </g>
                  </svg>
                </div>
              </button>
              <button
                type="button"
                className="hds-button testimonial-carousel__navigation-button hds-button--primary"
                aria-label="Show testimonial from Jobber"
              >
                <div className="">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="150"
                    height="36"
                    fill="none"
                    viewBox="0 0 200 48"
                    aria-hidden="true"
                  >
                    <g transform="translate(0, -0.8)">
                      <path
                        fill="var(--customerLogoColor, #012939)"
                        d="M69.65 31.482c-.962-.465-1.692-1.128-2.19-1.958a5.3 5.3 0 0 1-.763-2.754l4.877-.498c.1.432.233.797.465 1.03.2.231.53.364.962.364s.697-.1.93-.332c.232-.232.331-.53.331-.962V15.92h5.044v10.352c0 1.162-.266 2.19-.763 3.086q-.747 1.344-2.19 2.09c-.963.498-2.058.73-3.352.73s-2.389-.232-3.351-.73zm15.695-.398c-1.261-.764-2.29-1.759-3.02-3.02-.73-1.26-1.095-2.654-1.095-4.147s.365-2.887 1.095-4.148 1.726-2.29 3.02-3.02a8.4 8.4 0 0 1 4.247-1.128c1.56 0 2.953.365 4.247 1.129 1.294.763 2.29 1.758 3.02 3.019.73 1.26 1.095 2.654 1.095 4.148s-.365 2.886-1.095 4.147-1.726 2.29-3.02 3.02a8.46 8.46 0 0 1-4.247 1.128c-1.56 0-2.953-.365-4.247-1.128m5.873-3.916c.497-.298.896-.763 1.194-1.327.299-.564.432-1.228.432-1.958s-.133-1.393-.432-1.957a3.56 3.56 0 0 0-1.194-1.327 3.2 3.2 0 0 0-1.66-.465c-.597 0-1.16.166-1.658.465-.498.298-.896.763-1.195 1.327s-.431 1.227-.431 1.957.132 1.394.431 1.958.697.995 1.195 1.327a3.2 3.2 0 0 0 1.659.465c.597 0 1.161-.166 1.659-.465m21.999-2.389c.531.63.796 1.46.796 2.422s-.232 1.66-.663 2.39c-.432.696-1.062 1.26-1.892 1.659q-1.244.597-2.887.597h-8.66V15.92h8.13c1.095 0 2.024.199 2.853.564.796.365 1.427.863 1.825 1.493a3.6 3.6 0 0 1 .631 2.057c0 .73-.2 1.527-.565 2.09a3.9 3.9 0 0 1-1.36 1.295c.63.265 1.195.697 1.725 1.36zm-8.229-2.72h1.858c.398 0 .73-.133.995-.366.266-.232.365-.53.365-.895s-.132-.664-.365-.896a1.4 1.4 0 0 0-.995-.365h-1.858zm2.356 6.171q.696 0 1.095-.398a1.4 1.4 0 0 0 .431-1.029c0-.431-.133-.763-.431-1.028-.266-.266-.664-.398-1.095-.398h-2.356v2.853zm21.767-3.45c.53.63.796 1.46.796 2.421 0 .963-.232 1.66-.664 2.39-.431.696-1.062 1.26-1.891 1.659q-1.245.597-2.887.597h-8.66V15.92h8.129c1.095 0 2.024.199 2.854.564.796.365 1.427.863 1.825 1.493.431.63.63 1.327.63 2.057s-.199 1.527-.564 2.09a3.9 3.9 0 0 1-1.36 1.295c.63.265 1.194.697 1.725 1.36zm-8.229-2.722h1.858c.398 0 .73-.132.995-.364.266-.233.365-.531.365-.896s-.133-.664-.365-.896a1.4 1.4 0 0 0-.995-.365h-1.858zm2.355 6.172q.697 0 1.095-.398c.266-.265.432-.597.432-1.029s-.133-.763-.432-1.028c-.265-.266-.663-.398-1.095-.398h-2.355v2.853zm13.538-2.522v1.925h7.201v4.214h-12.244V15.92h12.011v4.214h-6.968v1.692h6.106v3.882zm18.117 6.139-2.754-4.778h-1.028v4.778h-5.044V15.92h7.632c1.194 0 2.256.232 3.185.73s1.626 1.161 2.124 1.99c.497.83.763 1.793.763 2.854s-.232 1.825-.73 2.589c-.465.763-1.161 1.393-2.024 1.89l3.451 5.874zm-4.015-8.66h1.991c.531 0 .929-.166 1.261-.465s.465-.697.465-1.195c0-.497-.166-.895-.465-1.194-.332-.299-.73-.464-1.261-.464h-1.991zm-93.703-9.988c-.133-.133-.266-.199-.431-.199H46.556a8 8 0 0 0-7.997 7.997v10.186c0 .166.067.332.2.432l2.986 2.986c.132.133.265.199.431.199h10.187a8 8 0 0 0 7.996-7.997V16.65a.54.54 0 0 0-.199-.431zm-15.662 7.798v10.65c0 .2-.232.266-.365.134l-.962-.963s-.066-.1-.066-.133v-9.688a6.443 6.443 0 0 1 6.437-6.437h9.125c.1 0 .199.1.199.199v12.044a3.52 3.52 0 0 1-3.517 3.517h-6.106c-.132 0-.232-.132-.199-.298l.365-.962c0-.067.1-.133.2-.133h5.474a2.45 2.45 0 0 0 2.456-2.456V16.152c0-.1-.1-.199-.2-.199h-7.797c-2.787-.033-5.044 2.256-5.044 5.044m4.447 6.238v-5.94c0-.497.398-.929.929-.929h5.94c.099 0 .198.1.198.2v5.939c0 .497-.398.929-.929.929h-5.94c-.099 0-.198-.1-.198-.2m12.874-.432a6.443 6.443 0 0 1-6.437 6.437h-9.158c-.1 0-.2-.1-.2-.199V20.997a3.52 3.52 0 0 1 3.518-3.517h6.138c.133 0 .233.132.2.298l-.365.962c0 .067-.1.133-.2.133h-5.474a2.45 2.45 0 0 0-2.456 2.455v10.386c0 .1.1.2.2.2h7.764a5.077 5.077 0 0 0 5.076-5.078V16.153c0-.199.233-.265.365-.133l.963.963s.066.1.066.133z"
                      />
                    </g>
                  </svg>
                </div>
              </button>
              <button
                type="button"
                className="hds-button testimonial-carousel__navigation-button hds-button--primary"
                aria-label="Show testimonial from Substack"
              >
                <div className="">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="150"
                    height="36"
                    fill="none"
                    viewBox="0 0 200 48"
                    aria-hidden="true"
                  >
                    <g transform="translate(0, -1)">
                      <path
                        fill="var(--customerLogoColor, #ff671a)"
                        fillRule="evenodd"
                        d="M51.108 24.387c.326.004.33.004.33.325q.002 3.765 0 7.531c0 .085.014.172-.037.267-.2-.025-.362-.15-.532-.242-1.336-.729-2.667-1.466-4.001-2.199-.635-.348-1.274-.69-1.906-1.041-.144-.08-.259-.095-.413-.01-.905.505-1.817.997-2.726 1.494q-1.807.988-3.612 1.978c-.067.036-.13.075-.211.041v-8.127c.125-.006.25-.017.375-.017zm.34-3.071q.005.572 0 1.144c-.004.312-.007.313-.343.316h-.301L38 22.778v-1.773q6.553-.003 13.105-.003c.336 0 .34.003.342.314m-13.243-3.663.207.004h12.553c.506 0 .475-.044.473.383v.099c.003.332-.006.665.003.997.005.18-.041.285-.25.261-.074-.008-.15 0-.225 0l-12.59-.001c-.126 0-.251-.011-.376-.017v-1.7a.7.7 0 0 1 .205-.026"
                        clipRule="evenodd"
                      />
                      <path
                        fill="var(--customerLogoColor, #5a5b5d)"
                        fillRule="evenodd"
                        d="M60.94 17.312c1.151-.014 2.242.21 3.258.76.624.337 1.154.781 1.635 1.289.106.112.073.184-.034.27q-.725.588-1.44 1.188c-.13.11-.213.068-.313-.036a3.8 3.8 0 0 0-1.158-.806c-1.04-.486-2.116-.592-3.224-.27-.339.098-.657.258-.89.528-.462.531-.46 1.282-.02 1.838.288.363.7.552 1.096.764.45.241.922.434 1.398.617l.955.36c.924.358 1.805.794 2.615 1.368.922.652 1.429 1.53 1.57 2.623.144 1.118-.041 2.159-.77 3.066-.59.734-1.378 1.186-2.277 1.429-1.832.496-3.63.39-5.36-.421a6.4 6.4 0 0 1-2.036-1.495c-.23-.25-.227-.253.044-.482.428-.36.854-.723 1.285-1.08.248-.204.258-.206.483.013.35.34.723.65 1.152.886 1.285.712 2.605.877 4.004.298 1.129-.468 1.35-1.831.537-2.701-.58-.62-1.317-.968-2.092-1.27-.955-.371-1.93-.703-2.83-1.2-.724-.401-1.423-.837-1.92-1.51-.406-.55-.655-1.158-.671-1.848-.016-.683.02-1.347.365-1.97.487-.88 1.252-1.423 2.169-1.794.79-.32 1.62-.424 2.47-.414m42.866.001c1.209-.02 2.336.23 3.374.815.57.322 1.064.738 1.511 1.21.112.117.104.202-.021.302-.475.382-.95.763-1.416 1.156-.14.119-.227.099-.343-.022a3.9 3.9 0 0 0-1.468-.94c-1.006-.372-2.035-.445-3.058-.073-.571.208-1.001.572-1.061 1.22-.061.668.221 1.166.796 1.517.793.484 1.646.84 2.518 1.154 1.124.405 2.2.896 3.16 1.607.871.644 1.33 1.508 1.459 2.564.115.945.008 1.84-.499 2.67a3.7 3.7 0 0 1-1.588 1.426c-1.502.717-3.082.836-4.702.501a6.85 6.85 0 0 1-3.693-2.076c-.188-.201-.185-.212.037-.397.469-.39.942-.774 1.4-1.176.151-.133.245-.108.37.016.373.368.774.703 1.239.955 1.321.715 2.674.877 4.074.219a1.554 1.554 0 0 0 .901-1.667c-.098-.7-.573-1.123-1.095-1.52-.432-.329-.943-.513-1.44-.715-.684-.277-1.385-.514-2.059-.815-.79-.354-1.547-.768-2.197-1.339-.927-.812-1.29-1.85-1.198-3.05.105-1.383.878-2.32 2.098-2.936.913-.462 1.897-.627 2.901-.606m12.07-5.612c.049.153.028.29.028.424l.001 4.874.001.259c.003.402.004.403.414.404h3.056c.17.004.201.028.206.163l.001 1.767c-.002.198-.023.224-.221.227h-2.986c-.075 0-.151.006-.226 0-.173-.015-.261.048-.246.23.008.097.001.196.001.295l.001 7.976c0 .358.036.714.154 1.055.204.588.565.85 1.197.884.472.025.923-.058 1.362-.228.27-.104.278-.099.37.154.184.51.357 1.024.545 1.532.05.134.024.203-.107.258-1.286.542-2.611.81-3.999.473-1.058-.256-1.645-.967-1.897-1.983-.12-.483-.152-.97-.151-1.464q.002-4.32.001-8.64.002-.13-.001-.26c-.007-.275-.007-.28-.299-.281l-1.809-.002c-.304-.001-.307-.006-.309-.312q-.004-.776 0-1.55c.002-.286.006-.291.287-.293l.867-.002h.866c.395 0 .397-.001.397-.378.001-1.304.009-2.61-.006-3.914-.003-.273.089-.422.33-.547.61-.316 1.205-.658 1.809-.985.106-.057.202-.148.363-.136m-46.811 5.954q1.074.006 2.147.002c.145 0 .205.06.195.2-.005.085 0 .171 0 .258v8.197c0 .642.054 1.277.242 1.898.362 1.197 1.379 1.996 2.65 2.051.656.028 1.302-.022 1.922-.273.743-.3 1.23-.828 1.513-1.551.257-.654.325-1.336.325-2.03q-.003-4.155 0-8.308c0-.41-.047-.441.265-.443h.171q.904-.002 1.809.002c.273.002.273.007.281.26l.001.092v13.793c0 .38.03.433-.209.44h-.234c-.603 0-1.205.003-1.808 0-.267-.003-.272-.009-.276-.27-.005-.327-.001-.653-.001-.994-.176.027-.234.134-.304.207-.91.955-2.04 1.395-3.36 1.408-.849.008-1.684-.095-2.477-.395-1.16-.44-1.965-1.245-2.432-2.377-.324-.783-.482-1.604-.56-2.439a13 13 0 0 1-.048-1.18c-.004-2.708-.002-5.416-.002-8.124 0-.074.003-.148 0-.221-.007-.133.034-.204.19-.203m75.077-.17c1.524.364 2.619 1.248 3.276 2.648.275.587.275.58-.338.786-.499.167-.991.352-1.487.527-.302.107-.309.108-.444-.17-.313-.645-.77-1.144-1.446-1.44-.293-.13-.603-.173-.915-.196-1.632-.12-2.822.556-3.468 2.047-.54 1.245-.607 2.555-.552 3.877.038.901.171 1.788.547 2.625.395.883.981 1.587 1.946 1.882 1.127.345 2.213.242 3.18-.478.442-.329.712-.795.895-1.297.073-.2.15-.211.325-.151.628.215 1.257.427 1.892.622.199.06.221.15.159.322-.28.777-.692 1.476-1.31 2.04-1.331 1.216-2.94 1.585-4.704 1.432-.99-.086-1.92-.363-2.742-.935-.969-.676-1.647-1.574-2.094-2.646-.535-1.285-.715-2.632-.711-4.195-.023-.968.128-2.1.474-3.203.333-1.062.881-2.003 1.705-2.784.794-.753 1.745-1.204 2.818-1.386a7.45 7.45 0 0 1 2.994.074m-19.058.276c1.408-.453 2.854-.552 4.317-.377.924.11 1.781.406 2.508 1.005.721.595 1.138 1.367 1.359 2.246.169.671.234 1.358.234 2.05l-.001 9.195c-.003.36-.003.362-.371.363-.59.001-1.181-.006-1.771.003-.198.003-.265-.067-.258-.257.011-.327.003-.654.003-.973-.149-.036-.192.06-.253.11-1.61 1.337-3.454 1.724-5.498 1.304a4.73 4.73 0 0 1-2.336-1.197 3.74 3.74 0 0 1-.991-1.504c-.412-1.181-.47-2.383-.133-3.596.308-1.108 1.013-1.902 2.014-2.464 1.726-.97 3.556-1.01 5.436-.575a6.3 6.3 0 0 1 1.374.497c.109.054.215.122.382.129.005-.783.032-1.533-.143-2.273-.248-1.055-.942-1.641-1.998-1.86-.84-.174-1.676-.122-2.506.045q-1.494.3-2.739 1.17c-.049.035-.105.063-.185.11-.105-.281-.206-.542-.301-.805-.12-.337-.223-.68-.357-1.01-.074-.186-.035-.287.136-.39a10 10 0 0 1 2.078-.946m-38.355-6.044v7.06c.144.022.178-.073.238-.128.911-.85 1.99-1.298 3.253-1.34 1.036-.035 2.027.116 2.95.598 1.246.648 2.11 1.634 2.674 2.892.727 1.62.864 3.324.763 5.061-.069 1.173-.282 2.32-.78 3.4-.737 1.603-1.914 2.714-3.693 3.143-1.02.245-2.036.263-3.053-.026a5.4 5.4 0 0 1-2.032-1.086c-.066-.056-.13-.114-.2-.166-.017-.014-.047-.012-.072-.017-.098.057-.06.152-.062.232-.005.197 0 .394-.002.59-.004.307-.005.31-.306.313-.402.003-.804 0-1.206 0-.264 0-.528-.008-.791.003-.183.007-.254-.064-.238-.238.007-.073.001-.148.001-.221 0-6.119.003-12.237-.008-18.356 0-.315.1-.487.38-.63.657-.333 1.297-.698 1.945-1.05.052-.028.101-.075.239-.034m66.166.087v10.747c.208-.05.302-.183.407-.291q1.826-1.89 3.647-3.783c.154-.16.32-.314.454-.491.189-.25.413-.348.738-.337.715.024 1.432.006 2.148.008.123 0 .249-.02.371.029-.02.146-.138.212-.221.297q-1.422 1.45-2.849 2.894c-.192.194-.379.393-.575.583-.116.111-.125.207-.045.354.33.608.641 1.226.962 1.838q1.207 2.295 2.416 4.588c.588 1.115 1.174 2.23 1.77 3.34.091.17.134.368.282.508v.147c-.804.003-1.608 0-2.412.013-.216.004-.336-.059-.435-.256-.434-.86-.887-1.71-1.333-2.564q-.705-1.346-1.407-2.693l-1.452-2.793c-.079-.152-.134-.32-.29-.462-.109.091-.228.175-.328.276-.54.549-1.071 1.106-1.616 1.65a.72.72 0 0 0-.226.556c.008 1.958.005 3.916.005 5.874-.001.374.025.406-.24.407h-.159q-.904.002-1.809 0c-.342-.001-.342-.004-.345-.351V13.569q.002-.147 0-.295c-.003-.107.029-.183.133-.24.747-.405 1.49-.816 2.234-1.224.043-.024.091-.043.175-.006M129.13 25.161c-1.098-.235-2.189-.293-3.262.111-.365.138-.714.306-1.007.566-.746.663-.904 1.508-.733 2.43a2.36 2.36 0 0 0 1.162 1.653c.798.467 1.685.555 2.586.428 1.233-.174 2.227-.788 3.05-1.687a.6.6 0 0 0 .181-.462 10 10 0 0 1-.007-.48q.003-.24.004-.48-.002-.24-.007-.48t.013-.48c.02-.25-.083-.38-.297-.49-.537-.274-1.089-.502-1.683-.63m-37.892-5.448c-1.638-.37-3.024.086-4.138 1.312-.191.211-.393.425-.39.767.014 2.09.008 4.182.005 6.272 0 .153.03.284.123.413.8 1.12 1.882 1.72 3.287 1.792 1.44.074 2.72-.733 3.314-2.09.457-1.042.569-2.132.593-3.242.008-.506-.03-1.008-.096-1.509-.117-.874-.35-1.71-.865-2.449-.45-.644-1.058-1.091-1.833-1.266"
                        clipRule="evenodd"
                      />
                    </g>
                  </svg>
                </div>
              </button>
              <button
                type="button"
                className="hds-button testimonial-carousel__navigation-button hds-button--primary"
                aria-label="Show testimonial from Lightspeed"
              >
                <div className="">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="150"
                    height="36"
                    fill="none"
                    viewBox="0 0 200 48"
                    aria-hidden="true"
                  >
                    <g transform="translate(-0.00, -0.70)">
                      <path
                        fill="var(--customerLogoColor, #ed5153)"
                        d="m35.667 5 1.603 2.79c.321.578.321 1.283 0 1.86l-9.558 16.583 4.523 7.826a3.99 3.99 0 0 0 3.432 1.988c1.411 0 2.726-.77 3.432-1.988l4.522-7.826-1.187-2.117L37.303 33c-.321.578-.963.93-1.604.93a1.82 1.82 0 0 1-1.604-.93l-3.945-6.767 8.885-15.396 1.603 2.79c.321.578.321 1.284 0 1.861l-6.19 10.745 1.219 2.117 6.735-11.675 4.426 7.665a3.86 3.86 0 0 1 0 3.817l-4.49 7.794c-.673 1.187-2.822 3.849-6.671 3.849s-5.966-2.662-6.672-3.849l-4.49-7.794a3.86 3.86 0 0 1 0-3.817z"
                      />
                      <path
                        fill="var(--customerLogoColor, #000)"
                        d="M73.642 18.599c3.56 0 6.48 2.502 6.48 6.447 0 1.603-.61 3.816-2.695 4.779 2.117 1.058 2.63 2.598 2.63 4.233 0 3.529-2.694 5.71-6.383 5.71-3.72 0-6.479-2.278-6.479-5.71h3.144c0 1.668 1.507 2.759 3.335 2.759s3.24-.995 3.24-2.759-1.668-2.565-3.24-2.565c-3.977 0-6.479-2.438-6.479-6.415s2.887-6.48 6.447-6.48m51.735 0c3.913 0 6.511 2.918 6.511 6.671 0 3.689-2.373 6.736-6.447 6.736-1.347 0-3.303-.45-4.201-1.829v6.736l-3.144.353V18.888h3.047l.097 1.731c.994-1.41 2.694-2.02 4.137-2.02m-14.529 0c2.02 0 3.528.385 5.003 1.668l-1.764 2.052c-.898-.834-1.956-1.122-3.175-1.122-1.508 0-2.342.449-2.342 1.25 0 1.123 1.316 1.316 2.182 1.38 1.475.096 2.982.192 4.265.994 1.059.642 1.444 1.828 1.379 3.015 0 2.117-1.667 3.528-3.624 3.977-2.598.578-5.452.032-7.505-1.668 0 0-.096-.096-.193-.16l1.604-2.02c.738.48 1.411.865 2.245 1.09a8.8 8.8 0 0 0 2.406.224c.738-.032 1.796-.288 1.956-1.154.257-1.251-1.218-1.476-2.117-1.572-1.315-.16-2.854-.256-4.041-.994a3.49 3.49 0 0 1-1.7-2.983c0-2.95 3.079-3.977 5.421-3.977m-9.911-3.207v3.496h2.79l-.288 2.726h-2.534V27.9c0 .578.096.962.289 1.219s.513.385.898.385c.417 0 .866-.128 1.283-.417l1.09 2.02a5 5 0 0 1-1.443.674 5.5 5.5 0 0 1-1.604.225c-1.187 0-2.117-.353-2.726-1.027-.61-.673-.93-1.668-.93-2.983v-6.35h-2.406V18.92h2.406v-3.176zm74.956-2.085v18.378h-3.047l-.096-1.7c-.994 1.411-2.694 2.02-4.137 2.02-3.913 0-6.511-2.918-6.511-6.639s2.341-6.735 6.414-6.735c1.347 0 3.336.417 4.234 1.796v-7.12zm-36.179 5.292c3.849 0 7.056 2.63 6.736 7.826h-10.456c.352 1.507 1.732 2.822 3.977 2.822 1.154 0 2.694-.577 3.432-1.315l2.02 1.989c-1.347 1.379-3.56 2.053-5.484 2.053-3.978 0-6.864-2.63-6.864-6.704 0-3.849 2.983-6.671 6.639-6.671m14.562 0c3.848 0 7.056 2.63 6.735 7.826h-10.456c.353 1.507 1.732 2.822 3.977 2.822 1.155 0 2.694-.577 3.432-1.315l2.021 1.989c-1.347 1.379-3.561 2.053-5.485 2.053-3.977 0-6.864-2.63-6.864-6.704 0-3.849 2.983-6.671 6.64-6.671m-94.618-5.292v18.378h-3.111V13.307zM65.4 18.92v12.765h-3.143V18.92zm19.854-5.645v7.216c1.154-1.443 2.534-1.892 3.977-1.892 3.624 0 5.228 2.437 5.196 6.19v6.864h-3.143v-6.64c0-2.309-1.22-3.303-2.887-3.303-1.86 0-3.143 1.572-3.143 3.464v6.479H82.11V13.275zm83.584 8.05c-2.149 0-3.592 1.957-3.592 3.945 0 1.957 1.315 4.106 3.592 4.106 2.245 0 3.592-2.117 3.592-4.106s-1.443-3.945-3.592-3.945m-43.716-.096c-2.246 0-3.593 2.117-3.593 4.105s1.444 3.945 3.593 3.945 3.624-1.956 3.592-3.945c0-1.956-1.315-4.105-3.592-4.105m-51.447 0c-1.828 0-3.335 1.636-3.335 3.849 0 2.245 1.507 3.817 3.335 3.817 1.796 0 3.304-1.604 3.304-3.817 0-2.181-1.475-3.85-3.304-3.85m66.04-.032c-1.7 0-3.271 1.155-3.72 2.822h7.409c-.353-1.507-1.861-2.822-3.689-2.822m14.594 0c-1.7 0-3.272 1.155-3.721 2.822h7.409c-.353-1.507-1.86-2.822-3.688-2.822m-90.48-8.179a1.828 1.828 0 1 1 0 3.656 1.828 1.828 0 0 1 0-3.656"
                      />
                    </g>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
