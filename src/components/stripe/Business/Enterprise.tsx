"use client";

import { useEffect, useRef, useState } from "react";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs ".business-sizes-section > .section-container > .section-row > section" 0).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */

export function Enterprise() {
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);
  const [textWidths, setTextWidths] = useState<number[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reference: every story is open on mobile (sticky stacked cards); one at a time otherwise.
  const isOpen = (i: number) => mobile || i === active;
  const toggle = (i: number) => {
    if (!mobile) setActive(i);
  };
  const buttonWidth = (i: number) =>
    isOpen(i) ? `${(textWidths[i] || 116) + 50}px` : "40px";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const measure = () => {
      setMobile(mq.matches);
      setHeights(panelRefs.current.map((el) => el?.scrollHeight ?? 0));
      setTextWidths(
        textRefs.current.map((el) => Math.round(el?.offsetWidth ?? 0)),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    panelRefs.current.forEach((el) => el && ro.observe(el));
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  return (
    <>
      <section
        className="section-row section-row-gap"
        style={{
          "--section-row-gap-mb": "var(--hds-space-core-300)",
          "--section-row-gap-tb": "var(--hds-space-core-400)",
          "--section-row-gap-dt": "var(--hds-space-core-600)",
        }}
      >
        <header className="section-header section-header--title-span-5">
          <div className="section-header__primary">
            <h3 className="hds-heading section-header__title hds-heading--md">
              {"Transform your enterprise with agile financial infrastructure"}
            </h3>
            <div className="hds-button-group section-header__actions">
              <a
                className="hds-button hds-button--primary"
                href="/enterprise"
                data-analytics-label="stripe_for_enterprises"
              >
                {"Stripe for enterprises"}
                <span className="hds-nowrap-svg">
                  <svg
                    className="hds-icon hds-icon-hover-arrow"
                    width="5"
                    height="8"
                    fill="none"
                    viewBox="0 0.5 5 8"
                  >
                    <defs>
                      <clipPath id=":Reijnmr6l6:">
                        <rect x="0" y="0" width="12" height="9" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#:Reijnmr6l6:)">
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
              "50% of Fortune 100 companies have used Stripe to grow their businesses—from expanding internationally to reimagining the customer experience."
            }
          </p>
        </header>
        <div className="customer-stories">
          <div
            className="customer-stories__customer"
            id="customer-Hertz"
            style={{ "--idx": "0" }}
          >
            <div
              className={`customer-stories__customer-summary${isOpen(0) ? " customer-stories__customer-summary--open" : ""}`}
              onClick={() => toggle(0)}
            >
              <div className="customer-stories__customer-summary-logo">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    fill="#FFD100"
                    d="M0 4a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4Z"
                  />
                  <path
                    fill="#FAFBFD"
                    d="M29.552 32H9.75l.24-3.533h19.785L29.552 32Z"
                  />
                  <path
                    fill="#000"
                    d="m19.443 8-1.875 8.823h6.915L26.364 8h3.937l-4.026 18.94h-3.941l1.393-6.562h-6.92l-1.387 6.561h-3.975L15.467 8h3.976Z"
                  />
                </svg>
              </div>
              <button
                type="button"
                className="customer-stories__customer-button"
                aria-expanded={isOpen(0)}
                aria-controls="detail-customer-content-Hertz"
                tabIndex={isOpen(0) ? -1 : 0}
              >
                <h3
                  className="hds-heading customer-stories__customer-summary-description hds-heading--sm"
                  id="summary-customer-content-Hertz"
                >
                  {"Hertz unifies commerce with Stripe."}
                </h3>
              </button>
              <div className="customer-stories__customer-summary-action">
                <a
                  className={`hds-button customer-story-button${isOpen(0) ? " customer-story-button--open" : ""} hds-button--secondary-on-quiet hds-button--compact`}
                  href="/customers/hertz"
                  style={{ width: buttonWidth(0) }}
                  tabIndex={isOpen(0) ? 0 : -1}
                  onClick={(e) => {
                    if (!isOpen(0)) e.preventDefault();
                  }}
                  aria-label="Read Hertz's story"
                  data-analytics-label="hertz__read_the_story"
                >
                  <div
                    className="customer-story-button__container"
                    style={{ width: buttonWidth(0) }}
                  >
                    <div
                      className="customer-story-button__text"
                      ref={(el) => {
                        textRefs.current[0] = el;
                      }}
                      style={{ opacity: isOpen(0) ? 1 : 0 }}
                    >
                      <div>{"Read the story"}</div>
                      <span className="hds-nowrap-svg">
                        <svg
                          className="hds-icon hds-icon-hover-arrow customer-story-button__icon--arrow"
                          width="5"
                          height="8"
                          fill="none"
                          viewBox="0 0.5 5 8"
                        >
                          <defs>
                            <clipPath id=":R16mj3nmr6l6:">
                              <rect x="0" y="0" width="12" height="9" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#:R16mj3nmr6l6:)">
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
                    </div>
                    <div
                      className="customer-story-button__icon"
                      style={{ opacity: isOpen(0) ? 0 : 1 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          fill="currentColor"
                          d="M6.87988 5.125H11.75v1.75H6.87988v4.875h-1.75V6.875H.25v-1.75h4.87988V.25h1.75z"
                        />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <div
              role="region"
              id="detail-customer-content-Hertz"
              aria-labelledby="summary-customer-content-Hertz"
              className="customer-stories__customer-content"
              ref={(el) => {
                panelRefs.current[0] = el;
              }}
              style={{
                "--max-height": isOpen(0) ? `${heights[0] || 0}px` : "0px",
              }}
            >
              <div className="customer-stories__customer-image">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/stripe/enterprise-accordion-hertz-w296-72c28c4b-mono.webp 296w, /stripe/enterprise-accordion-hertz-w396-4249b15f-mono.webp 396w, /stripe/enterprise-accordion-hertz-w608-e4307892-mono.webp 608w, /stripe/enterprise-accordion-hertz-w816-ef08c21e-mono.webp 816w, /stripe/enterprise-accordion-hertz-w1232-525c6142-mono.webp 1232w, /stripe/enterprise-accordion-hertz-w1632-0649620f-mono.webp 1632w, /stripe/enterprise-accordion-hertz-w2460-0c7fe1fe-mono.webp 2460w"
                  />
                  <img
                    loading="lazy"
                    width="2460"
                    height="1060"
                    alt="Aerial view of a street intersection where the crosswalks form a slanted parallelogram, imitating the Stripe logo."
                    sizes="(min-width: 1298px) 1232px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                    srcSet="/stripe/enterprise-accordion-hertz-w296-910146a0-mono.png 296w, /stripe/enterprise-accordion-hertz-w396-6a2f63b6-mono.png 396w, /stripe/enterprise-accordion-hertz-w608-c9d91c82-mono.png 608w, /stripe/enterprise-accordion-hertz-w816-95eb055a-mono.png 816w, /stripe/enterprise-accordion-hertz-w1232-348fc4de-mono.png 1232w, /stripe/enterprise-accordion-hertz-w1632-903ac21c-mono.png 1632w, /stripe/enterprise-accordion-hertz-w2460-34ae9057-mono.png 2460w"
                    src="/stripe/enterprise-accordion-hertz-w296-910146a0-mono.png"
                  />
                </picture>
              </div>
              <div className="customer-stories__customer-data">
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"160"}
                    </p>
                    {" countries"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"11K+"}
                    </p>
                    {" locations globally"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"Products used"}
                    </p>
                    {" Payments, Terminal, Connect, Radar, and Stripe Sigma"}
                  </div>
                </div>
              </div>
              <div className="customer-stories__customer-content--read">
                <a
                  className="hds-button hds-button--secondary"
                  href="/customers/hertz"
                  id="customer-content-Hertz"
                  aria-label="Read Hertz's story"
                  data-analytics-label="hertz__read_the_story"
                >
                  {"Read the story"}
                  <span className="hds-nowrap-svg">
                    <svg
                      className="hds-icon hds-icon-hover-arrow"
                      width="5"
                      height="8"
                      fill="none"
                      viewBox="0 0.5 5 8"
                    >
                      <defs>
                        <clipPath id=":R3n33nmr6l6:">
                          <rect x="0" y="0" width="12" height="9" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#:R3n33nmr6l6:)">
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
          </div>
          <div
            className="customer-stories__customer"
            id="customer-URBN"
            style={{ "--idx": "1" }}
          >
            <div
              className={`customer-stories__customer-summary${isOpen(1) ? " customer-stories__customer-summary--open" : ""}`}
              onClick={() => toggle(1)}
            >
              <div className="customer-stories__customer-summary-logo">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect width="40" height="40" fill="#000" rx="2" />
                  <path
                    fill="#FAFBFD"
                    fillRule="evenodd"
                    d="M5 33.26h30V7H5v26.26Zm14.36-18.15c-.017 1.153-.017 2.244-.992 3.259-1.185 1.245-3.394 1.66-5.131 1.66-.813 0-1.624-.078-2.42-.262a6.282 6.282 0 0 1-1.981-.783c-1.803-1.153-1.82-2.583-1.82-3.873V8.809h2.86v6.379c0 .968.21 1.782 1.298 2.274.926.415 1.754.384 2.599.354 1.088-.093 1.786-.37 2.24-.861.277-.307.52-.661.488-1.752V8.808h2.858v6.302Zm.107 13.196c0 .63-.153 1.29-.542 1.828-.931 1.276-2.471 1.276-3.639 1.291H7.078v-10.85h7.751c1.235.03 2.742.061 3.554 1.122.423.553.474 1.153.474 1.537 0 .292-.034.907-.474 1.445-.49.584-1.134.768-1.506.86.745.185 2.59.6 2.59 2.767Zm10.083-13.18 3.475 4.533h-3.378l-3.07-4.364h-3.263v4.364h-2.875V8.81h7.892c1.3 0 2.485.108 3.443 1.153.585.645.748 1.46.748 2.09 0 .83-.292 1.814-1.105 2.398-.617.446-1.413.599-1.867.676Zm3.54 16.316h-2.842l-5.684-6.116c-.6-.661-.844-.938-1.477-1.706.08.83.08 1.014.097 1.844v5.978h-2.728v-10.85h2.858l5.619 6.04c.682.753.812.907 1.527 1.752-.098-1.03-.098-1.307-.114-2.244v-5.548h2.744v10.85Zm-3.476-19.359c0-.215-.032-.584-.227-.845-.21-.262-.487-.523-1.624-.523h-4.45v2.659h4.58c.617 0 1.721-.077 1.721-1.29ZM16.471 28.044c0-1.306-1.134-1.306-1.574-1.306H10.04v2.782h4.485c.676 0 1.946.015 1.946-1.476Zm-.474-4.41c0-1.153-.965-1.168-1.439-1.168H10.04v2.382h4.282c.355 0 .693-.016.964-.108.71-.261.71-.984.71-1.106Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <button
                type="button"
                className="customer-stories__customer-button"
                aria-expanded={isOpen(1)}
                aria-controls="detail-customer-content-URBN"
                tabIndex={isOpen(1) ? -1 : 0}
              >
                <h3
                  className="hds-heading customer-stories__customer-summary-description hds-heading--sm"
                  id="summary-customer-content-URBN"
                >
                  {
                    "URBN consolidates $5 billion in online and in-store revenue onto Stripe."
                  }
                </h3>
              </button>
              <div className="customer-stories__customer-summary-action">
                <a
                  className={`hds-button customer-story-button${isOpen(1) ? " customer-story-button--open" : ""} hds-button--secondary-on-quiet hds-button--compact`}
                  href="/customers/urbn"
                  style={{ width: buttonWidth(1) }}
                  tabIndex={isOpen(1) ? 0 : -1}
                  onClick={(e) => {
                    if (!isOpen(1)) e.preventDefault();
                  }}
                  aria-label="Read URBN's story"
                  data-analytics-label="urbn__read_the_story"
                >
                  <div
                    className="customer-story-button__container"
                    style={{ width: buttonWidth(1) }}
                  >
                    <div
                      className="customer-story-button__text"
                      ref={(el) => {
                        textRefs.current[1] = el;
                      }}
                      style={{ opacity: isOpen(1) ? 1 : 0 }}
                    >
                      <div>{"Read the story"}</div>
                      <span className="hds-nowrap-svg">
                        <svg
                          className="hds-icon hds-icon-hover-arrow customer-story-button__icon--arrow"
                          width="5"
                          height="8"
                          fill="none"
                          viewBox="0 0.5 5 8"
                        >
                          <defs>
                            <clipPath id=":R16ml3nmr6l6:">
                              <rect x="0" y="0" width="12" height="9" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#:R16ml3nmr6l6:)">
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
                    </div>
                    <div
                      className="customer-story-button__icon"
                      style={{ opacity: isOpen(1) ? 0 : 1 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          fill="currentColor"
                          d="M6.87988 5.125H11.75v1.75H6.87988v4.875h-1.75V6.875H.25v-1.75h4.87988V.25h1.75z"
                        />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <div
              role="region"
              id="detail-customer-content-URBN"
              aria-labelledby="summary-customer-content-URBN"
              className="customer-stories__customer-content"
              ref={(el) => {
                panelRefs.current[1] = el;
              }}
              style={{
                "--max-height": isOpen(1) ? `${heights[1] || 0}px` : "0px",
              }}
            >
              <div className="customer-stories__customer-image">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/stripe/enterprise-accordion-urbn-w296-d8b19d43-mono.webp 296w, /stripe/enterprise-accordion-urbn-w396-7515d506-mono.webp 396w, /stripe/enterprise-accordion-urbn-w608-4d9ea29b-mono.webp 608w, /stripe/enterprise-accordion-urbn-w816-6b3ccaac-mono.webp 816w, /stripe/enterprise-accordion-urbn-w1232-632778c6-mono.webp 1232w, /stripe/enterprise-accordion-urbn-w1632-395f1283-mono.webp 1632w, /stripe/enterprise-accordion-urbn-w2460-3dea3854-mono.webp 2460w"
                  />
                  <img
                    loading="lazy"
                    width="2460"
                    height="1060"
                    alt="Exterior view of a clothing boutique with a large window display showcasing garments, where the window frame forms Stripe's parallelogram logo."
                    sizes="(min-width: 1298px) 1232px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                    srcSet="/stripe/enterprise-accordion-urbn-w296-2147ab62-mono.png 296w, /stripe/enterprise-accordion-urbn-w396-fa723b14-mono.png 396w, /stripe/enterprise-accordion-urbn-w608-d9f41385-mono.png 608w, /stripe/enterprise-accordion-urbn-w816-f40089fc-mono.png 816w, /stripe/enterprise-accordion-urbn-w1232-283ab04f-mono.png 1232w, /stripe/enterprise-accordion-urbn-w1632-47ba1b80-mono.png 1632w, /stripe/enterprise-accordion-urbn-w2460-70dfce5c-mono.png 2460w"
                    src="/stripe/enterprise-accordion-urbn-w296-2147ab62-mono.png"
                  />
                </picture>
              </div>
              <div className="customer-stories__customer-data">
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"5+"}
                    </p>
                    {" consumer brands in retailer portfolio"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"700+"}
                    </p>
                    {" store locations"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"Products used"}
                    </p>
                    {
                      " Payments, Terminal, Connect, Stripe Sigma, Radar, and Link"
                    }
                  </div>
                </div>
              </div>
              <div className="customer-stories__customer-content--read">
                <a
                  className="hds-button hds-button--secondary"
                  href="/customers/urbn"
                  id="customer-content-URBN"
                  aria-label="Read URBN's story"
                  data-analytics-label="urbn__read_the_story"
                >
                  {"Read the story"}
                  <span className="hds-nowrap-svg">
                    <svg
                      className="hds-icon hds-icon-hover-arrow"
                      width="5"
                      height="8"
                      fill="none"
                      viewBox="0 0.5 5 8"
                    >
                      <defs>
                        <clipPath id=":R3n53nmr6l6:">
                          <rect x="0" y="0" width="12" height="9" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#:R3n53nmr6l6:)">
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
          </div>
          <div
            className="customer-stories__customer"
            id="customer-Instacart"
            style={{ "--idx": "2" }}
          >
            <div
              className={`customer-stories__customer-summary${isOpen(2) ? " customer-stories__customer-summary--open" : ""}`}
              onClick={() => toggle(2)}
            >
              <div className="customer-stories__customer-summary-logo">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="none"
                  viewBox="0 0 40 40"
                  aria-hidden="true"
                >
                  <rect width="40" height="40" fill="#faf1e5" rx="2" />
                  <path
                    fill="#0aad0a"
                    d="M30.175 10.734c-1.575 0-2.643.675-3.655 2.137l-2.923 4.216V5h-7.084v12.087l-2.923-4.216c-1.012-1.462-2.137-2.137-3.655-2.137-2.36 0-3.879 1.743-3.935 3.88 0 1.799.843 3.035 2.642 4.16L20 26.082l11.356-7.308c1.8-1.18 2.699-2.361 2.643-4.16.056-2.137-1.462-3.88-3.823-3.88"
                  />
                  <path
                    fill="#ff7009"
                    d="M20.055 27.7c6.747 0 12.312 5.055 12.312 12.3H7.743c0-7.245 5.566-12.3 12.312-12.3"
                  />
                </svg>
              </div>
              <button
                type="button"
                className="customer-stories__customer-button"
                aria-expanded={isOpen(2)}
                aria-controls="detail-customer-content-Instacart"
                tabIndex={isOpen(2) ? -1 : 0}
              >
                <h3
                  className="hds-heading customer-stories__customer-summary-description hds-heading--sm"
                  id="summary-customer-content-Instacart"
                >
                  {"Instacart powers online grocery delivery with Stripe."}
                </h3>
              </button>
              <div className="customer-stories__customer-summary-action">
                <a
                  className={`hds-button customer-story-button${isOpen(2) ? " customer-story-button--open" : ""} hds-button--secondary-on-quiet hds-button--compact`}
                  href="/customers/instacart"
                  style={{ width: buttonWidth(2) }}
                  tabIndex={isOpen(2) ? 0 : -1}
                  onClick={(e) => {
                    if (!isOpen(2)) e.preventDefault();
                  }}
                  aria-label="Read Instacart's story"
                  data-analytics-label="instacart__read_the_story"
                >
                  <div
                    className="customer-story-button__container"
                    style={{ width: buttonWidth(2) }}
                  >
                    <div
                      className="customer-story-button__text"
                      ref={(el) => {
                        textRefs.current[2] = el;
                      }}
                      style={{ opacity: isOpen(2) ? 1 : 0 }}
                    >
                      <div>{"Read the story"}</div>
                      <span className="hds-nowrap-svg">
                        <svg
                          className="hds-icon hds-icon-hover-arrow customer-story-button__icon--arrow"
                          width="5"
                          height="8"
                          fill="none"
                          viewBox="0 0.5 5 8"
                        >
                          <defs>
                            <clipPath id=":R16mn3nmr6l6:">
                              <rect x="0" y="0" width="12" height="9" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#:R16mn3nmr6l6:)">
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
                    </div>
                    <div
                      className="customer-story-button__icon"
                      style={{ opacity: isOpen(2) ? 0 : 1 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          fill="currentColor"
                          d="M6.87988 5.125H11.75v1.75H6.87988v4.875h-1.75V6.875H.25v-1.75h4.87988V.25h1.75z"
                        />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <div
              role="region"
              id="detail-customer-content-Instacart"
              aria-labelledby="summary-customer-content-Instacart"
              className="customer-stories__customer-content"
              ref={(el) => {
                panelRefs.current[2] = el;
              }}
              style={{
                "--max-height": isOpen(2) ? `${heights[2] || 0}px` : "0px",
              }}
            >
              <div className="customer-stories__customer-image">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/stripe/enterprise-accordion-instacart-w296-9e4efdcd-mono.webp 296w, /stripe/enterprise-accordion-instacart-w396-7433de40-mono.webp 396w, /stripe/enterprise-accordion-instacart-w608-cddbf27d-mono.webp 608w, /stripe/enterprise-accordion-instacart-w816-6d5c9645-mono.webp 816w, /stripe/enterprise-accordion-instacart-w1232-2c03ec20-mono.webp 1232w, /stripe/enterprise-accordion-instacart-w1632-bcf0a706-mono.webp 1632w, /stripe/enterprise-accordion-instacart-w2460-7687befe-mono.webp 2460w"
                  />
                  <img
                    loading="lazy"
                    width="2460"
                    height="1060"
                    alt="Overhead view of a door stoop with a grocery delivery bag containing flowers, bread, olive oil, and produce, where the bag's shape forms Stripe's parallelogram logo."
                    sizes="(min-width: 1298px) 1232px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                    srcSet="/stripe/enterprise-accordion-instacart-w296-3fa47278-mono.png 296w, /stripe/enterprise-accordion-instacart-w396-8c8f48da-mono.png 396w, /stripe/enterprise-accordion-instacart-w608-5fbc4102-mono.png 608w, /stripe/enterprise-accordion-instacart-w816-6243e174-mono.png 816w, /stripe/enterprise-accordion-instacart-w1232-8b075cfc-mono.png 1232w, /stripe/enterprise-accordion-instacart-w1632-da4159ea-mono.png 1632w, /stripe/enterprise-accordion-instacart-w2460-bef3944f-mono.png 2460w"
                    src="/stripe/enterprise-accordion-instacart-w296-3fa47278-mono.png"
                  />
                </picture>
              </div>
              <div className="customer-stories__customer-data">
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"600K+"}
                    </p>
                    {" shoppers"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"1.8K"}
                    </p>
                    {" retail partners across nearly 100K stores"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"Products used"}
                    </p>
                    {" Payments, Connect, Data Pipeline, and Issuing"}
                  </div>
                </div>
              </div>
              <div className="customer-stories__customer-content--read">
                <a
                  className="hds-button hds-button--secondary"
                  href="/customers/instacart"
                  id="customer-content-Instacart"
                  aria-label="Read Instacart's story"
                  data-analytics-label="instacart__read_the_story"
                >
                  {"Read the story"}
                  <span className="hds-nowrap-svg">
                    <svg
                      className="hds-icon hds-icon-hover-arrow"
                      width="5"
                      height="8"
                      fill="none"
                      viewBox="0 0.5 5 8"
                    >
                      <defs>
                        <clipPath id=":R3n73nmr6l6:">
                          <rect x="0" y="0" width="12" height="9" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#:R3n73nmr6l6:)">
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
          </div>
          <div
            className="customer-stories__customer"
            id="customer-LeMonde"
            style={{ "--idx": "3" }}
          >
            <div
              className={`customer-stories__customer-summary${isOpen(3) ? " customer-stories__customer-summary--open" : ""}`}
              onClick={() => toggle(3)}
            >
              <div className="customer-stories__customer-summary-logo">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect width="40" height="40" fill="#1A171B" rx="2" />
                  <path
                    fill="#fff"
                    d="M11.206 28.596c-.168 0-.334 0-.503.026 1.17.168 1.838.78 2.061 1.504l.418-.252-.029-.083c-.083-.277-.5-1.167-1.947-1.195Zm1.058-4.175c.417-.446.583-1.058.583-2.004v-8.129c0-.835-.249-.917-.723-.835h-.057c.334.306.391.415.391 1.39v8.1c0 .53-.057 1.032-.194 1.478Z"
                  />
                  <path
                    fill="#fff"
                    d="M16.078 27.232c-.751-.806-1.81-1.31-3.313-1.31C9.9 25.953 7.169 28.01 6 29.292l.306.389c1.613-1.224 3.56-1.755 4.926-1.727 1.447.054 2.256.86 2.534 1.641l3.925-2.338-.36-.724-1.252.7ZM9.23 13.677c-.531-.14-.975-.446-1.226-.892-.28-.5-.306-1.113-.083-1.753-1.055 1.475-.335 2.785 1.31 2.645Z"
                  />
                  <path
                    fill="#fff"
                    d="m30.298 27.401-.363-.194c-.36-.197-.446-.5-.446-1.17V15.375c0-1.335.36-2.198 1.45-2.839l1.138-.666-.418-.698-.529.278c-.64.334-1.086.557-2.004.028l-2.702-1.53-3.505 2.17-2.837-2.17-3.285 1.976c-.14-1.003-1.115-2.701-3.757-1.672-.612.251-1.476.586-1.922.752-.946.334-1.418-.11-.834-.947l.446-.64L10.12 9a90.968 90.968 0 0 0-1.086 1.42c-1.253 1.642-.472 2.951 1.364 2.7.446-.055 1.17-.169 1.644-.25 1.252-.222 1.418.25 1.418 1.448v8.126c0 1.112-.195 2.06-1.058 2.73l.28.472 2.785-1.753c1.112-.695 1.335-1.698 1.335-3.088v-7.963l1.421-.806 1.167.946c.417.335.503.5.503 1.252V29.6h.223c1.112-.584 1.916-.975 1.916-.975 1.032-.529 1.198-.695 1.198-1.864V12.899l1.475-.892 3.285 1.922-.446.334c-.778.583-1.338 1.532-1.338 3.311v9.519c0 .863.223 1.309.755 1.67l1.195.808 3.48-2.087-.335-.669-1.003.586Z"
                  />
                  <path
                    fill="#fff"
                    d="m26.846 13.986-2.141-1.252-.335.22 2.227 1.31c.083-.114.166-.197.25-.278Zm-1.252 13.107-.029-9.518c0-.864.112-1.616.36-2.227-.443.611-.723 1.5-.723 2.782v9.298c0 .835.335 1.587.975 2.033l.975.669.363-.223-.889-.612c-.726-.503-1.032-1.172-1.032-2.202Zm-7.429-14.305-.42.223.64.5c.447.335.501.335.501 1.087V30.13h.223a2.01 2.01 0 0 0 .14-.086V14.235c0-.446-.054-.557-.249-.752 0-.028-.5-.417-.835-.695Z"
                  />
                </svg>
              </div>
              <button
                type="button"
                className="customer-stories__customer-button"
                aria-expanded={isOpen(3)}
                aria-controls="detail-customer-content-LeMonde"
                tabIndex={isOpen(3) ? -1 : 0}
              >
                <h3
                  className="hds-heading customer-stories__customer-summary-description hds-heading--sm"
                  id="summary-customer-content-LeMonde"
                >
                  {
                    "Le Monde improves local and international payments with Stripe."
                  }
                </h3>
              </button>
              <div className="customer-stories__customer-summary-action">
                <a
                  className={`hds-button customer-story-button${isOpen(3) ? " customer-story-button--open" : ""} hds-button--secondary-on-quiet hds-button--compact`}
                  href="/customers/le-monde"
                  style={{ width: buttonWidth(3) }}
                  tabIndex={isOpen(3) ? 0 : -1}
                  onClick={(e) => {
                    if (!isOpen(3)) e.preventDefault();
                  }}
                  aria-label="Read LeMonde's story"
                  data-analytics-label="lemonde__read_the_story"
                >
                  <div
                    className="customer-story-button__container"
                    style={{ width: buttonWidth(3) }}
                  >
                    <div
                      className="customer-story-button__text"
                      ref={(el) => {
                        textRefs.current[3] = el;
                      }}
                      style={{ opacity: isOpen(3) ? 1 : 0 }}
                    >
                      <div>{"Read the story"}</div>
                      <span className="hds-nowrap-svg">
                        <svg
                          className="hds-icon hds-icon-hover-arrow customer-story-button__icon--arrow"
                          width="5"
                          height="8"
                          fill="none"
                          viewBox="0 0.5 5 8"
                        >
                          <defs>
                            <clipPath id=":R16mp3nmr6l6:">
                              <rect x="0" y="0" width="12" height="9" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#:R16mp3nmr6l6:)">
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
                    </div>
                    <div
                      className="customer-story-button__icon"
                      style={{ opacity: isOpen(3) ? 0 : 1 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          fill="currentColor"
                          d="M6.87988 5.125H11.75v1.75H6.87988v4.875h-1.75V6.875H.25v-1.75h4.87988V.25h1.75z"
                        />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <div
              role="region"
              id="detail-customer-content-LeMonde"
              aria-labelledby="summary-customer-content-LeMonde"
              className="customer-stories__customer-content"
              ref={(el) => {
                panelRefs.current[3] = el;
              }}
              style={{
                "--max-height": isOpen(3) ? `${heights[3] || 0}px` : "0px",
              }}
            >
              <div className="customer-stories__customer-image">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/stripe/enterprise-accordion-lemonde-w296-34399acc-mono.webp 296w, /stripe/enterprise-accordion-lemonde-w396-388fae02-mono.webp 396w, /stripe/enterprise-accordion-lemonde-w608-ad5ca45c-mono.webp 608w, /stripe/enterprise-accordion-lemonde-w816-c4026b51-mono.webp 816w, /stripe/enterprise-accordion-lemonde-w1232-57ae189c-mono.webp 1232w, /stripe/enterprise-accordion-lemonde-w1632-b9706b84-mono.webp 1632w, /stripe/enterprise-accordion-lemonde-w2460-4922b2ef-mono.webp 2460w"
                  />
                  <img
                    loading="lazy"
                    width="2460"
                    height="1060"
                    alt="Street view of a traditional Parisian newspaper kiosk with yellow-framed windows displaying publications, where the window frame forms Stripe's parallelogram logo."
                    sizes="(min-width: 1298px) 1232px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                    srcSet="/stripe/enterprise-accordion-lemonde-w296-6571bad9-mono.png 296w, /stripe/enterprise-accordion-lemonde-w396-e22d5320-mono.png 396w, /stripe/enterprise-accordion-lemonde-w608-9d6fc76b-mono.png 608w, /stripe/enterprise-accordion-lemonde-w816-b184cd8d-mono.png 816w, /stripe/enterprise-accordion-lemonde-w1232-3d989b79-mono.png 1232w, /stripe/enterprise-accordion-lemonde-w1632-c9078241-mono.png 1632w, /stripe/enterprise-accordion-lemonde-w2460-830bd27e-mono.png 2460w"
                    src="/stripe/enterprise-accordion-lemonde-w296-6571bad9-mono.png"
                  />
                </picture>
              </div>
              <div className="customer-stories__customer-data">
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"100%"}
                    </p>
                    {" of digital and print payments powered by Stripe"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"Less than 3 months"}
                    </p>
                    {" to implement and go live"}
                  </div>
                </div>
                <div className="customer-stories__customer-data-stat">
                  <div className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    <p className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                      {"Products used"}
                    </p>
                    {" Payments, Stripe Sigma, and Radar"}
                  </div>
                </div>
              </div>
              <div className="customer-stories__customer-content--read">
                <a
                  className="hds-button hds-button--secondary"
                  href="/customers/le-monde"
                  id="customer-content-LeMonde"
                  aria-label="Read LeMonde's story"
                  data-analytics-label="lemonde__read_the_story"
                >
                  {"Read the story"}
                  <span className="hds-nowrap-svg">
                    <svg
                      className="hds-icon hds-icon-hover-arrow"
                      width="5"
                      height="8"
                      fill="none"
                      viewBox="0 0.5 5 8"
                    >
                      <defs>
                        <clipPath id=":R3n93nmr6l6:">
                          <rect x="0" y="0" width="12" height="9" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#:R3n93nmr6l6:)">
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
          </div>
        </div>
        <div
          className="section-row section-row-gap"
          style={{
            "--section-row-gap-mb": "var(--hds-space-core-300)",
            "--section-row-gap-tb": "var(--hds-space-core-400)",
            "--section-row-gap-dt": "var(--hds-space-core-500)",
          }}
        >
          <span className="hds-heading enterprise-values-title hds-heading--md">
            {"Realize value faster with dedicated experts"}
          </span>
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
                    fill="url(#apps-plus-gradient-id-:R2djnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10.9991 21H2.99911v-8h7.99999zm-6.49999-1.5h5v-5h-5z"
                  />
                  <path
                    fill="url(#apps-plus-gradient-id-:R2djnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M20.9991 21h-8v-8h8zm-6.5-1.5h5v-5h-5z"
                  />
                  <path
                    fill="url(#apps-plus-gradient-id-:R2djnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10.9991 11H2.99911V3h7.99999zM4.49911 9.5h5v-5h-5z"
                  />
                  <path
                    fill="url(#apps-plus-gradient-id-:R2djnmr6l6:)"
                    d="M17.7491 6.25h3.25v1.5h-3.25V11h-1.5V7.75h-3.25v-1.5h3.25V3h1.5z"
                  />
                  <defs>
                    <linearGradient
                      id="apps-plus-gradient-id-:R2djnmr6l6:"
                      x1="15.2661"
                      x2="8.65695"
                      y1="3"
                      y2="20.9999"
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
                  {"Professional services."}
                </h4>
                <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                  {
                    "Get tailored guidance from Stripe on implementation, complex integrations, or major migrations."
                  }
                </p>
              </div>
              <div className="feature-detail__footer">
                <a
                  className="hds-link hds-link--callout"
                  href="/professional-services"
                  data-analytics-label="professional_services___view_services"
                >
                  {"View services"}
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
                          <clipPath id=":Rsdjnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Rsdjnmr6l6:)">
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
                    fill="url(#person-stack-gradient-id-:R2ljnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.48682 13c1.88938 0 3.52118 1.3221 3.91308 3.1704l.2817 1.3296h7.4668l-.2158-1.0186c-.2449-1.1551-1.2649-1.9814-2.4458-1.9814h-3.9565l-1.064-1.5h5.0205c1.8894 0 3.5212 1.3221 3.9131 3.1704L23 19H1l.6001-2.8296c.37964-1.7904 1.92262-3.0871 3.73633-3.1665L5.51318 13zm-3.97364 1.5c-1.18084 0-2.20085.8263-2.4458 1.9814L2.85156 17.5h9.29684l-.2158-1.0186C11.6877 15.3263 10.6677 14.5 9.48682 14.5z"
                  />
                  <path
                    fill="url(#person-stack-gradient-id-:R2ljnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.5 4.5C9.433 4.5 11 6.067 11 8s-1.567 3.5-3.5 3.5S4 9.933 4 8s1.567-3.5 3.5-3.5m0 1.5c-1.10457 0-2 .89543-2 2s.89543 2 2 2 2-.89543 2-2-.89543-2-2-2"
                  />
                  <path
                    fill="url(#person-stack-gradient-id-:R2ljnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16.5 4.5C18.433 4.5 20 6.067 20 8s-1.567 3.5-3.5 3.5S13 9.933 13 8s1.567-3.5 3.5-3.5m0 1.5c-1.1046 0-2 .89543-2 2s.8954 2 2 2 2-.89543 2-2-.8954-2-2-2"
                  />
                  <defs>
                    <linearGradient
                      id="person-stack-gradient-id-:R2ljnmr6l6:"
                      x1="15.993"
                      x2="12.2312"
                      y1="4.5"
                      y2="20.0444"
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
                  {"Stripe-certified experts."}
                </h4>
                <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                  {
                    "Work with a Stripe consulting partner that can integrate and deploy Stripe solutions on your behalf."
                  }
                </p>
              </div>
              <div className="feature-detail__footer">
                <a
                  className="hds-link hds-link--callout"
                  href="/partners"
                  data-analytics-label="stripe_certified_experts___view_partners"
                >
                  {"View partners"}
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
                          <clipPath id=":Rsljnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Rsljnmr6l6:)">
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
                    fill="url(#question-chat-gradient-id-:R2tjnmr6l6:)"
                    d="M12 16c.5523 0 1 .4477 1 1s-.4477 1-1 1-1-.4477-1-1 .4477-1 1-1"
                  />
                  <path
                    fill="url(#question-chat-gradient-id-:R2tjnmr6l6:)"
                    d="M12.2505 6.5c1.7015.00012 3.2222 1.25408 3.25 2.98779.0233 1.46331-.9664 2.27171-1.6245 2.83541-.7301.6255-1.1255 1.0057-1.1255 1.6768v.5h-1.5V14c0-1.4538.9966-2.2563 1.6499-2.8159.7252-.6212 1.1107-1.0011 1.1001-1.67189-.0125-.78542-.7317-1.51209-1.75-1.51221-.9609 0-1.8194.55329-2.1636 1.75H8.54102l.04199-.17676C9.04412 7.61916 10.5137 6.5 12.2505 6.5"
                  />
                  <path
                    fill="url(#question-chat-gradient-id-:R2tjnmr6l6:)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2c5.5228 0 10 4.47715 10 10 0 5.5228-4.4772 10-10 10-1.8744 0-3.62807-.5163-5.12744-1.4136L2.8335 21.8979l-.73194-.7319 1.31153-4.039C2.51601 15.6277 2 13.8742 2 12 2 6.47715 6.47715 2 12 2m0 1.5c-4.69442 0-8.5 3.80558-8.5 8.5 0 1.5952.43837 3.0837 1.2002 4.3569l.35009.585-.96533 2.9722 2.97266-.9649.58545.3501C8.91642 20.0613 10.4048 20.5 12 20.5c4.6944 0 8.5-3.8056 8.5-8.5 0-4.69442-3.8056-8.5-8.5-8.5"
                  />
                  <defs>
                    <linearGradient
                      id="question-chat-gradient-id-:R2tjnmr6l6:"
                      x1="15.63"
                      x2="8.28648"
                      y1="2"
                      y2="21.9999"
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
                  {"Support plans."}
                </h4>
                <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                  {
                    "Receive ongoing assistance and day-to-day support for technical questions with tiered plans based on your needs."
                  }
                </p>
              </div>
              <div className="feature-detail__footer">
                <a
                  className="hds-link hds-link--callout"
                  href="/support-plans"
                  data-analytics-label="support_plans___view_plans"
                >
                  {"View plans"}
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
                          <clipPath id=":Rstjnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Rstjnmr6l6:)">
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
      </section>
    </>
  );
}
