"use client";

import { useEffect, type RefObject } from "react";
import { animate } from "motion";

// Reference (index chunk, billing-plan-graphic): --progress runs 0→1 while the wrapper travels
// from "top at viewport bottom" to "centre at viewport centre"; the token counter is
// 1.5e9 + 510,569,010 × clamp((progress − 0.3) / 0.7) + 25,528,450.5 × hoverProgress, throttled to 50ms.
// Hover progress tweens 0↔1 over 0.6s with cubic-bezier(.65,0,.35,1). Mobile / reduced motion: final state.
const BASE = 1.5e9;
const SCROLL_SPAN = 510569010;
const HOVER_SPAN = 25528450.5;
const FINAL = 2010569010;
const fmt = new Intl.NumberFormat("en-US");
const setText = (node: HTMLElement, value: number) =>
  node.replaceChildren(document.createTextNode(fmt.format(value)));

export function useBillingProgress(
  wrapper: RefObject<HTMLElement | null>,
  counter: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = wrapper.current;
    const out = counter.current;
    if (!el || !out) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (reduced || mobile) {
      el.style.setProperty("--progress", "1");
      setText(out, FINAL);
      return;
    }
    let progress = 0;
    let hover = 0;
    let last = -1;
    let throttle: number | undefined;
    const render = () => {
      throttle = undefined;
      const v = Math.round(
        BASE +
          SCROLL_SPAN * Math.max(0, Math.min(1, (progress - 0.3) / 0.7)) +
          HOVER_SPAN * hover,
      );
      if (v !== last) {
        last = v;
        setText(out, v);
      }
    };
    const schedule = () => {
      if (throttle === undefined) throttle = window.setTimeout(render, 50);
    };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh - r.top) / (vh / 2 + r.height / 2);
      progress = Math.max(0, Math.min(1, p));
      el.style.setProperty("--progress", String(progress));
      schedule();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const card = el.closest<HTMLElement>("[data-bento-card-root]");
    let tween: { stop: () => void } | null = null;
    const toHover = (target: number) => {
      tween?.stop();
      tween = animate(hover, target, {
        duration: 0.6,
        ease: [0.65, 0, 0.35, 1],
        onUpdate: (v) => {
          hover = v;
          schedule();
        },
      });
    };
    const enter = () => toHover(1);
    const leave = () => toHover(0);
    card?.addEventListener("mouseenter", enter);
    card?.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      card?.removeEventListener("mouseenter", enter);
      card?.removeEventListener("mouseleave", leave);
      tween?.stop();
      window.clearTimeout(throttle);
    };
  }, [wrapper, counter]);
}
