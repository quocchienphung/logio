"use client";

import { useRef } from "react";
import { useConnectTimeline } from "./useConnectTimeline";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs ".modular-solutions-bento-card__content-inner" 5).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function ConnectGraphic() {
  const root = useRef<HTMLDivElement>(null);
  useConnectTimeline(root);
  return (
    <>
      <div className="modular-solutions-bento-card__graphic">
        <div className="lazy-animation lazy-animation--loaded lazy-bento-graphic">
          <div className="connect-platform-dom-graphic-wrapper">
            <div
              className="dom-graphic dom-graphic--variant-default connect-platform-dom-graphic"
              data-status="ready"
              role="img"
              aria-label="Dashboard showing connected accounts with details including country, payment balance, and volume. This is overlaid with an order summary for showing a discount and a final price."
              style={{
                "--graphic-source-width": "1000px",
                "--graphic-source-height": "457px",
                "--graphic-aspect-ratio": "1000 / 457",
                "--graphic-scale": "1",
                "--graphic-max-width": "1000px",
              }}
            >
              <div
                className="dom-graphic__content dom-graphic__content--horizontal-scale-left"
                aria-hidden="true"
              >
                <div className="connect-platform-graphic" ref={root}>
                  <div className="connect-platform-graphic__payment-card">
                    <div
                      className="connect-platform-graphic__payment-card-content connect-platform-graphic__payment-card-content--jackson-hot-yoga"
                      style={{ transform: "translateX(-200%)" }}
                    >
                      <div className="connect-platform-graphic__payment-card-header">
                        <div className="connect-platform-graphic__payment-card-logo">
                          <svg
                            width="29"
                            height="29"
                            viewBox="0 0 29 29"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect
                              width="29"
                              height="29"
                              rx="14.5"
                              fill="#6e6e6e"
                            />
                            <path
                              d="M11.3426 19.7818V18.1737C11.8222 18.2583 12.0338 18.2866 12.471 18.2866C13.5572 18.2866 14.1073 17.9057 14.1073 16.7772V9.66777H15.9129V16.9183C15.9129 18.9354 14.7421 19.8946 12.6826 19.8946C12.1889 19.8946 11.8222 19.8664 11.3426 19.7818Z"
                              fill="white"
                            />
                          </svg>
                        </div>
                        <div className="connect-platform-graphic__payment-card-merchant-name">
                          {"Jackson Hot Yoga"}
                        </div>
                      </div>
                      <div
                        className="connect-platform-graphic__payment-screen connect-platform-graphic__payment-screen--order-details"
                        style={{ opacity: "1", transform: "translateY(0px)" }}
                      >
                        <div className="connect-platform-graphic__payment-screen-summary">
                          <div className="connect-platform-graphic__payment-screen-summary-label">
                            {"Order Summary"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data connect-platform-graphic__payment-card-order-data--pricing-type">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label">
                              {"5 class pass"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-amount tabular-nums--tight">
                            {"A$80.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data connect-platform-graphic__payment-card-order-data--pricing-type">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label">
                              {"Promotions"}
                            </span>
                            <span className="connect-platform-graphic__payment-card-order-pricing-type-saving connect-platform-graphic__payment-card-order-pricing-type-saving--jackson-hot-yoga">
                              {"save "}
                              <span className="tabular-nums--tight">
                                {"10%"}
                              </span>
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-amount tabular-nums--tight">
                            {"A$8.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label">
                              {"Total"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-label tabular-nums--tight">
                            {"A$72.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-method-list">
                          <div className="connect-platform-graphic__payment-method connect-platform-graphic__payment-method--active-jackson-hot-yoga">
                            <div className="connect-platform-graphic__payment-method-input">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="6.7652"
                                  cy="6.7652"
                                  r="6.2652"
                                  stroke="#2a2a2a"
                                />
                                <circle
                                  cx="6.76483"
                                  cy="6.76483"
                                  r="2.25507"
                                  fill="#2a2a2a"
                                />
                              </svg>
                              <div>{"Card"}</div>
                            </div>
                            <svg
                              width="20"
                              height="14"
                              viewBox="0 0 20 14"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 2.31512C0 1.03652 1.03652 0 2.31512 0L17.3634 0C18.642 0 19.6785 1.03651 19.6785 2.31512L19.6785 11.5756C19.6785 12.8542 18.642 13.8907 17.3634 13.8907L2.31512 13.8907C1.03652 13.8907 0 12.8542 0 11.5756L0 2.31512Z"
                                fill="#181818"
                              />
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M17.3464 6.52952C17.2404 5.66814 16.5638 5.14738 15.645 5.1504L12.5842 5.1504L13.055 8.98044H14.4325L14.3387 8.21443H15.7964C16.9422 8.21443 17.4675 7.49989 17.3464 6.52952ZM15.6465 7.14111L14.2054 7.14263L14.0919 6.22372L15.5405 6.22523C15.8811 6.22978 16.0552 6.42052 16.084 6.68393C16.1021 6.85197 16.0249 7.14111 15.6465 7.14111Z"
                                fill="#FFFFFA"
                              />
                              <path
                                d="M7.44824 5.15039L7.91898 8.98043H12.5223L12.0514 5.15039L7.44824 5.15039Z"
                                fill="#818181"
                              />
                              <path
                                d="M2.65426 7.91013L2.78595 8.98042H7.38461L7.23324 7.75571L5.08984 7.75571L5.07016 7.60282L7.04555 6.22371L6.91388 5.15039L2.31519 5.15039L2.46505 6.3766H4.61302L4.6327 6.5295L2.65426 7.91013Z"
                                fill="#FFFFFA"
                              />
                              <path
                                d="M8.76124 3.68874C9.05482 3.96475 9.09511 4.39886 8.85119 4.65837C8.60727 4.91787 8.17148 4.90449 7.87791 4.62848C7.58433 4.35248 7.54404 3.91837 7.78796 3.65886C8.03188 3.39936 8.46766 3.41273 8.76124 3.68874Z"
                                fill="#FFFFFA"
                              />
                            </svg>
                          </div>
                          <div className="connect-platform-graphic__payment-method">
                            <div className="connect-platform-graphic__payment-method-input">
                              <svg
                                width="15"
                                height="14"
                                viewBox="0 0 15 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="7.42334"
                                  cy="7.14679"
                                  r="6.20143"
                                  fill="white"
                                  stroke="#ececec"
                                  strokeWidth="1.12753"
                                />
                              </svg>
                              <div>{"Affirm"}</div>
                            </div>
                            <svg
                              width="20"
                              height="14"
                              viewBox="0 0 20 14"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 2.31512C0 1.03652 1.03651 0 2.31512 0L17.3634 0C18.642 0 19.6785 1.03651 19.6785 2.31512L19.6785 11.5756C19.6785 12.8542 18.642 13.8907 17.3634 13.8907L2.31512 13.8907C1.03651 13.8907 0 12.8542 0 11.5756L0 2.31512Z"
                                fill="#4A4AF4"
                              />
                              <path
                                d="M9.80811 5.87842C11.0292 5.87853 11.966 6.42634 11.9653 7.77393V11.0376H10.6265V10.2593C10.3219 10.7863 9.75718 11.1851 9.03857 11.1851C7.96462 11.185 7.31219 10.6384 7.31201 9.73291C7.31201 8.59099 8.46784 8.12652 9.95557 7.98975C10.3517 7.95361 10.562 7.80637 10.562 7.54639C10.5618 7.16021 10.2457 6.96829 9.67236 6.96826C9.06929 6.96826 8.40038 7.29182 7.98682 7.67041L7.51514 6.6792C8.03126 6.26759 8.98231 5.87842 9.80811 5.87842ZM9.73193 2.91943C12.8409 2.91943 15.3706 5.44846 15.3706 8.55811C15.3714 9.41809 15.1742 10.267 14.7944 11.0386H13.5249C13.9926 10.3251 14.266 9.47278 14.2661 8.55811C14.2661 6.05756 12.2325 4.02307 9.73193 4.02295C7.23132 4.02295 5.19678 6.05749 5.19678 8.55811C5.19686 9.47342 5.46968 10.3251 5.93799 11.0386H4.66943C4.28969 10.267 4.09251 9.41809 4.09326 8.55811C4.09326 5.44925 6.62313 2.91967 9.73193 2.91943ZM10.5337 8.85791C9.52171 8.85796 8.74468 9.01198 8.74463 9.64795C8.74463 9.95305 8.98248 10.1391 9.4165 10.1392C10.0881 10.1392 10.5337 9.52371 10.5337 8.85791Z"
                                fill="white"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-pay-button connect-platform-graphic__payment-card-pay-button--jackson-hot-yoga">
                          {"Pay "}
                          <span className="tabular-nums--tight">
                            {"A$72.00"}
                          </span>
                        </div>
                      </div>
                      <div
                        className="connect-platform-graphic__payment-screen connect-platform-graphic__payment-screen--success"
                        style={{ opacity: "0" }}
                      >
                        <div className="connect-platform-graphic__payment-screen-summary">
                          <div className="connect-platform-graphic__payment-screen-summary-label">
                            {"Thank you!"}
                          </div>
                          <div className="connect-platform-graphic__payment-screen-summary-details">
                            {"Your payment was successful."}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-summary-table">
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Order number"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"#2945467"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Date"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"Feb 25"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Payment method"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value">
                              <svg
                                width="20"
                                height="15"
                                viewBox="0 0 20 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M0 2.35294C0 1.05345 1.05345 0 2.35294 0H17.6471C18.9466 0 20 1.05345 20 2.35294V11.7647C20 13.0642 18.9466 14.1176 17.6471 14.1176H2.35294C1.05345 14.1176 0 13.0642 0 11.7647V2.35294Z"
                                  fill="#181818"
                                />
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M17.6298 6.63603C17.5221 5.76058 16.8344 5.23132 15.9005 5.23439H12.7898L13.2682 9.12699H14.6683L14.5729 8.34847H16.0544C17.219 8.34847 17.7528 7.62225 17.6298 6.63603ZM15.9021 7.25762L14.4375 7.25916L14.3221 6.32524L15.7944 6.32678C16.1405 6.33139 16.3175 6.52525 16.3467 6.79296C16.3651 6.96375 16.2867 7.25762 15.9021 7.25762Z"
                                  fill="#FFFFFA"
                                />
                                <path
                                  d="M7.56982 5.23438L8.04825 9.12698H12.7267L12.2482 5.23438H7.56982Z"
                                  fill="#818181"
                                />
                                <path
                                  d="M2.69764 8.0392L2.83148 9.12697H7.50527L7.35142 7.88226H5.17301L5.15301 7.72686L7.16066 6.32523L7.02684 5.23438H2.35303L2.50534 6.48062H4.6884L4.7084 6.63602L2.69764 8.0392Z"
                                  fill="#FFFFFA"
                                />
                                <path
                                  d="M8.90426 3.74891C9.20263 4.02943 9.24358 4.47063 8.99567 4.73438C8.74777 4.99812 8.30487 4.98452 8.00649 4.70401C7.70812 4.42349 7.66717 3.98229 7.91508 3.71854C8.16298 3.4548 8.60588 3.46839 8.90426 3.74891Z"
                                  fill="#FFFFFA"
                                />
                              </svg>
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Your purchase"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value">
                              <span className="tabular-nums--tight">
                                {"A$72.00"}
                              </span>
                              {" /year"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row connect-platform-graphic__payment-summary-table-row--total">
                            <span>{"Total"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"A$72.00"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="connect-platform-graphic__payment-card-content connect-platform-graphic__payment-card-content--quiet-fire-yoga"
                      style={{ transform: "translateX(-200%)" }}
                    >
                      <div className="connect-platform-graphic__payment-card-header">
                        <div className="connect-platform-graphic__payment-card-logo">
                          <svg
                            width="29"
                            height="29"
                            viewBox="0 0 29 29"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect
                              width="29"
                              height="29"
                              rx="14.5"
                              fill="#ededed"
                            />
                            <path
                              d="M18.9214 15.9752C18.6631 17.5536 17.5263 18.9808 16.0642 19.5977C14.9934 20.0496 13.8376 20.1511 12.6986 19.8833C12.4594 19.827 12.093 19.6432 11.879 19.6121C10.7186 19.1188 9.72456 18.1549 9.28761 16.9543C8.65501 15.2161 9.11423 13.6748 10.1933 12.2613C11.211 10.9282 13.0648 9.72856 12.9615 7.83839C12.9468 7.57019 12.8698 7.3957 12.8053 7.15015C12.7516 6.94577 12.7694 6.85941 13.0037 6.92175C13.4833 7.04938 14.1445 7.5043 14.5193 7.83222C15.8312 8.98024 16.5437 10.632 16.1461 12.3935L16.107 12.597C16.0989 12.6486 16.0815 12.6951 16.0927 12.7474C16.2476 12.6884 16.3948 12.5918 16.5199 12.4825C16.8162 12.2236 17.0469 11.7929 17.1748 11.4222C17.2393 11.2354 17.2758 10.9545 17.3564 10.7881C17.3894 10.7201 17.4586 10.6782 17.5346 10.7011C17.6019 10.7215 17.8831 11.1965 17.9345 11.2872C18.4153 12.1353 18.7716 13.0572 18.9243 14.0183C19.0273 14.6664 19.0241 15.3271 18.9214 15.9752Z"
                              fill="#959595"
                            />
                            <path
                              d="M16.6633 14.496C16.6807 14.4934 16.6816 14.4909 16.6924 14.5048C16.736 14.5608 16.8201 14.7259 16.8554 14.7966C17.5546 16.1968 16.9983 18.3385 15.6653 19.1739C14.5828 19.8523 12.9015 19.7127 11.916 18.9096C10.8551 18.045 10.5794 16.4114 11.0904 15.17C11.5338 14.0929 12.2754 13.5008 12.9757 12.6398C13.548 11.9362 13.9266 11.1629 13.8872 10.2254C13.9119 10.2189 13.9157 10.2357 13.9299 10.2467C14.4451 10.6447 14.9166 11.6491 14.9553 12.2956C14.9836 12.7678 14.838 13.2629 14.8996 13.7132C14.9542 14.112 15.492 14.9553 15.93 14.9831C16.2022 15.0003 16.5382 14.7257 16.6633 14.496Z"
                              fill="#a9a9a9"
                            />
                            <path
                              d="M16.0502 19.6025C16.0794 19.6106 16.1103 19.6114 16.1344 19.6117C16.7552 19.6194 17.4645 19.5633 18.0711 19.611C18.3736 19.6347 18.4358 19.8915 18.345 20.1458C17.9549 21.2381 15.9047 21.7566 14.8817 21.8613C13.3956 22.0134 10.8288 21.7707 9.77135 20.5718C9.56492 20.3378 9.22264 19.7382 9.72175 19.6258L11.857 19.6114C11.8617 19.612 11.8666 19.6108 11.8713 19.6114C12.0853 19.6426 12.4517 19.8264 12.6909 19.8827C13.8298 20.1506 14.9795 20.0543 16.0502 19.6025Z"
                              fill="#171A16"
                            />
                            <path
                              d="M13.6766 14.3221C13.6295 14.3752 13.5777 14.4312 13.5358 14.4819C13.0881 15.0233 12.4941 16.3743 12.3993 17.0775C12.27 18.0363 12.5343 19.1185 13.5221 19.4831C15.2795 20.1318 16.2485 17.7116 15.1947 16.4951L15.1526 16.4588C15.0972 16.4109 15.0425 16.362 14.9889 16.312C14.707 16.0493 14.3777 15.8256 14.1885 15.4873C13.9471 15.0554 13.9381 14.5588 13.9485 14.0744C13.9487 14.0673 13.9408 14.0629 13.935 14.0668C13.9209 14.0766 13.9099 14.0901 13.8986 14.1034C13.8783 14.1273 13.8667 14.1406 13.8481 14.1589L13.6766 14.3221Z"
                              fill="#b9b9b9"
                            />
                          </svg>
                        </div>
                        <div className="connect-platform-graphic__payment-card-merchant-name">
                          {"Quiet Fire Yoga"}
                        </div>
                      </div>
                      <div
                        className="connect-platform-graphic__payment-screen connect-platform-graphic__payment-screen--order-details"
                        style={{ opacity: "1", transform: "translateY(0px)" }}
                      >
                        <div className="connect-platform-graphic__payment-screen-summary">
                          <div className="connect-platform-graphic__payment-screen-summary-label">
                            {"Order Summary"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data connect-platform-graphic__payment-card-order-data--pricing-type">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label">
                              {"Single class"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-amount tabular-nums--tight">
                            {"£20.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data connect-platform-graphic__payment-card-order-data--pricing-type">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label">
                              {"Mat rental"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-amount tabular-nums--tight">
                            {"£2.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label connect-platform-graphic__payment-card-order-label--strong">
                              {"Total"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-label tabular-nums--tight">
                            {"£22.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-method-title">
                          {"Payment method"}
                        </div>
                        <div className="connect-platform-graphic__payment-method-card">
                          <div className="connect-platform-graphic__payment-method-type-header">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="30"
                              height="11"
                              fill="none"
                            >
                              <path
                                fill="#b5b5b5"
                                d="M5.018 10.08c2.77 0 5.017-2.256 5.017-5.04S7.79 0 5.018 0 0 2.256 0 5.04s2.246 5.04 5.018 5.04"
                              />
                              <path
                                fill="#111111"
                                d="M15.122 1.603c0-.473.398-.858.865-.858a.87.87 0 0 1 .865.858.87.87 0 0 1-.865.87.86.86 0 0 1-.865-.87M12.555.866h1.505v8.467h-1.505zM16.748 3.285H15.23v6.048h1.517zM27.656 6.103c1.142-.705 1.919-1.756 2.226-2.82h-1.517c-.396 1.016-1.303 1.78-2.3 2.104V.864h-1.518V9.33h1.518V6.813c1.158.29 2.073 1.296 2.386 2.518h1.527c-.233-1.282-1.106-2.482-2.322-3.228M19.437 3.962c.398-.53 1.172-.838 1.8-.838 1.173 0 2.142.86 2.144 2.16v4.047h-1.517V5.62c0-.534-.237-1.15-1.006-1.15-.903 0-1.423.804-1.423 1.745v3.119h-1.517V3.289h1.52zM4.745 2.016H3.211c.299 1.264 1.17 2.345 2.26 3.024-1.092.68-1.961 1.76-2.26 3.024h1.534c.38-1.17 1.433-2.185 2.726-2.393V4.407c-1.295-.206-2.348-1.222-2.726-2.39"
                              />
                            </svg>
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 13 13"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 6.048C0 2.70778 2.70778 0 6.048 0C9.38822 0 12.096 2.70778 12.096 6.048C12.096 9.38822 9.38822 12.096 6.048 12.096C2.70778 12.096 0 9.38822 0 6.048Z"
                                fill="#F5F5F5"
                              />
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M4.18803 4.18803C4.3541 4.02196 4.62335 4.02196 4.78942 4.18803L6.04798 5.44658L7.30653 4.18803C7.4726 4.02196 7.74185 4.02196 7.90792 4.18803C8.07399 4.3541 8.07399 4.62335 7.90792 4.78942L6.64937 6.04798L7.90792 7.30653C8.07399 7.4726 8.07399 7.74185 7.90792 7.90792C7.74185 8.07399 7.4726 8.07399 7.30653 7.90792L6.04798 6.64937L4.78942 7.90792C4.62335 8.07399 4.3541 8.07399 4.18803 7.90792C4.02196 7.74185 4.02196 7.4726 4.18803 7.30653L5.44658 6.04798L4.18803 4.78942C4.02196 4.62335 4.02196 4.3541 4.18803 4.18803Z"
                                fill="#171717"
                              />
                            </svg>
                          </div>
                          <div className="connect-platform-graphic__payment-method-payment-card">
                            <svg
                              width="26"
                              height="16"
                              viewBox="0 0 26 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <rect
                                width="25.2"
                                height="15.75"
                                rx="2.52"
                                fill="#b2b2b2"
                              />
                              <path
                                d="M11.2887 10.9299H9.69531L10.6919 4.83789H12.2852L11.2887 10.9299Z"
                                fill="white"
                              />
                              <path
                                d="M17.0647 4.98788C16.7504 4.86462 16.252 4.72852 15.6356 4.72852C14.0621 4.72852 12.9541 5.55803 12.9474 6.74398C12.9343 7.61896 13.7407 8.105 14.3438 8.39669C14.9602 8.69484 15.1698 8.88943 15.1698 9.15513C15.1635 9.56329 14.6716 9.75143 14.2129 9.75143C13.5767 9.75143 13.2359 9.65441 12.718 9.42737L12.5082 9.33004L12.2852 10.6975C12.6589 10.8659 13.3473 11.0152 14.0622 11.0217C15.7339 11.0217 16.8223 10.2051 16.8353 8.94125C16.8416 8.24777 16.4158 7.71637 15.4978 7.28217C14.9406 7.00343 14.5993 6.81547 14.5993 6.53027C14.6058 6.27099 14.8879 6.00543 15.5171 6.00543C16.035 5.99242 16.4156 6.11552 16.7039 6.23869L16.848 6.30338L17.0647 4.98788Z"
                                fill="white"
                              />
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M19.9167 4.83789H21.1491L22.4345 10.9298H20.9593C20.9593 10.9298 20.8149 10.2299 20.7691 10.016H18.7235C18.6643 10.1779 18.3891 10.9298 18.3891 10.9298H16.7173L19.084 5.34335C19.2479 4.94798 19.5367 4.83789 19.9167 4.83789ZM19.8185 7.06723C19.8185 7.06723 19.3136 8.42178 19.1824 8.77174H20.5067C20.4412 8.46714 20.1395 7.00892 20.1395 7.00892L20.0282 6.48399C19.9812 6.61916 19.9134 6.805 19.8677 6.93035C19.8367 7.01532 19.8159 7.07248 19.8185 7.06723Z"
                                fill="white"
                              />
                              <path
                                d="M8.36436 4.83789L6.80402 8.99209L6.63351 8.14954C6.34504 7.1774 5.4403 6.12118 4.43066 5.59599L5.85991 10.9234H7.54479L10.0492 4.83789H8.36436Z"
                                fill="white"
                              />
                              <path
                                d="M5.35533 4.83789H2.79185L2.76562 4.96098C4.76529 5.46653 6.08964 6.68486 6.63375 8.14954L6.07648 5.34998C5.98474 4.9609 5.70279 4.85073 5.35533 4.83789Z"
                                fill="white"
                              />
                            </svg>
                            <div className="connect-platform-graphic__payment-method-payment-card-details">
                              <div>{"HSBC"}</div>
                              <div className="connect-platform-graphic__payment-method-payment-card-details-number tabular-nums--tight">
                                {"•••• 4242"}
                              </div>
                            </div>
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 8 8"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M2.13021 0.240071C2.34548 0.0247942 2.69452 0.0247942 2.90979 0.240071L6.05979 3.39007C6.27507 3.60535 6.27507 3.95438 6.05979 4.16966L2.90979 7.31966C2.69452 7.53493 2.34548 7.53493 2.13021 7.31966C1.91493 7.10438 1.91493 6.75535 2.13021 6.54007L4.89041 3.77986L2.13021 1.01966C1.91493 0.804379 1.91493 0.455347 2.13021 0.240071Z"
                                fill="#171717"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-pay-button connect-platform-graphic__payment-card-pay-button--link">
                          {"£22.00"}
                        </div>
                      </div>
                      <div
                        className="connect-platform-graphic__payment-screen connect-platform-graphic__payment-screen--success"
                        style={{ opacity: "0" }}
                      >
                        <div className="connect-platform-graphic__payment-screen-summary">
                          <div className="connect-platform-graphic__payment-screen-summary-label">
                            {"Thank you!"}
                          </div>
                          <div className="connect-platform-graphic__payment-screen-summary-details">
                            {"Your payment was successful."}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-summary-table">
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Order number"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"#565656"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Date"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"Feb 20"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Payment method"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value">
                              <svg
                                width="20"
                                height="15"
                                viewBox="0 0 20 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M0 2.35294C0 1.05412 1.05455 0 2.35364 0H17.6473C18.9473 0 20 1.05412 20 2.35294V11.7647C20 13.0635 18.9464 14.1176 17.6473 14.1176H2.35364C1.05364 14.1176 0 13.0635 0 11.7647V2.35294Z"
                                  fill="#b5b5b5"
                                />
                                <path
                                  d="M8.96549 2.35303H6.4707C6.95592 4.40891 8.37244 6.16567 10.1446 7.27126C8.36896 8.37597 6.95592 10.1327 6.4707 12.1886H8.96375C9.58114 10.2871 11.2924 8.6345 13.3942 8.29744V6.24156C11.2898 5.90626 9.57853 4.2545 8.96375 2.35303H8.96549Z"
                                  fill="#111111"
                                />
                              </svg>
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Your purchase"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value">
                              {"£22.00"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row connect-platform-graphic__payment-summary-table-row--total">
                            <span>{"Total"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"£22.00"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="connect-platform-graphic__payment-card-content connect-platform-graphic__payment-card-content--daybreak-yoga"
                      style={{ transform: "translateX(-200%)" }}
                    >
                      <div className="connect-platform-graphic__payment-card-header">
                        <div className="connect-platform-graphic__payment-card-logo">
                          <svg
                            width="29"
                            height="29"
                            viewBox="0 0 29 29"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle
                              cx="14.3851"
                              cy="14.4832"
                              r="14.3851"
                              fill="url(#connect-payment-card-graphic-daybreak-yoga-logo-gradient)"
                            />
                            <path
                              d="M15.2671 7.2588C15.249 7.64689 15.0676 8.24655 14.5792 8.24655C14.0908 8.24655 13.8913 7.64689 13.8913 7.2588C13.8913 6.87071 14.1041 6.27104 14.5792 6.27104C15.0543 6.27104 15.2502 6.87071 15.2671 7.2588C15.2961 7.88627 16.2754 7.8899 16.2464 7.2588C16.2029 6.32424 15.6359 5.29175 14.5792 5.29175C13.5225 5.29175 12.912 6.32303 12.912 7.2588C12.912 8.19457 13.5189 9.1799 14.5103 9.22101C15.5996 9.26574 16.2017 8.22479 16.2464 7.2588C16.2754 6.62891 15.2961 6.63012 15.2671 7.2588Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M14.6568 9.88012C12.911 9.88617 11.274 10.1812 10.2209 11.7263C9.47376 12.824 9.4387 14.2241 8.54404 15.236C7.86821 16.0013 6.94695 16.4861 5.97733 16.7654C5.37282 16.9395 5.63034 17.8849 6.23726 17.7096C7.13676 17.4497 7.98669 17.0374 8.70846 16.4365C9.74821 15.5721 10.1 14.4997 10.5377 13.275C10.8895 12.2885 11.5448 11.4192 12.5676 11.0831C13.2398 10.8618 13.9567 10.8606 14.658 10.8582C15.2879 10.8558 15.2891 9.87649 14.658 9.87891L14.6568 9.88012Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M12.4394 20.8057C11.3271 21.2893 10.0129 21.5348 8.80878 21.3002C8.25264 21.1914 7.67232 20.9448 7.53691 20.3427C7.24675 19.0527 8.60929 18.5461 9.75785 18.5255C10.3877 18.5135 10.3889 17.5342 9.75785 17.5463C8.65886 17.5668 7.4148 17.8558 6.81271 18.8749C6.51409 19.3803 6.45485 20.0368 6.59268 20.6038C7.22136 23.1947 11.2473 22.3859 12.9339 21.6532C13.5106 21.403 13.0125 20.5591 12.4394 20.8081V20.8057Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M9.75766 18.5255C11.3644 18.5533 13.0365 19.2775 14.2322 20.3547C14.6989 20.7755 15.394 20.0851 14.9249 19.662C13.5346 18.4095 11.6304 17.5789 9.75766 17.5462C9.12777 17.5354 9.12656 18.5146 9.75766 18.5255Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M11.5361 13.362C11.8251 14.2216 12.085 15.2964 11.8396 16.1947C11.6752 16.7956 11.1384 17.284 10.5895 17.5512C10.0406 17.8184 10.5194 18.6719 11.084 18.3963C11.8142 18.0396 12.4792 17.3638 12.7403 16.59C13.1078 15.5043 12.837 14.1575 12.4804 13.0996C12.2809 12.506 11.3342 12.7599 11.5361 13.3596V13.362Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M14.4958 10.8592C15.1958 10.8616 15.914 10.8616 16.5862 11.0841C17.6102 11.4226 18.2607 12.2882 18.6161 13.276C19.0574 14.5007 19.4044 15.5731 20.4453 16.4375C21.1671 17.0384 22.017 17.4507 22.9165 17.7106C23.5235 17.8859 23.7822 16.9405 23.1765 16.7664C22.2298 16.4931 21.3315 16.0265 20.6605 15.2926C19.7272 14.271 19.6958 12.848 18.9329 11.7273C17.8798 10.1809 16.2428 9.88715 14.497 9.88111C13.8672 9.87869 13.8659 10.858 14.497 10.8604L14.4958 10.8592Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M19.4168 17.5226C17.5441 17.5552 15.6399 18.387 14.2495 19.6383C14.0549 19.8136 14.067 20.1534 14.2495 20.3311C15.7293 21.7722 18.0567 22.5109 20.0866 22.2981C21.0574 22.1966 22.0935 21.8375 22.4865 20.8618C22.692 20.3516 22.7101 19.7036 22.5191 19.185C22.0536 17.9264 20.6258 17.5443 19.4156 17.5226C18.7857 17.5105 18.7857 18.4898 19.4156 18.5019C20.2728 18.5176 21.5265 18.8126 21.651 19.7205C21.7369 20.348 21.5035 20.8703 20.9003 21.1254C19.609 21.6707 17.8693 21.3055 16.6433 20.7421C16.0388 20.4641 15.421 20.1074 14.9411 19.6395V20.3323C16.1368 19.2551 17.8088 18.5309 19.4156 18.5031C20.0455 18.4922 20.0467 17.5129 19.4156 17.5238L19.4168 17.5226Z"
                              fill="#e8e8e8"
                            />
                            <path
                              d="M16.7327 13.1021C16.3773 14.1599 16.1053 15.5056 16.4728 16.5925C16.7352 17.3662 17.3989 18.0421 18.1291 18.3987C18.6938 18.6744 19.1907 17.8293 18.6236 17.5536C18.0566 17.278 17.5404 16.798 17.3735 16.1971C17.1257 15.3012 17.388 14.2216 17.677 13.3644C17.8789 12.766 16.9334 12.5084 16.7327 13.1045V13.1021Z"
                              fill="#e8e8e8"
                            />
                            <defs>
                              <linearGradient
                                id="connect-payment-card-graphic-daybreak-yoga-logo-gradient"
                                x1="14.3851"
                                y1="0.0981443"
                                x2="21.7426"
                                y2="38.5049"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#6a6a6a" />
                                <stop offset="1" stopColor="#333333" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        <div className="connect-platform-graphic__payment-card-merchant-name">
                          {"Daybreak Yoga"}
                        </div>
                      </div>
                      <div
                        className="connect-platform-graphic__payment-screen connect-platform-graphic__payment-screen--order-details"
                        style={{ opacity: "1", transform: "translateY(0px)" }}
                      >
                        <div className="connect-platform-graphic__payment-screen-summary">
                          <div className="connect-platform-graphic__payment-screen-summary-label">
                            {"Order Summary"}
                          </div>
                          <div className="connect-platform-graphic__payment-screen-summary-details">
                            {"Unlimited yoga subscription"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data connect-platform-graphic__payment-card-order-data--pricing-type connect-platform-graphic__payment-card-dropdown-order-data">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label">
                              {"Yearly"}
                            </span>
                            <span className="connect-platform-graphic__payment-card-order-pricing-type-saving">
                              {"save "}
                              <span className="tabular-nums--tight">
                                {"25%"}
                              </span>
                            </span>
                            <svg
                              width="8"
                              height="7"
                              viewBox="0 0 8 7"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6.46902 2.25726C6.6343 2.09198 6.90226 2.09198 7.06754 2.25726C7.23282 2.42253 7.23282 2.6905 7.06754 2.85578L4.40386 5.51946C4.23873 5.68458 3.97101 5.68458 3.80589 5.51946L1.14221 2.85578C0.97693 2.6905 0.97693 2.42253 1.14221 2.25726C1.30748 2.09198 1.57545 2.09198 1.74073 2.25726L4.10487 4.62141L6.46902 2.25726Z"
                                fill="#3c3c3c"
                              />
                            </svg>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-amount">
                            <span className="tabular-nums--tight">
                              {"$999.00"}
                            </span>
                            {" /year"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-order-data">
                          <div className="connect-platform-graphic__payment-card-order-pricing-type">
                            <span className="connect-platform-graphic__payment-card-order-label  connect-platform-graphic__payment-card-order-label--strong">
                              {"Billed now"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-card-order-label">
                            {"$999.00"}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-method-list">
                          <div className="connect-platform-graphic__payment-method connect-platform-graphic__payment-method--active">
                            <div className="connect-platform-graphic__payment-method-input">
                              <svg
                                width="15"
                                height="14"
                                viewBox="0 0 15 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="7.42347"
                                  cy="7.15265"
                                  r="6.20143"
                                  fill="white"
                                  stroke="#2a2a2a"
                                  strokeWidth="1.12753"
                                />
                                <circle
                                  cx="7.42328"
                                  cy="7.15204"
                                  r="2.25507"
                                  fill="#2a2a2a"
                                />
                              </svg>
                              <div>{"Card"}</div>
                            </div>
                            {/* Visa card mark: keeps its brand blue — the only colour exception in the monochrome system. */}
                            <svg
                              width="21"
                              height="15"
                              viewBox="0 0 21 15"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0.617859 3.14471C0.617859 1.86611 1.65437 0.82959 2.93298 0.82959L17.9813 0.82959C19.2599 0.82959 20.2964 1.8661 20.2964 3.14471L20.2964 12.4052C20.2964 13.6838 19.2599 14.7203 17.9813 14.7203L2.93298 14.7203C1.65437 14.7203 0.617859 13.6838 0.617859 12.4052L0.617859 3.14471Z"
                                fill="#1434CB"
                              />
                              <path
                                d="M10.1192 5.00681L8.98507 10.4541H7.60794L8.74204 5.00681L10.1192 5.00681ZM15.8302 8.52657L16.5593 6.47338L16.9643 8.52657L15.8302 8.52657ZM17.3694 10.4541H18.625L17.5314 5.00681H16.3568C16.1137 5.00681 15.8707 5.17442 15.7897 5.42583L13.7645 10.4541H15.1821L15.4657 9.65793L17.2073 9.65793L17.3694 10.4541ZM13.805 8.65228C13.805 7.22761 11.9013 7.14381 11.9013 6.51528C11.9418 6.22197 12.1849 6.05436 12.4684 6.05436C12.9139 6.01246 13.4 6.09626 13.805 6.30577L14.048 5.13252C13.643 4.96491 13.1975 4.8811 12.7924 4.8811C11.4558 4.8811 10.4837 5.63534 10.4837 6.68289C10.4837 7.47902 11.1723 7.89804 11.6583 8.14946C12.1849 8.40087 12.3874 8.56848 12.3469 8.81989C12.3469 9.197 11.9418 9.36461 11.5368 9.36461C11.0508 9.36461 10.5647 9.23891 10.1192 9.0294L9.87615 10.2027C10.3622 10.4122 10.8887 10.496 11.3748 10.496C12.8734 10.5379 13.805 9.78363 13.805 8.65228ZM8.17499 5.00681L5.98778 10.4541H4.52965L3.43605 6.09626C3.43605 5.88675 3.27403 5.71914 3.11202 5.63534C2.70698 5.42583 2.26144 5.25822 1.77539 5.17442L1.81589 5.00681H4.12461C4.44864 5.00681 4.69166 5.25822 4.73217 5.55153L5.29922 8.69418L6.75736 5.00681H8.17499Z"
                                fill="white"
                              />
                            </svg>
                          </div>
                          <div className="connect-platform-graphic__payment-method">
                            <div className="connect-platform-graphic__payment-method-input">
                              <svg
                                width="15"
                                height="14"
                                viewBox="0 0 15 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="7.42334"
                                  cy="7.14679"
                                  r="6.20143"
                                  fill="white"
                                  stroke="#ececec"
                                  strokeWidth="1.12753"
                                />
                              </svg>
                              <div>{"Klarna"}</div>
                            </div>
                            <svg
                              width="21"
                              height="15"
                              viewBox="0 0 21 15"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0.632324 3.17743C0.632324 1.89882 1.66884 0.862305 2.94744 0.862305L17.9957 0.862305C19.2743 0.862305 20.3109 1.89882 20.3109 3.17743L20.3109 12.4379C20.3109 13.7165 19.2743 14.753 17.9957 14.753L2.94744 14.753C1.66884 14.753 0.632324 13.7165 0.632324 12.4379L0.632324 3.17743Z"
                                fill="#FFB3C7"
                              />
                              <path
                                d="M14.9448 9.8186C14.4419 9.8186 14.0341 10.2261 14.0341 10.7288C14.0341 11.2314 14.4419 11.639 14.9448 11.639C15.4478 11.639 15.8556 11.2314 15.8556 10.7288C15.8556 10.2261 15.4478 9.8186 14.9448 9.8186Z"
                                fill="#17120F"
                              />
                              <path
                                d="M12.9559 4.53296L11.3818 4.53296C11.3818 5.82235 10.7886 7.00581 9.75438 7.78007L9.13074 8.24683L11.5471 11.5398H13.5339L11.3105 8.50977C12.3644 7.46092 12.9559 6.04984 12.9559 4.53296Z"
                                fill="#17120F"
                              />
                              <path
                                d="M7.32977 11.5396H8.93831L8.93831 4.53296H7.32977L7.32977 11.5396Z"
                                fill="#17120F"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-card-pay-button">
                          {"Pay "}
                          <span className="tabular-nums--tight">
                            {"$999.00"}
                          </span>
                        </div>
                      </div>
                      <div
                        className="connect-platform-graphic__payment-screen connect-platform-graphic__payment-screen--success"
                        style={{ opacity: "0" }}
                      >
                        <div className="connect-platform-graphic__payment-screen-summary">
                          <div className="connect-platform-graphic__payment-screen-summary-label">
                            {"Thank you!"}
                          </div>
                          <div className="connect-platform-graphic__payment-screen-summary-details">
                            {"Your unlimited yoga subscription is now active."}
                          </div>
                        </div>
                        <div className="connect-platform-graphic__payment-summary-table">
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Order number"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"#9803890"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Date"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"Jan 20"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Payment method"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value">
                              {/* Visa card mark: keeps its brand blue — the only colour exception in the monochrome system. */}
                              <svg
                                width="21"
                                height="15"
                                viewBox="0 0 21 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M0.772583 3.15496C0.772583 1.87636 1.8091 0.839844 3.08771 0.839844L18.136 0.839844C19.4146 0.839844 20.4511 1.87636 20.4511 3.15496L20.4511 12.4154C20.4511 13.6941 19.4146 14.7306 18.136 14.7306L3.08771 14.7306C1.8091 14.7306 0.772583 13.6941 0.772583 12.4154L0.772583 3.15496Z"
                                  fill="#1434CB"
                                />
                                <path
                                  d="M10.274 5.01682L9.13985 10.4641H7.76272L8.89683 5.01682L10.274 5.01682ZM15.985 8.53658L16.7141 6.48339L17.1191 8.53658L15.985 8.53658ZM17.5241 10.4641H18.7798L17.6862 5.01682H16.5115C16.2685 5.01682 16.0255 5.18443 15.9445 5.43584L13.9193 10.4641H15.3369L15.6205 9.66794L17.3621 9.66794L17.5241 10.4641ZM13.9598 8.66229C13.9598 7.23762 12.0561 7.15382 12.0561 6.52529C12.0966 6.23198 12.3397 6.06437 12.6232 6.06437C13.0687 6.02247 13.5548 6.10627 13.9598 6.31578L14.2028 5.14252C13.7978 4.97492 13.3522 4.89111 12.9472 4.89111C11.6106 4.89111 10.6385 5.64535 10.6385 6.6929C10.6385 7.48903 11.3271 7.90805 11.8131 8.15947C12.3397 8.41088 12.5422 8.57849 12.5017 8.8299C12.5017 9.20701 12.0966 9.37462 11.6916 9.37462C11.2055 9.37462 10.7195 9.24892 10.274 9.03941L10.0309 10.2127C10.517 10.4222 11.0435 10.506 11.5296 10.506C13.0282 10.5479 13.9598 9.79364 13.9598 8.66229ZM8.32978 5.01682L6.14257 10.4641H4.68443L3.59083 6.10627C3.59083 5.89676 3.42882 5.72915 3.2668 5.64535C2.86176 5.43584 2.41622 5.26823 1.93018 5.18443L1.97068 5.01682H4.2794C4.60343 5.01682 4.84645 5.26823 4.88695 5.56154L5.45401 8.70419L6.91214 5.01682H8.32978Z"
                                  fill="white"
                                />
                              </svg>
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row">
                            <span>{"Your plan"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value">
                              <span className="tabular-nums--tight">
                                {"$999.00"}
                              </span>
                              {" /year"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__payment-summary-table-row connect-platform-graphic__payment-summary-table-row--total">
                            <span>{"Total"}</span>
                            <span className="connect-platform-graphic__payment-summary-table-row-value tabular-nums--tight">
                              {"$999.00"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="connect-platform-graphic__dashboard-browser">
                    <div
                      className="browser-graphic"
                      style={{
                        "--browser-graphic-desktop-width": "728px",
                        "--browser-graphic-desktop-height": "464px",
                        "--browser-graphic-mobile-width": "728px",
                        "--browser-graphic-mobile-height": "464px",
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
                        <div className="connect-platform-graphic__dashboard">
                          <div className="connect-platform-graphic__dashboard-sidebar">
                            <span className="connect-platform-graphic__dashboard-sidebar-title">
                              <svg
                                width="25"
                                height="25"
                                viewBox="0 0 25 25"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="0.83844"
                                  y="0.0786133"
                                  width="23.998"
                                  height="23.998"
                                  rx="11.999"
                                  fill="#e1e1e1"
                                />
                                <path
                                  d="M14.6832 7.01403C14.5975 6.74385 14.4342 6.5019 14.2608 6.28112C13.9382 5.87081 13.4018 5.25586 12.8323 5.25586C12.2627 5.25586 11.7546 5.84561 11.436 6.23979C11.2495 6.47065 11.0721 6.72772 10.9813 7.01403C10.8221 7.51607 11.6104 7.7308 11.7687 7.23077C11.8675 6.91825 12.4673 6.11176 12.8323 6.11176C13.1972 6.11176 13.797 6.91825 13.8958 7.23077C14.0541 7.72979 14.8424 7.51708 14.6832 7.01403Z"
                                  fill="#6c6c6c"
                                />
                                <path
                                  d="M12.4937 15.2704C11.8778 13.5153 10.5087 11.8589 8.84633 11.0232C8.16988 10.6835 7.44705 10.4738 6.69499 10.3891C6.24336 10.3377 5.78768 10.3367 5.33504 10.378C4.88239 10.4193 4.32187 10.4254 3.95693 10.6895C2.93671 11.4295 4.40857 13.3459 4.97715 13.9659C6.35324 15.466 8.32311 15.6192 10.1448 14.8813C10.6257 14.6867 10.415 13.8964 9.92804 14.094C8.54389 14.6545 7.02667 14.7452 5.85724 13.6887C5.45601 13.3258 5.13442 12.8943 4.86828 12.4245C4.76041 12.234 4.66161 12.0384 4.57189 11.8388C4.45495 11.5767 4.31582 11.3579 4.69589 11.2853C7.24442 10.7994 9.55907 11.9194 10.9563 14.0546C11.1741 14.3873 11.3697 14.7351 11.54 15.095C11.6419 15.3108 11.6378 15.2906 11.7064 15.4862C11.8788 15.9791 12.6681 15.7664 12.4937 15.2694V15.2704Z"
                                  fill="#6c6c6c"
                                />
                                <rect
                                  x="12.4056"
                                  y="16.7036"
                                  width="0.856903"
                                  height="2.19581"
                                  rx="0.428451"
                                  fill="#6c6c6c"
                                />
                                <path
                                  d="M11.952 11.7765C12.074 10.5012 11.7403 9.1493 10.8794 8.17948C10.1989 7.4123 9.2079 6.96167 8.21187 6.77718C6.86905 6.52918 6.81663 8.38917 6.79748 9.31564C6.78639 9.84087 7.60297 9.84087 7.61406 9.31564C7.62414 8.82266 7.63522 8.2319 7.83584 7.77018C7.94371 7.52017 8.01428 7.5615 8.28244 7.62602C8.50221 7.67844 8.72098 7.74296 8.93167 7.82361C9.61316 8.08673 10.217 8.53938 10.6031 9.16543C11.081 9.93966 11.2211 10.8802 11.1354 11.7755C11.085 12.2987 11.9026 12.2946 11.952 11.7755V11.7765Z"
                                  fill="#6c6c6c"
                                />
                                <path
                                  d="M13.9576 15.4873C14.0685 15.1727 14.3034 14.713 14.5403 14.3209C15.0474 13.4821 15.7057 12.7119 16.5162 12.1524C17.6423 11.3751 18.97 11.0686 20.3279 11.1947C20.6041 11.2199 21.2554 11.1967 21.212 11.5485C21.1899 11.729 21.0437 11.9487 20.9651 12.108C20.7352 12.5687 20.458 13.0093 20.1092 13.3893C18.9155 14.6888 17.3015 14.7291 15.7359 14.095C15.249 13.8974 15.0373 14.6878 15.5192 14.8824C17.1574 15.5457 18.9307 15.5235 20.3128 14.3299C20.8048 13.9055 21.205 13.3672 21.5215 12.8016C21.7756 12.3469 22.2061 11.6534 22.0266 11.1201C21.7514 10.3035 20.3854 10.3478 19.6888 10.3488C18.8672 10.3488 18.0455 10.5011 17.2844 10.8136C16.0505 11.3207 15.0413 12.2068 14.259 13.2754C13.8155 13.8813 13.4213 14.5608 13.1713 15.2715C12.9969 15.7685 13.7852 15.9822 13.9586 15.4883L13.9576 15.4873Z"
                                  fill="#6c6c6c"
                                />
                                <path
                                  d="M18.4573 9.72509C18.9828 9.72509 18.9838 8.9082 18.4573 8.9082C17.9309 8.9082 17.9309 9.72509 18.4573 9.72509Z"
                                  fill="#6c6c6c"
                                />
                                <path
                                  d="M14.5276 11.7764C14.4419 10.8812 14.582 9.94057 15.0599 9.16633C15.4329 8.56146 16.0085 8.11889 16.6628 7.85174C16.8735 7.76605 17.0912 7.69952 17.311 7.64407C17.5681 7.57955 17.6931 7.49285 17.811 7.72069C18.0419 8.16628 18.0378 8.83164 18.0479 9.31654C18.059 9.84178 18.8756 9.84278 18.8645 9.31654C18.8454 8.38907 18.7929 6.52908 17.4501 6.77809C16.4531 6.96258 15.4661 7.41321 14.7826 8.18039C13.9207 9.14819 13.588 10.5031 13.71 11.7774C13.7594 12.2955 14.577 12.3006 14.5266 11.7774L14.5276 11.7764Z"
                                  fill="#6c6c6c"
                                />
                              </svg>
                              {"Zenflow"}
                            </span>
                          </div>
                          <div className="connect-platform-graphic__dashboard-main">
                            <div className="connect-platform-graphic__dashboard-header">
                              {"Connected Accounts"}
                            </div>
                            <div className="connect-platform-graphic__dashboard-table-header">
                              <div>{"Accounts"}</div>
                              <div>{"Account country"}</div>
                              <div>{"Payment balance (USD)"}</div>
                              <div>{"Volume (USD)"}</div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    width="16"
                                    height="16"
                                    rx="8"
                                    fill="#efefef"
                                  />
                                  <path
                                    d="M3.04056 6.34611C3.12814 6.3506 3.21235 6.31972 3.27804 6.25965L3.32744 6.21361C3.61151 5.94919 3.83551 5.73979 4.31102 5.73979C4.78653 5.73979 5.01053 5.94863 5.2946 6.21361C5.62133 6.51789 5.9913 6.8626 6.72112 6.8626C7.45095 6.8626 7.82091 6.51789 8.14765 6.21361C8.43172 5.94919 8.65572 5.73979 9.13123 5.73979C9.60674 5.73979 9.83074 5.94863 10.1148 6.21361C10.4415 6.51789 10.8115 6.8626 11.5413 6.8626C12.2712 6.8626 12.6411 6.51789 12.9679 6.21361C13.0285 6.15747 13.0908 6.09909 13.1542 6.04519C13.2935 5.92674 13.3131 5.71453 13.198 5.57137C13.1419 5.50175 13.0622 5.45853 12.9746 5.45067C12.8876 5.44225 12.8017 5.46975 12.7343 5.52702C12.6602 5.58989 12.5917 5.65389 12.5249 5.71565C12.2408 5.98007 12.0168 6.18891 11.5413 6.18891C11.0658 6.18891 10.8418 5.98007 10.5578 5.71509C10.231 5.41081 9.86105 5.06611 9.13123 5.06611C8.4014 5.06611 8.03144 5.41081 7.7047 5.71509C7.42063 5.97951 7.19663 6.18891 6.72112 6.18891C6.24561 6.18891 6.02161 5.98007 5.73754 5.71509C5.41081 5.41081 5.04084 5.06611 4.31102 5.06611C3.58119 5.06611 3.21123 5.41081 2.88449 5.71509L2.83677 5.75944C2.7026 5.88407 2.69193 6.09684 2.81319 6.23495C2.87214 6.30175 2.95298 6.34161 3.04112 6.34611H3.04056Z"
                                    fill="#10120C"
                                  />
                                  <path
                                    d="M12.9729 7.48632C12.8859 7.4779 12.8 7.5054 12.7326 7.56267C12.6585 7.62554 12.59 7.68954 12.5232 7.7513C12.2392 8.01572 12.0152 8.22512 11.5396 8.22512C11.0641 8.22512 10.8401 8.01628 10.5561 7.7513C10.2293 7.44702 9.85937 7.10232 9.12954 7.10232C8.39972 7.10232 8.02975 7.44702 7.70302 7.7513C7.41895 8.01572 7.19495 8.22512 6.71944 8.22512C6.24393 8.22512 6.01993 8.01628 5.73586 7.7513C5.40912 7.44702 5.03916 7.10232 4.30933 7.10232C3.57951 7.10232 3.20954 7.44702 2.88281 7.7513L2.83509 7.79565C2.70091 7.92028 2.69025 8.13305 2.81151 8.27116C2.87046 8.33853 2.95186 8.37782 3.04 8.38232C3.12758 8.38681 3.21179 8.35593 3.27691 8.29586L3.32632 8.24982C3.61039 7.9854 3.83439 7.776 4.30989 7.776C4.7854 7.776 5.0094 7.98484 5.29347 8.24982C5.62021 8.5541 5.99018 8.89881 6.72 8.89881C7.44982 8.89881 7.81979 8.5541 8.14653 8.24982C8.4306 7.9854 8.6546 7.776 9.13011 7.776C9.60561 7.776 9.82961 7.98484 10.1137 8.24982C10.4404 8.5541 10.8104 8.89881 11.5402 8.89881C12.27 8.89881 12.64 8.5541 12.9667 8.24982C13.0274 8.19312 13.0902 8.13474 13.1531 8.0814C13.2923 7.96295 13.312 7.75074 13.1969 7.60758C13.1408 7.53796 13.0611 7.49474 12.9735 7.48688L12.9729 7.48632Z"
                                    fill="#10120C"
                                  />
                                  <path
                                    d="M12.9729 9.5214C12.8853 9.51298 12.8 9.53993 12.7326 9.59776C12.6585 9.66063 12.59 9.72463 12.5232 9.78639C12.2392 10.0508 12.0152 10.2596 11.5396 10.2596C11.0641 10.2596 10.8401 10.0508 10.5561 9.78582C10.2293 9.48154 9.85937 9.13684 9.12954 9.13684C8.39972 9.13684 8.02975 9.48154 7.70302 9.78582C7.41895 10.0502 7.19495 10.2596 6.71944 10.2596C6.24393 10.2596 6.01993 10.0508 5.73586 9.78582C5.40912 9.48154 5.03916 9.13684 4.30933 9.13684C3.57951 9.13684 3.20954 9.48154 2.88281 9.78582L2.83453 9.83074C2.70035 9.95537 2.68968 10.1681 2.81095 10.3057C2.86989 10.3731 2.9513 10.4124 3.03944 10.4168C3.12758 10.4219 3.21123 10.3905 3.27635 10.3304L3.32575 10.2844C3.60982 10.0199 3.83382 9.81053 4.30877 9.81053C4.78372 9.81053 5.00828 10.0194 5.29235 10.2844C5.61909 10.5886 5.98905 10.9333 6.71888 10.9333C7.4487 10.9333 7.81867 10.5886 8.1454 10.2844C8.42947 10.0199 8.65347 9.81053 9.12898 9.81053C9.60449 9.81053 9.82849 10.0194 10.1126 10.2844C10.4393 10.5886 10.8093 10.9333 11.5391 10.9333C12.2689 10.9333 12.6389 10.5886 12.9656 10.2844C13.0262 10.2276 13.0891 10.1693 13.152 10.1159C13.2912 9.99747 13.3109 9.78526 13.1958 9.64211C13.1397 9.57249 13.0599 9.52926 12.9724 9.5214H12.9729Z"
                                    fill="#10120C"
                                  />
                                </svg>
                                {"Vital Flow"}
                              </div>
                              <div>{"Canada"}</div>
                              <div className="tabular-nums--tight">
                                {"$8,348.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$71,562.98"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row connect-platform-graphic__dashboard-table-row--daybreak-yoga"
                              style={{ opacity: "1" }}
                            >
                              <div
                                className="connect-platform-graphic__dashboard-table-row-bg"
                                style={{ opacity: "0" }}
                              ></div>
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    cx="8"
                                    cy="8"
                                    r="8"
                                    fill="url(#connect-dashboard-graphic-daybreak-yoga-logo-gradient)"
                                  />
                                  <path
                                    d="M8.49043 3.98237C8.48035 4.19819 8.37949 4.53169 8.10786 4.53169C7.83622 4.53169 7.72528 4.19819 7.72528 3.98237C7.72528 3.76654 7.84362 3.43304 8.10786 3.43304C8.37209 3.43304 8.48102 3.76654 8.49043 3.98237C8.50657 4.33132 9.05118 4.33334 9.03505 3.98237C9.01084 3.46263 8.6955 2.88843 8.10786 2.88843C7.52021 2.88843 7.18066 3.46196 7.18066 3.98237C7.18066 4.50278 7.51819 5.05075 8.06953 5.07361C8.67533 5.09849 9.01017 4.51958 9.03505 3.98237C9.05118 3.63206 8.50657 3.63274 8.49043 3.98237Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M8.15079 5.44013C7.1799 5.44349 6.26951 5.60755 5.68388 6.46683C5.26836 7.07734 5.24886 7.85593 4.75131 8.4187C4.37546 8.84431 3.86312 9.11393 3.32388 9.26924C2.9877 9.36607 3.13092 9.89185 3.46844 9.79436C3.96868 9.6498 4.44135 9.42053 4.84276 9.08636C5.42099 8.60562 5.61665 8.00923 5.86004 7.32813C6.0557 6.77948 6.42012 6.29605 6.98894 6.10913C7.36278 5.98609 7.76149 5.98542 8.15146 5.98407C8.50176 5.98273 8.50244 5.43811 8.15146 5.43946L8.15079 5.44013Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M6.91776 11.5161C6.29918 11.7851 5.56833 11.9216 4.89865 11.7911C4.58936 11.7306 4.26663 11.5934 4.19132 11.2586C4.02995 10.5412 4.78771 10.2595 5.42646 10.248C5.77676 10.2413 5.77743 9.69671 5.42646 9.70343C4.81528 9.71486 4.12341 9.87556 3.78858 10.4424C3.6225 10.7234 3.58956 11.0885 3.66621 11.4038C4.01583 12.8447 6.25481 12.3949 7.19276 11.9875C7.51348 11.8483 7.23646 11.379 6.91776 11.5175V11.5161Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M5.42606 10.248C6.31964 10.2635 7.24952 10.6662 7.91449 11.2653C8.17402 11.4993 8.56063 11.1154 8.29975 10.8801C7.52653 10.1835 6.46756 9.72157 5.42606 9.70342C5.07576 9.69737 5.07509 10.242 5.42606 10.248Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M6.41509 7.37642C6.57579 7.85447 6.72035 8.4522 6.58386 8.95177C6.49242 9.28593 6.19389 9.55757 5.88863 9.70616C5.58338 9.85475 5.84964 10.3294 6.16363 10.1761C6.56974 9.9778 6.93954 9.60194 7.08477 9.17163C7.28917 8.56785 7.13856 7.81883 6.94021 7.23051C6.82927 6.90038 6.30281 7.04158 6.41509 7.37507V7.37642Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M8.06113 5.98462C8.45043 5.98596 8.84982 5.98596 9.22365 6.10968C9.79315 6.29794 10.1549 6.77935 10.3526 7.32868C10.598 8.00978 10.7909 8.60617 11.3698 9.08691C11.7712 9.42108 12.2439 9.65035 12.7442 9.79491C13.0817 9.8924 13.2256 9.36661 12.8887 9.26979C12.3623 9.11784 11.8627 8.85831 11.4895 8.45018C10.9705 7.88203 10.953 7.09066 10.5287 6.46738C9.94308 5.60742 9.0327 5.44404 8.06181 5.44068C7.7115 5.43933 7.71083 5.98395 8.06181 5.98529L8.06113 5.98462Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M10.7981 9.69025C9.75658 9.7084 8.69761 10.171 7.92439 10.8669C7.81614 10.9644 7.82286 11.1533 7.92439 11.2521C8.74736 12.0536 10.0417 12.4644 11.1706 12.3461C11.7105 12.2896 12.2867 12.0899 12.5052 11.5473C12.6195 11.2636 12.6296 10.9032 12.5234 10.6147C12.2645 9.91482 11.4704 9.70235 10.7974 9.69025C10.4471 9.68352 10.4471 10.2281 10.7974 10.2349C11.2741 10.2436 11.9714 10.4077 12.0406 10.9126C12.0883 11.2616 11.9586 11.552 11.6231 11.6939C10.905 11.9971 9.93745 11.7941 9.25567 11.4808C8.91949 11.3261 8.57591 11.1278 8.30898 10.8676V11.2528C8.97395 10.6537 9.90383 10.251 10.7974 10.2355C11.1477 10.2295 11.1484 9.68487 10.7974 9.69092L10.7981 9.69025Z"
                                    fill="#e8e8e8"
                                  />
                                  <path
                                    d="M9.30534 7.232C9.10766 7.82032 8.95638 8.56866 9.16078 9.17312C9.30668 9.60343 9.67581 9.97928 10.0819 10.1776C10.3959 10.3309 10.6723 9.86095 10.3569 9.70765C10.0416 9.55435 9.75448 9.28742 9.66169 8.95326C9.52386 8.45503 9.66976 7.85461 9.83045 7.3779C9.94274 7.04508 9.41695 6.90187 9.30534 7.23335V7.232Z"
                                    fill="#e8e8e8"
                                  />
                                  <defs>
                                    <linearGradient
                                      id="connect-dashboard-graphic-daybreak-yoga-logo-gradient"
                                      x1="8"
                                      y1="-1.21943e-07"
                                      x2="12.0917"
                                      y2="21.3592"
                                      gradientUnits="userSpaceOnUse"
                                    >
                                      <stop stopColor="#6a6a6a" />
                                      <stop offset="1" stopColor="#333333" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                {"Daybreak Yoga"}
                              </div>
                              <div>{"United States"}</div>
                              <div
                                className="connect-platform-graphic__dashboard-table-amount connect-platform-graphic__dashboard-table-amount--daybreak-yoga tabular-nums--tight"
                                style={{
                                  fontWeight: "var(--hds-font-weight-normal)",
                                  color: "var(--hds-color-core-neutral-600)",
                                }}
                              >
                                {"$1,502.00"}
                              </div>
                              <div
                                className="connect-platform-graphic__dashboard-table-amount connect-platform-graphic__dashboard-table-amount--daybreak-yoga tabular-nums--tight"
                                style={{
                                  fontWeight: "var(--hds-font-weight-normal)",
                                  color: "var(--hds-color-core-neutral-600)",
                                }}
                              >
                                {"$7,880.00"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="17"
                                  viewBox="0 0 16 17"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    cx="7.99988"
                                    cy="8.53076"
                                    r="8"
                                    fill="#afafaf"
                                  />
                                  <path
                                    d="M4.71961 11.3254L5.78299 10.4465C6.32553 11.2928 7.13934 11.7811 8.0291 11.7811C8.90801 11.7811 9.56991 11.3796 9.56991 10.6309C9.56991 9.83881 8.7561 9.73031 7.59507 9.44819C6.42318 9.16607 5.16449 8.81884 5.16449 7.29973C5.16449 5.85657 6.40148 4.93426 7.97485 4.93426C9.30949 4.93426 10.3512 5.5636 10.872 6.37741L9.85203 7.25633C9.418 6.58358 8.84291 6.11699 7.93144 6.11699C7.09593 6.11699 6.52084 6.54017 6.52084 7.15867C6.52084 7.84227 7.11763 7.98333 8.17016 8.22205C9.42885 8.50417 10.9371 8.79714 10.9371 10.4899C10.9371 12.0198 9.59161 12.9638 7.9857 12.9638C6.65105 12.9638 5.32725 12.3236 4.71961 11.3254Z"
                                    fill="white"
                                  />
                                </svg>
                                {"Sacred Space"}
                              </div>
                              <div>{"UK"}</div>
                              <div className="tabular-nums--tight">
                                {"$1,247.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$24,569.09"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row connect-platform-graphic__dashboard-table-row--jackson-hot-yoga"
                              style={{ opacity: "1" }}
                            >
                              <div
                                className="connect-platform-graphic__dashboard-table-row-bg"
                                style={{ opacity: "0" }}
                              ></div>
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="17"
                                  height="17"
                                  viewBox="0 0 17 17"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    cx="8.87866"
                                    cy="8.16846"
                                    r="8"
                                    fill="#6e6e6e"
                                  />
                                  <path
                                    d="M6.91132 11.7767V10.5398C7.28025 10.6049 7.44301 10.6266 7.77939 10.6266C8.6149 10.6266 9.03808 10.3336 9.03808 9.46553V3.99673H10.427V9.57404C10.427 11.1257 9.52636 11.8636 7.94215 11.8636C7.56237 11.8636 7.28025 11.8419 6.91132 11.7767Z"
                                    fill="white"
                                  />
                                </svg>
                                {"Jackson Hot Yoga"}
                              </div>
                              <div>{"Australia"}</div>
                              <div className="connect-platform-graphic__dashboard-table-amount connect-platform-graphic__dashboard-table-amount--jackson-hot-yoga tabular-nums--tight">
                                {"$3,660.00"}
                              </div>
                              <div className="connect-platform-graphic__dashboard-table-amount connect-platform-graphic__dashboard-table-amount--jackson-hot-yoga tabular-nums--tight">
                                {"$12,643.30"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    width="16"
                                    height="16"
                                    rx="8"
                                    fill="url(#connect-dashboard-graphic-harmony-flow-logo-gradient)"
                                  />
                                  <defs>
                                    <linearGradient
                                      id="connect-dashboard-graphic-harmony-flow-logo-gradient"
                                      x1="16"
                                      y1="5.33309"
                                      x2="6.67512e-09"
                                      y2="10.6669"
                                      gradientUnits="userSpaceOnUse"
                                    >
                                      <stop
                                        offset="0.355769"
                                        stopColor="#b2b2b2"
                                      />
                                      <stop
                                        offset="0.634615"
                                        stopColor="#535353"
                                      />
                                      <stop offset="1" stopColor="#535353" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                {"Harmony Flow"}
                              </div>
                              <div>{"United States"}</div>
                              <div className="tabular-nums--tight">
                                {"$30,930.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$294,669.65"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="17"
                                  height="17"
                                  viewBox="0 0 17 17"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    cx="8.8761"
                                    cy="8.12207"
                                    r="8"
                                    fill="#8a8a8a"
                                  />
                                  <path
                                    d="M6.38794 12.4358V4.64493H9.48041C11.1514 4.64493 12.0412 5.37193 12.0412 6.69572C12.0412 7.66144 11.477 8.16058 10.9344 8.3776C11.7482 8.63802 12.2908 9.31076 12.2908 10.2656C12.2908 11.6328 11.2816 12.4358 9.67573 12.4358H6.38794ZM7.72259 7.86761H9.3502C10.24 7.86761 10.7283 7.52038 10.7283 6.83678C10.7283 6.15318 10.24 5.81681 9.3502 5.81681H7.72259V7.86761ZM7.72259 9.03949V11.2639H9.59977C10.4787 11.2639 10.9561 10.8082 10.9561 10.1463C10.9561 9.49523 10.4787 9.03949 9.59977 9.03949H7.72259Z"
                                    fill="white"
                                  />
                                </svg>
                                {"Balance at Brunch"}
                              </div>
                              <div>{"Canada"}</div>
                              <div className="tabular-nums--tight">
                                {"$335.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$3,650.36"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    width="16"
                                    height="16"
                                    rx="8"
                                    fill="white"
                                  />
                                  <path
                                    d="M6.78069 3.2085H9.21912M7.9999 2V4.417M6.78069 12.7915H9.21912M7.9999 11.583V14M4.30018 5.55942H6.7386M5.51939 4.35092V6.76792M2 8.06823H4.43842M3.21921 6.85973V9.27672M11.5616 8.06823H14M12.7808 6.85973V9.27672M9.26139 5.55942H11.6998M10.4806 4.35092V6.76792M4.30018 10.538H6.7386M5.51939 9.32954V11.7465M9.26139 10.538H11.6998M10.4806 9.32954V11.7465M7.10536 2H8.89445C9.07376 2 9.21912 2.14408 9.21912 2.32181V4.09519C9.21912 4.27292 9.07376 4.417 8.89445 4.417H7.10536C6.92605 4.417 6.78069 4.27292 6.78069 4.09519V2.32181C6.78069 2.14408 6.92605 2 7.10536 2ZM7.10536 11.583H8.89445C9.07376 11.583 9.21912 11.7271 9.21912 11.9048V13.6782C9.21912 13.8559 9.07376 14 8.89445 14H7.10536C6.92605 14 6.78069 13.8559 6.78069 13.6782V11.9048C6.78069 11.7271 6.92605 11.583 7.10536 11.583ZM4.62484 4.35092H6.41394C6.59325 4.35092 6.7386 4.495 6.7386 4.67273V6.44611C6.7386 6.62384 6.59325 6.76792 6.41394 6.76792H4.62484C4.44554 6.76792 4.30018 6.62384 4.30018 6.44611V4.67273C4.30018 4.495 4.44554 4.35092 4.62484 4.35092ZM2.32466 6.85972H4.11376C4.29307 6.85972 4.43842 7.0038 4.43842 7.18153V8.95491C4.43842 9.13264 4.29307 9.27672 4.11376 9.27672H2.32466C2.14536 9.27672 2 9.13264 2 8.95491V7.18153C2 7.0038 2.14536 6.85972 2.32466 6.85972ZM7.12482 6.79813H8.87498C9.09935 6.79813 9.28125 6.97842 9.28125 7.20083V8.93561C9.28125 9.15802 9.09935 9.33831 8.87498 9.33831H7.12482C6.90044 9.33831 6.71854 9.15802 6.71854 8.93561V7.20083C6.71854 6.97842 6.90044 6.79813 7.12482 6.79813ZM11.8862 6.85972H13.6753C13.8546 6.85972 14 7.0038 14 7.18153V8.95491C14 9.13264 13.8546 9.27672 13.6753 9.27672H11.8862C11.7069 9.27672 11.5616 9.13264 11.5616 8.95491V7.18153C11.5616 7.0038 11.7069 6.85972 11.8862 6.85972ZM9.58605 4.35092H11.3752C11.5545 4.35092 11.6998 4.495 11.6998 4.67273V6.44611C11.6998 6.62384 11.5545 6.76792 11.3752 6.76792H9.58605C9.40675 6.76792 9.26139 6.62384 9.26139 6.44611V4.67273C9.26139 4.495 9.40675 4.35092 9.58605 4.35092ZM4.62484 9.32954H6.41394C6.59325 9.32954 6.7386 9.47362 6.7386 9.65135V11.4247C6.7386 11.6025 6.59325 11.7465 6.41394 11.7465H4.62484C4.44554 11.7465 4.30018 11.6025 4.30018 11.4247V9.65135C4.30018 9.47362 4.44554 9.32954 4.62484 9.32954ZM9.58605 9.32954H11.3752C11.5545 9.32954 11.6998 9.47362 11.6998 9.65135V11.4247C11.6998 11.6025 11.5545 11.7465 11.3752 11.7465H9.58605C9.40675 11.7465 9.26139 11.6025 9.26139 11.4247V9.65135C9.26139 9.47362 9.40675 9.32954 9.58605 9.32954Z"
                                    stroke="#090B0A"
                                    strokeWidth="0.54675"
                                    strokeMiterlimit="10"
                                  />
                                </svg>
                                {"Breathline Studio"}
                              </div>
                              <div>{"United States"}</div>
                              <div className="tabular-nums--tight">
                                {"$2,245.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$8,608.00"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row connect-platform-graphic__dashboard-table-row--quiet-fire-yoga"
                              style={{ opacity: "1" }}
                            >
                              <div
                                className="connect-platform-graphic__dashboard-table-row-bg"
                                style={{ opacity: "0" }}
                              ></div>
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    width="16"
                                    height="16"
                                    rx="8"
                                    fill="#ededed"
                                  />
                                  <path
                                    d="M11.4449 9.15132C11.2641 10.2562 10.4683 11.2552 9.44482 11.687C8.69531 12.0033 7.8862 12.0744 7.08893 11.887C6.9215 11.8476 6.665 11.7189 6.51522 11.6971C5.70294 11.3518 5.00707 10.6771 4.7012 9.83668C4.25838 8.61995 4.57984 7.54105 5.33521 6.55162C6.04757 5.61848 7.34527 4.77872 7.27294 3.45562C7.26267 3.26788 7.20873 3.14573 7.16357 2.97385C7.126 2.83079 7.13846 2.77034 7.30247 2.81397C7.63819 2.90332 8.10106 3.22175 8.36338 3.4513C9.28172 4.2549 9.78046 5.41115 9.50214 6.64416L9.4748 6.7866C9.46915 6.82272 9.45695 6.85527 9.46478 6.89189C9.57324 6.85058 9.67629 6.78295 9.7638 6.70647C9.97123 6.52525 10.1328 6.22371 10.2223 5.96428C10.2674 5.8335 10.293 5.63683 10.3494 5.52042C10.3725 5.4728 10.4209 5.44349 10.4741 5.45951C10.5212 5.47375 10.7181 5.80626 10.7541 5.86974C11.0906 6.46343 11.34 7.10877 11.4469 7.78151C11.519 8.23517 11.5168 8.69762 11.4449 9.15132Z"
                                    fill="#959595"
                                  />
                                  <path
                                    d="M9.86419 8.11589C9.8764 8.11407 9.87701 8.11232 9.88456 8.12208C9.91508 8.16127 9.97401 8.27681 9.99871 8.3263C10.4881 9.30643 10.0987 10.8056 9.16565 11.3904C8.40788 11.8652 7.23093 11.7675 6.54108 11.2054C5.79846 10.6002 5.60546 9.45668 5.96316 8.58769C6.27353 7.8337 6.79264 7.41924 7.28289 6.81654C7.68348 6.32406 7.94848 5.78273 7.92093 5.12647C7.93821 5.12194 7.94085 5.13369 7.95083 5.14141C8.31147 5.41999 8.6415 6.12308 8.66864 6.57562C8.68843 6.90613 8.58649 7.25276 8.62962 7.56791C8.66785 7.84711 9.04432 8.4374 9.35093 8.45683C9.54141 8.46891 9.77664 8.27669 9.86419 8.11589Z"
                                    fill="#a9a9a9"
                                  />
                                  <path
                                    d="M9.43506 11.6904C9.45551 11.6961 9.47712 11.6966 9.49399 11.6968C9.92857 11.7022 10.425 11.6629 10.8497 11.6963C11.0614 11.713 11.105 11.8927 11.0414 12.0707C10.7683 12.8353 9.3332 13.1982 8.61709 13.2715C7.57684 13.378 5.78006 13.2081 5.03983 12.3689C4.89533 12.2051 4.65573 11.7854 5.0051 11.7067L6.49981 11.6966C6.5031 11.697 6.50653 11.6962 6.50979 11.6966C6.65956 11.7184 6.91607 11.8471 7.0835 11.8865C7.88077 12.074 8.68554 12.0066 9.43506 11.6904Z"
                                    fill="#171A16"
                                  />
                                  <path
                                    d="M7.77351 7.99413C7.74052 8.03132 7.70432 8.07052 7.67495 8.10601C7.36154 8.48502 6.94573 9.43065 6.87937 9.92292C6.7889 10.594 6.97394 11.3516 7.66534 11.6068C8.89558 12.0609 9.57384 10.3668 8.8362 9.51522L8.80675 9.48981C8.76791 9.45631 8.72968 9.4221 8.69215 9.3871C8.49478 9.20318 8.2643 9.04662 8.13188 8.80981C7.96284 8.50744 7.95657 8.15982 7.96387 7.82075C7.964 7.81581 7.95847 7.8127 7.95443 7.81548C7.94453 7.82229 7.93682 7.83179 7.92894 7.84105C7.91472 7.85783 7.90655 7.86708 7.89356 7.87991L7.77351 7.99413Z"
                                    fill="#b9b9b9"
                                  />
                                </svg>
                                {"Quiet Fire Yoga"}
                              </div>
                              <div>{"UK"}</div>
                              <div className="connect-platform-graphic__dashboard-table-amount connect-platform-graphic__dashboard-table-amount--quiet-fire-yoga tabular-nums--tight">
                                {"$388.00"}
                              </div>
                              <div className="connect-platform-graphic__dashboard-table-amount connect-platform-graphic__dashboard-table-amount--quiet-fire-yoga tabular-nums--tight">
                                {"$1,568.87"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="17"
                                  height="17"
                                  viewBox="0 0 17 17"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    cx="8.87766"
                                    cy="8.27393"
                                    r="8"
                                    fill="#6e6e6e"
                                  />
                                  <path
                                    d="M12.13 11.3724V12.5876H6.05355V11.5134L10.3288 6.01207H6.09695V4.79678H12.0866V5.87101L7.82223 11.3724H12.13Z"
                                    fill="white"
                                  />
                                </svg>
                                {"Zenith Zen"}
                              </div>
                              <div>{"Australia"}</div>
                              <div className="tabular-nums--tight">
                                {"$660.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$1,643.30"}
                              </div>
                            </div>
                            <div
                              className="connect-platform-graphic__dashboard-table-row"
                              style={{ opacity: "1" }}
                            >
                              <div className="connect-platform-graphic__dashboard-table-account-column">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8Z"
                                    fill="#afafaf"
                                  />
                                  <path
                                    d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8Z"
                                    fill="#afafaf"
                                  />
                                  <path
                                    d="M8.74929 12H7.62081L5.58086 5.97782V12H4.28962V4.20914H6.19936L8.20675 10.1771L10.2141 4.20914H12.0805V12H10.7892V5.97782L8.74929 12Z"
                                    fill="white"
                                  />
                                </svg>
                                {"M.E. Yoga"}
                              </div>
                              <div>{"Canada"}</div>
                              <div className="tabular-nums--tight">
                                {"$4,424.00"}
                              </div>
                              <div className="tabular-nums--tight">
                                {"$6,709.60"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="connect-platform-graphic__connection">
                    <svg
                      width="131"
                      height="95"
                      viewBox="0 0 131 95"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <mask id="connect-platform-graphic-connection-mask">
                        <path
                          d="M1.00002 95 L1 9.45337 C1 4.7847 4.7847 1 9.45337 1 L131 1.00001"
                          stroke="white"
                          strokeWidth="0.8025"
                          strokeDasharray="222"
                          strokeDashoffset="150"
                          className="connect-platform-graphic__connection-mask"
                        />
                      </mask>
                      <path
                        d="M1.00002 95 L1 9.45337 C1 4.7847 4.7847 1 9.45337 1 L131 1.00001"
                        stroke="url(#connect-platform-graphic-connection-gradient)"
                        strokeWidth="0.8025"
                        strokeDasharray="1.07 1.07"
                        mask="url(#connect-platform-graphic-connection-mask)"
                      />
                      <defs>
                        <linearGradient
                          id="connect-platform-graphic-connection-gradient"
                          x1="4.77907"
                          y1="-0.76242"
                          x2="4.67673"
                          y2="45.7761"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#757575" />
                          <stop offset="1" stopColor="#bebebe" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 9 9"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="connect-platform-graphic__connection-ring"
                      style={{ transform: "scale(0)" }}
                    >
                      <circle
                        cx="4.14003"
                        cy="4.14"
                        r="2.14"
                        transform="rotate(90 4.14003 4.14)"
                        fill="white"
                      />
                      <circle
                        cx="4.14003"
                        cy="4.14"
                        r="3.07625"
                        transform="rotate(90 4.14003 4.14)"
                        stroke="#757575"
                        strokeOpacity="0.3"
                        strokeWidth="1.8725"
                      />
                      <circle
                        cx="4.14003"
                        cy="4.14"
                        r="1.73875"
                        transform="rotate(90 4.14003 4.14)"
                        fill="white"
                        stroke="#757575"
                        strokeWidth="0.8025"
                      />
                    </svg>
                    <div
                      className="connect-platform-graphic__connection-amount-pill-container"
                      style={{
                        "--translate-x": "-40px",
                        "--translate-y": "70px",
                      }}
                    >
                      <div
                        className="connect-platform-graphic__connection-amount-pill"
                        style={{ opacity: "1", transform: "scale(1)" }}
                      >
                        {"$999.00"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="modular-solutions-bento-card__background">
        <div className="connect-graphic__background">
          <picture className="connect-graphic__background-image">
            <source
              type="image/webp"
              srcSet="/stripe/connect-bento-card-background-image-w1232-0789340a-mono.webp 1x, /stripe/connect-bento-card-background-image-w2464-130d999b-mono.webp 2x"
            />
            <img
              loading="lazy"
              width="2464"
              height="900"
              alt=""
              srcSet="/stripe/connect-bento-card-background-image-w1232-7e3035f4-mono.jpg 1x, /stripe/connect-bento-card-background-image-w2464-e60db76b-mono.jpg 2x"
              src="/stripe/connect-bento-card-background-image-w1232-7e3035f4-mono.jpg"
            />
          </picture>
          <picture className="connect-graphic__background-image-mobile">
            <source
              type="image/webp"
              srcSet="/stripe/ConnectMobileBackground-w296-d94fcdf7-mono.webp 296w, /stripe/ConnectMobileBackground-w396-5f5bc214-mono.webp 396w, /stripe/ConnectMobileBackground-w608-8ad4d33c-mono.webp 608w, /stripe/ConnectMobileBackground-w816-72b54f77-mono.webp 816w, /stripe/ConnectMobileBackground-w1104-a28fe1b6-mono.webp 1104w"
            />
            <img
              loading="lazy"
              width="1104"
              height="1620"
              alt=""
              sizes="(min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
              srcSet="/stripe/ConnectMobileBackground-w296-0b540537-mono.jpg 296w, /stripe/ConnectMobileBackground-w396-64ae4ba1-mono.jpg 396w, /stripe/ConnectMobileBackground-w608-b5c332a5-mono.jpg 608w, /stripe/ConnectMobileBackground-w816-7e3ff278-mono.jpg 816w, /stripe/ConnectMobileBackground-w1104-11dc789b-mono.jpg 1104w"
              src="/stripe/ConnectMobileBackground-w296-0b540537-mono.jpg"
            />
          </picture>
        </div>
      </div>
    </>
  );
}
