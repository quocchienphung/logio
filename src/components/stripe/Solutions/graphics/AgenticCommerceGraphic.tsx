"use client";

import { useRef, useState } from "react";
import { stagger } from "motion";
import { EASE } from "@/components/stripe/motion/easings";
import { useTimeline } from "@/components/stripe/motion/useTimeline";
import { AgenticBackground } from "./AgenticBackground";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs ".modular-solutions-bento-card__content-inner" 2).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function AgenticCommerceGraphic() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const [showing, setShowing] = useState(false);
  // Reference timeline (chunk 99022): bubbles rise in, agent copy fades word by word, products follow.
  useTimeline(
    scope,
    () => [
      [
        ".agentic-commerce-graphic__chat-bubble--user",
        { opacity: 0, transform: "translateY(20px)" },
        { duration: 0 },
      ],
      [
        ".agentic-commerce-graphic__chat-bubble--agent",
        { opacity: 0, transform: "translateY(20px)" },
        { duration: 0 },
      ],
      [
        ".agentic-commerce-graphic__products",
        { opacity: 0, transform: "translateY(20px)" },
        { duration: 0 },
      ],
      [
        ".agentic-commerce-graphic__chat-bubble--agent > span",
        { opacity: 0 },
        { duration: 0, at: 0 },
      ],
      [
        ".agentic-commerce-graphic__chat-bubble--user",
        { opacity: 1, transform: "translateY(0)" },
        { ease: EASE.easeOutQuart, duration: 0.75, at: 0.25 },
      ],
      [
        ".agentic-commerce-graphic__chat-bubble--agent",
        { opacity: 1, transform: "translateY(0)" },
        { ease: EASE.easeOutQuart, duration: 0.35, at: 1 },
      ],
      [
        ".agentic-commerce-graphic__products",
        { opacity: 1, transform: "translateY(0)" },
        { ease: EASE.easeOutQuart, duration: 0.5, at: 1.4 },
      ],
      [
        ".agentic-commerce-graphic__chat-bubble--agent > span",
        { opacity: 1 },
        { duration: 0.1, at: 1.2, delay: stagger(0.06) },
      ],
    ],
    { threshold: 0.1, onStart: () => setShowing(true) },
  );
  return (
    <>
      <div className="modular-solutions-bento-card__graphic">
        <div className="lazy-animation lazy-animation--loaded lazy-bento-graphic">
          <div
            className={`agentic-commerce-graphic__wrapper${showing ? " agentic-commerce-graphic__wrapper--showing" : ""}`}
            ref={wrapperRef}
          >
            <div
              className="dom-graphic dom-graphic--variant-default agentic-commerce-graphic"
              data-status="ready"
              role="img"
              aria-label="AI chatbot interface showing a user request to purchase specific items. The chatbot interface offers a “Buy now” option for these selected items."
              style={{
                "--graphic-source-width": "324px",
                "--graphic-source-height": "378px",
                "--graphic-aspect-ratio": "324 / 378",
                "--graphic-scale": "1",
                "--graphic-max-width": "324px",
              }}
            >
              <div
                className="dom-graphic__content dom-graphic__content--horizontal-scale-left"
                aria-hidden="true"
              >
                <div className="agentic-commerce-graphic__layout" ref={scope}>
                  <div className="agentic-commerce-graphic__chat">
                    <div className="agentic-commerce-graphic__chat-bubble agentic-commerce-graphic__chat-bubble--user">
                      {
                        "I’m refreshing my wardrobe. Can you recommend some cozy, comfortable basics in size M?"
                      }
                    </div>
                    <div className="agentic-commerce-graphic__chat-bubble agentic-commerce-graphic__chat-bubble--agent">
                      <span>{"Absolutely. "}</span>
                      <span>{"Here "}</span>
                      <span>{"are "}</span>
                      <span>{"a "}</span>
                      <span>{"few "}</span>
                      <span>{"comfy "}</span>
                      <span>{"essentials "}</span>
                      <span>{"that "}</span>
                      <span>{"pair "}</span>
                      <span>{"well "}</span>
                      <span>{"and "}</span>
                      <span>{"could "}</span>
                      <span>{"be "}</span>
                      <span>{"a "}</span>
                      <span>{"good "}</span>
                      <span>{"starting "}</span>
                      <span>{"point: "}</span>
                    </div>
                  </div>
                  <div className="agentic-commerce-graphic__products">
                    <div className="agentic-commerce-graphic__products-grid">
                      <div className="agentic-commerce-graphic__product-cards__layout">
                        <div className="agentic-commerce-graphic__product-card"></div>
                        <div className="agentic-commerce-graphic__product-card"></div>
                      </div>
                      <div className="agentic-commerce-graphic__product-image">
                        <picture>
                          <source
                            type="image/webp"
                            srcSet="/stripe/shirt-blue-w160-9c4a0e1f-mono.webp 1x, /stripe/shirt-blue-w320-deabde4e-mono.webp 2x"
                          />
                          <img
                            loading="lazy"
                            width="320"
                            height="228"
                            alt=""
                            srcSet="/stripe/shirt-blue-w160-fafd20bc-mono.png 1x, /stripe/shirt-blue-w320-29fa7edc-mono.png 2x"
                            src="/stripe/shirt-blue-w160-fafd20bc-mono.png"
                          />
                        </picture>
                      </div>
                      <div className="agentic-commerce-graphic__product-image">
                        <picture>
                          <source
                            type="image/webp"
                            srcSet="/stripe/hoodie-navy-w160-4e18252d-mono.webp 1x, /stripe/hoodie-navy-w320-7d95523c-mono.webp 2x"
                          />
                          <img
                            loading="lazy"
                            width="320"
                            height="228"
                            alt=""
                            srcSet="/stripe/hoodie-navy-w160-9f1499a4-mono.png 1x, /stripe/hoodie-navy-w320-6f5e42b6-mono.png 2x"
                            src="/stripe/hoodie-navy-w160-9f1499a4-mono.png"
                          />
                        </picture>
                      </div>
                      <div className="agentic-commerce-graphic__product-description">
                        {"Deluxe Shirt"}
                      </div>
                      <div className="agentic-commerce-graphic__product-description">
                        {"Essential Hoodie"}
                      </div>
                      <div className="agentic-commerce-graphic__product-variant">
                        {"Blue - Medium"}
                      </div>
                      <div className="agentic-commerce-graphic__product-variant">
                        {"Navy - Medium"}
                      </div>
                      <div className="agentic-commerce-graphic__product-price tabular-nums--tight">
                        {"$26.00"}
                      </div>
                      <div className="agentic-commerce-graphic__product-price tabular-nums--tight">
                        {"$48.00"}
                      </div>
                      <div className="agentic-commerce-graphic__product-brand">
                        {"Cartsy"}
                      </div>
                      <div className="agentic-commerce-graphic__product-brand">
                        {"Cartsy"}
                      </div>
                    </div>
                    <div className="agentic-commerce-graphic__cta">
                      <div className="agentic-commerce-graphic__cta-button">
                        {"Buy now"}
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
        <div className="lazy-animation lazy-animation--loaded lazy-bento-graphic">
          <AgenticBackground />
        </div>
      </div>
    </>
  );
}
