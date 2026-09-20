"use client";

import { useId, useState } from "react";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs "main > section" 2).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
const MAX = 500;

export function QueryBox() {
  const [query, setQuery] = useState("");
  const descId = useId();
  const counterId = useId();
  return (
    <>
      <section className="hds-color-mode section section--white hds-mode--light">
        <div className="section-container personalize-section">
          <form className="homepage-query-box" action="/personalize" method="get" onSubmit={(e) => { if (!query.trim()) e.preventDefault(); }}>
            <div className="homepage-query-box__header">
              <h2 className="homepage-query-box__title">
                {"Get Stripe product recommendations"}
              </h2>
              <p className="homepage-query-box__subtitle">
                {
                  "Enter your company's URL, or tell us what you sell and how you sell it."
                }
              </p>
            </div>
            <div className="homepage-query-box__input-wrapper">
              <div className="homepage-query-box__input-box">
                <div className="gradient-border-input-scope">
                  <div className="gradient-border-input">
                    <div
                      className="gradient-border-input__gradient"
                      data-status="shimmering"
                    ></div>
                    <label className="query-input__label">
                      <textarea
                        maxLength={1000}
                        name="query"
                        aria-label="Enter your company's URL, or tell us what you sell and how you sell it..."
                        aria-describedby={`${descId} ${counterId}`}
                        className="query-input__field"
                        placeholder="Sell software subscriptions to our clients..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      ></textarea>
                      <span id={descId} className="sr-only">
                        {"Input must be 500 characters or fewer."}
                      </span>
                    </label>
                  </div>
                  <div className="query-input__footer">
                    <div id={counterId} className="query-input__counter" data-status={query.length > MAX ? "error" : undefined}>
                      {query.length}/{MAX}
                    </div>
                    <button
                      aria-label="Submit query"
                      className="query-input__button double-up-effect"
                      disabled={!query.trim() || query.length > MAX}
                      type="submit"
                    >
                      <div className="double-up-effect__container">
                        <div className="double-up-effect__item">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            className="icon"
                            aria-hidden="true"
                          >
                            <path d="M10.7637 7.57422 6.87598 3.6875v7.9766h-1.75V3.68555l-3.8877 3.88867L0 6.33594 6.00098.335938 12.001 6.33594z" />
                          </svg>
                        </div>
                        <div className="double-up-effect__item">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            className="icon"
                            aria-hidden="true"
                          >
                            <path d="M10.7637 7.57422 6.87598 3.6875v7.9766h-1.75V3.68555l-3.8877 3.88867L0 6.33594 6.00098.335938 12.001 6.33594z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              <div
                className="query-box__strength"
                aria-live="polite"
                style={{ opacity: "1", transform: "none" }}
              >
                <div className="query-box__strength-header">
                  <div className="query-box__strength-ring-wrapper">
                    <svg
                      className="query-box__strength-ring"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="var(--hds-color-core-neutral-200)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="var(--hds-color-core-brand-600, #111111)"
                        strokeWidth="2"
                        strokeLinecap="butt"
                        pathLength="1"
                        strokeDashoffset="0px"
                        strokeDasharray="0px 1px"
                        style={{
                          transformBox: "fill-box",
                          transformOrigin: "50% 50%",
                          transform: "rotate(-90deg)",
                        }}
                      />
                    </svg>
                    <svg
                      className="query-box__strength-ring-check"
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      style={{
                        opacity: "0",
                        transform: "translateX(-50%) translateY(-50%) scale(0)",
                      }}
                    >
                      <path
                        d="M7.76855 1.775L3.51855 6.775L2.99414 7.39121L2.48145 6.76523L0.231445 4.01523L1.27637 3.15977L3.0127 5.28281L6.73926 0.9L7.76855 1.775Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <span className="query-box__strength-label">
                    {"Input strength:"}
                  </span>
                </div>
                <ul className="query-box__strength-criteria">
                  <li
                    className="query-box__strength-criterion"
                    aria-label="Business website"
                  >
                    <span
                      className="query-box__strength-check"
                      aria-hidden="true"
                      style={{ opacity: "0", transform: "scale(0.6)" }}
                    >
                      <svg
                        className="query-box__strength-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M11.1348 1.73633L11.7061 2.22266L5.05566 10.0225L4.51855 10.6533L3.94434 10.0557L0.293945 6.25586L1.37598 5.2168L4.45117 8.41895L10.5645 1.25L11.1348 1.73633Z"
                        />
                      </svg>
                    </span>
                    <span>{"Business website"}</span>
                  </li>
                  <li
                    className="query-box__strength-criterion"
                    aria-label="What you sell"
                  >
                    <span
                      className="query-box__strength-check"
                      aria-hidden="true"
                      style={{ opacity: "0", transform: "scale(0.6)" }}
                    >
                      <svg
                        className="query-box__strength-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M11.1348 1.73633L11.7061 2.22266L5.05566 10.0225L4.51855 10.6533L3.94434 10.0557L0.293945 6.25586L1.37598 5.2168L4.45117 8.41895L10.5645 1.25L11.1348 1.73633Z"
                        />
                      </svg>
                    </span>
                    <span>{"What you sell"}</span>
                  </li>
                  <li
                    className="query-box__strength-criterion"
                    aria-label="How you charge"
                  >
                    <span
                      className="query-box__strength-check"
                      aria-hidden="true"
                      style={{ opacity: "0", transform: "scale(0.6)" }}
                    >
                      <svg
                        className="query-box__strength-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M11.1348 1.73633L11.7061 2.22266L5.05566 10.0225L4.51855 10.6533L3.94434 10.0557L0.293945 6.25586L1.37598 5.2168L4.45117 8.41895L10.5645 1.25L11.1348 1.73633Z"
                        />
                      </svg>
                    </span>
                    <span>{"How you charge"}</span>
                  </li>
                  <li
                    className="query-box__strength-criterion"
                    aria-label="Who you sell to"
                  >
                    <span
                      className="query-box__strength-check"
                      aria-hidden="true"
                      style={{ opacity: "0", transform: "scale(0.6)" }}
                    >
                      <svg
                        className="query-box__strength-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M11.1348 1.73633L11.7061 2.22266L5.05566 10.0225L4.51855 10.6533L3.94434 10.0557L0.293945 6.25586L1.37598 5.2168L4.45117 8.41895L10.5645 1.25L11.1348 1.73633Z"
                        />
                      </svg>
                    </span>
                    <span>{"Who you sell to"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </form>
          <p className="LegalDisclaimer">
            {"By messaging, you understand how "}
            <a
              href="https://support.stripe.com/questions/use-of-artificial-intelligence-(ai)-in-stripe-services"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"Stripe uses AI"}
            </a>
            {" and acknowledge our "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              {"Privacy Policy"}
            </a>
            {"."}
          </p>
        </div>
      </section>
    </>
  );
}
