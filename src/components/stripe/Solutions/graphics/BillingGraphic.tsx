"use client";

import { useRef } from "react";
import { useBillingProgress } from "./useBillingProgress";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs ".modular-solutions-bento-card__content-inner" 1).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function BillingGraphic() {
  const wrapper = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  useBillingProgress(wrapper, counter);
  return (
    <>
      <div className="modular-solutions-bento-card__graphic">
        <div
          className="billing-plan-graphic__wrapper"
          style={{ "--progress": "0" }}
          ref={wrapper}
        >
          <div className="billing-plan-graphic__background">
            <div className="billing-plan-graphic__background-gradient-1"></div>
            <div className="billing-plan-graphic__background-gradient-2"></div>
            <div className="billing-plan-graphic__background-gradient-3"></div>
            <div className="billing-plan-graphic__background-gradient-4"></div>
          </div>
          <div
            className="billing-plan-graphic__plan-grid"
            role="img"
            aria-label="Usage-based billing panel for a Pro plan showing a token cost and usage meter, and a bar chart with the number of tokens used over the last 30 days."
          >
            <div
              className="dom-graphic dom-graphic--variant-card"
              style={{
                "--graphic-source-width": "306px",
                "--graphic-source-height": "169px",
                "--graphic-aspect-ratio": "306 / 169",
                "--graphic-scale": "1",
                "--graphic-max-width": "306px",
              }}
              data-status="ready"
              aria-hidden="true"
            >
              <div className="dom-graphic__content dom-graphic__content--horizontal-scale-left">
                <div className="billing-plan-graphic__plan-content">
                  <div className="billing-plan-graphic__plan-overview">
                    <div className="billing-plan-graphic__icon-wrapper">
                      <svg
                        width="19"
                        height="22"
                        viewBox="0 0 19 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="billing-plan-graphic__icon"
                      >
                        <circle
                          cx="9.49984"
                          cy="9.03817"
                          r="2.10572"
                          fill="currentColor"
                        />
                        <path
                          d="m5.24446 14.8277 8.11104 5.2102m2.1787-7.1237c-2.1407 3.3326-6.5777 4.2988-9.91026 2.1581-3.33257-2.1407-4.29876-6.57765-2.15807-9.91022C5.60657 1.82952 10.0435.863324 13.3761 3.00402c3.3326 2.1407 4.2987 6.57765 2.1581 9.91018Z"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="billing-plan-graphic__plan-text">
                      <div className="billing-plan-graphic__plan-name">
                        {"Pro Plan"}
                      </div>
                      <div className="billing-plan-graphic__plan-cadence">
                        {"Billed monthly"}
                      </div>
                    </div>
                  </div>
                  <div className="billing-plan-graphic__plan-item">
                    <div className="billing-plan-graphic__item-title">
                      {"Tokens"}
                    </div>
                    <div className="billing-plan-graphic__item-details">
                      <span className="tabular-nums--tight">{"$0.01"}</span>
                      {" per "}
                      <span className="tabular-nums--tight">{"1,000"}</span>
                      {" units"}
                    </div>
                  </div>
                  <div className="billing-plan-graphic__usage">
                    <div className="billing-plan-graphic__usage-info">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="billing-plan-graphic__usage-icon"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M5.99999 2.24167c-2.45306 0-4.44166 1.98861-4.44166 4.44167 0 .8816.25594 1.70145.69807 2.39167h7.48719c.44211-.69022.69811-1.51007.69811-2.39167 0-2.45306-1.98864-4.44167-4.44171-4.44167M10.2677 10.1c.7502-.93588 1.199-2.12386 1.199-3.41666 0-3.01916-2.44755-5.46667-5.46671-5.46667-3.01915 0-5.466665 2.44751-5.466665 5.46667 0 1.2928.448758 2.48078 1.198995 3.41666z"
                          fill="currentColor"
                        />
                        <path
                          d="M7.76132 4.42004c.10393-.09677.23665-.14405.36869-.14236.13385.00171.26701.05373.3688.15552.10436.10436.15641.24169.15555.37894-.0008.12868-.0481.25728-.14238.35855l-2.44667 2.6279c-.13315.14301-.31448.21329-.49495.20995-.16437-.00304-.32802-.06716-.45388-.19301-.12934-.12934-.19347-.29861-.19312-.46755.00037-.17592.07066-.35149.21006-.48128z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="billing-plan-graphic__usage-text">
                        {"Usage meter"}
                      </span>
                    </div>
                    <div className="billing-plan-graphic__usage-bar">
                      <div className="billing-plan-graphic__usage-progress-wrapper">
                        <div className="billing-plan-graphic__usage-progress"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="dom-graphic dom-graphic--variant-card"
              style={{
                "--graphic-source-width": "306px",
                "--graphic-source-height": "224px",
                "--graphic-aspect-ratio": "306 / 224",
                "--graphic-scale": "1",
                "--graphic-max-width": "306px",
              }}
              data-status="ready"
              aria-hidden="true"
            >
              <div className="dom-graphic__content dom-graphic__content--horizontal-scale-left">
                <div className="billing-plan-graphic__chart-header">
                  <div className="billing-plan-graphic__chart-period">
                    {"Tokens used in the last "}
                    <span className="tabular-nums--tight">{"30"}</span>
                    {" days"}
                  </div>
                  <div className="billing-plan-graphic__chart-title tabular-nums--tight">
                    <span ref={counter}>{"1,500,000,000"}</span>
                  </div>
                </div>
                <div className="billing-plan-graphic__chart">
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "0",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.04697986577181208",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "1",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.08053691275167785",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "2",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.15436241610738255",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "3",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.2214765100671141",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "4",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.31543624161073824",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "5",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.44966442953020136",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "6",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.2483221476510067",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "7",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.28859060402684567",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "8",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.12751677852348994",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "9",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.08053691275167785",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "10",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.33557046979865773",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "11",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.28859060402684567",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "12",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.40939597315436244",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "13",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.5234899328859061",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "14",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.4228187919463087",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "15",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.7583892617449665",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "16",
                      "--bar-total": "31",
                      "--bar-target-scale": "1",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "17",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.5302013422818792",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "18",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.40268456375838924",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "19",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.2684563758389262",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "20",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.33557046979865773",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "21",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.3691275167785235",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "22",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.3221476510067114",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "23",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.47651006711409394",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "24",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.5906040268456376",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "25",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.6375838926174496",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "26",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.7449664429530202",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "27",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.5704697986577181",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "28",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.44966442953020136",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "29",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.40939597315436244",
                    }}
                  ></div>
                  <div
                    className="billing-plan-graphic__bar"
                    style={{
                      "--bar-index": "30",
                      "--bar-total": "31",
                      "--bar-target-scale": "0.5234899328859061",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
