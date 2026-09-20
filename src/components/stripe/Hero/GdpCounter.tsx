"use client";

import { useEffect, useState } from "react";

// Live counter sampled on the reference: 1.71679784% at 2026-09-17T09:46+07:00 rising ≈1.04e-8 %/s
// (7.49e-6 over the following 12 minutes). Only the trailing digits tick; the markup mirrors the
// reference's outgoing/incoming digit stacks so the mask-image fade and digit roll apply.
const BASE_VALUE = 1.71679784;
const BASE_TIME = Date.parse("2026-09-17T02:46:00Z");
const RATE_PER_MS = 1.04e-8 / 1000;

const valueAt = (t: number) =>
  (BASE_VALUE + Math.max(0, t - BASE_TIME) * RATE_PER_MS).toFixed(8) + "%";

export function GdpCounter() {
  // Server and first client render use the frozen sample so hydration matches; the interval then
  // catches up to the modelled live value.
  const [current, setCurrent] = useState(() => valueAt(BASE_TIME));
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    let outgoing = current;
    let swap: number | undefined;
    const tick = window.setInterval(() => {
      const v = valueAt(Date.now());
      if (v === outgoing) return;
      setNext(v);
      swap = window.setTimeout(() => {
        outgoing = v;
        setCurrent(v);
        setNext(null);
      }, 400);
    }, 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(swap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once; the interval owns the value
  }, []);

  const chars = (s: string) => s.split("");
  const cur = chars(current);
  const inc = next ? chars(next) : null;
  const changed = (i: number) => inc !== null && inc[i] !== cur[i];

  return (
    <div className="hero-section__eyebrow" aria-hidden="true">
      <span className="hero-section__eyebrow-label">
        Global GDP running on Stripe:
      </span>
      <span className="hero-section__eyebrow-value tabular-nums--tight">
        <span className="hero-section__eyebrow-value__content-outgoing">
          {cur.map((c, i) => (
            <span
              key={i}
              className={
                c === "%"
                  ? "hero-section__eyebrow-value__percent-char"
                  : undefined
              }
              style={
                changed(i)
                  ? {
                      transform: "translateY(-100%)",
                      transition: "transform .4s cubic-bezier(.22,.61,.36,1)",
                    }
                  : undefined
              }
            >
              {c}
            </span>
          ))}
        </span>
        <span className="hero-section__eyebrow-value__content-incoming hero-section__eyebrow-value__content-incoming--higher">
          {(inc ?? cur).map((c, i) => (
            <span
              key={i}
              className={
                c === "%"
                  ? "hero-section__eyebrow-value__percent-char"
                  : undefined
              }
              style={
                changed(i)
                  ? {
                      transform: "translateY(-100%)",
                      transition: "transform .4s cubic-bezier(.22,.61,.36,1)",
                    }
                  : { visibility: "hidden" }
              }
            >
              {c}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
