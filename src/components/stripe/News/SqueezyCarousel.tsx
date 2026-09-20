"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonArrow } from "@/components/stripe/icons";
import { NEWS_ITEMS } from "./items";
import type { SqueezyImagesCanvas } from "./SqueezyImagesCanvas";

/** Desktop "What's happening" carousel: header + canvas image strip + sliding detail copy. */
export function SqueezyCarousel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instance = useRef<SqueezyImagesCanvas | null>(null);
  const [active, setActive] = useState(0);
  const n = NEWS_ITEMS.length;

  const gotoNext = useCallback(
    (step: number) => {
      instance.current?.gotoNext(step);
      setActive((a) => (a + step) % n);
    },
    [n],
  );
  const gotoPrev = useCallback(
    (step: number) => {
      instance.current?.gotoPrev(step);
      setActive((a) => (a - step + n) % n);
    },
    [n],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let ro: ResizeObserver | null = null;
    import("./SqueezyImagesCanvas").then(({ SqueezyImagesCanvas }) => {
      if (disposed) return;
      const inst = new SqueezyImagesCanvas(
        canvas,
        NEWS_ITEMS,
        gotoNext,
        reduced,
      );
      instance.current = inst;
      let timer: number | undefined;
      ro = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => inst.onCanvasResize(), 150);
      });
      ro.observe(canvas);
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      instance.current?.dispose();
      instance.current = null;
    };
  }, [gotoNext]);

  return (
    <>
      <header className="events-carousel__header">
        <div className="events-carousel__header-content">
          <h2
            className="hds-heading events-carousel__header-title hds-heading--lg"
            id="events-carousel-heading"
          >
            What’s happening
          </h2>
          <p className="hds-heading events-carousel__header-subtitle hds-heading--lg hds-heading--subdued">
            See the latest from Stripe.
          </p>
        </div>
        <div
          className="events-carousel__controls"
          role="group"
          aria-label="Carousel navigation"
        >
          <button
            type="button"
            className="hds-ui-button hds-ui-button--quiet"
            aria-label="Previous slide"
            onClick={() => gotoPrev(1)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M9.613 2.62 5.107 7.124h9.137v1.75H5.107l4.506 4.506-1.238 1.238-6-6L1.756 8l.619-.62 6-6 1.238 1.24Z" />
            </svg>
          </button>
          <button
            type="button"
            className="hds-ui-button hds-ui-button--quiet"
            aria-label="Next slide"
            onClick={() => gotoNext(1)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="m6.387 2.62 4.506 4.505H1.756v1.75h9.137l-4.506 4.506 1.238 1.238 6-6L14.245 8l-.618-.62-6-6-1.239 1.24Z" />
            </svg>
          </button>
        </div>
      </header>
      <div
        className="section-row squeezy-carousel section-row-gap"
        style={{ "--section-row-gap-tb": "var(--hds-space-core-400)" }}
      >
        <canvas
          ref={canvasRef}
          className="squeezy-carousel__canvas"
          aria-hidden="true"
        />
        <div className="squeezy-carousel__items-details-container">
          {NEWS_ITEMS.map((item, i) => (
            <div
              key={item.id}
              className="squeezy-carousel__item-details"
              style={{
                transform: `translateX(${-100 * i}%)`,
                pointerEvents: i === active ? "auto" : "none",
                opacity: i === active ? 1 : 0,
              }}
              aria-hidden={i !== active}
            >
              <div className="squeezy-carousel__item-copy">
                <h3 className="hds-heading hds-heading--sm hds-heading--inline">
                  {item.title}
                </h3>{" "}
                <p className="hds-heading hds-heading--sm hds-heading--subdued hds-heading--inline">
                  {item.description}
                </p>
              </div>
              <a
                className="hds-button hds-button--secondary"
                href={item.href}
                tabIndex={i === active ? 0 : -1}
                aria-label={item.ariaLabel}
              >
                {item.cta}
                <ButtonArrow />
              </a>
            </div>
          ))}
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Item {active + 1} of {n}: {NEWS_ITEMS[active].title}
      </div>
    </>
  );
}
