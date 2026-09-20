"use client";

import { useEffect, type RefObject } from "react";
import {
  animate,
  stagger,
  type AnimationPlaybackControls,
  type AnimationSequence,
} from "motion";
import { EASE } from "@/components/stripe/motion/easings";

// Port of the reference payments graphic timeline (bundle chunk 40414). The checkout cycles
// Roastery → Cartsy → Showflix → Roastery: value stacks slide by -100% per product, the payment
// method list collapses/expands per merchant, and the CTA colour changes.
const TIMING = {
  productTransitionDelay: 7,
  initialDelay: 4,
  resetDelay: 0.01,
  checkoutTableRowGap: 8,
};
const URL_ICON = [
  { transform: "translateX(0px)" },
  { transform: "translateX(5px)" },
  { transform: "translateX(-8px)" },
  { transform: "translateX(0px)" },
];
const SHIPPING_VISIBLE = [true, true, false, true];
const METHODS = {
  roastery: { activeMethods: [0, 2, 3, 4, 8], selectedMethod: 2 },
  cartsy: { activeMethods: [0, 1, 7], selectedMethod: 1 },
  showflix: { activeMethods: [0, 5, 6], selectedMethod: 0 },
};
const ORDER = ["roastery", "cartsy", "showflix", "roastery"] as const;
const ACTIVE = ORDER.map((p) => METHODS[p].activeMethods);
const SELECTED = ORDER.map((p) => METHODS[p].selectedMethod);
const CARD_ICONS = [
  { transform: "translateX(-0%)" },
  { transform: "translateX(-0%)" },
  { transform: "translateX(-100%)" },
  { transform: "translateX(-200%)" },
];
// Terminal button states, monochrome: idle (light grey / dark text) -> processing -> approved (black / white).
const BUTTON = [
  { background: "#ececec", color: "#444444" },
  { background: "#dcdcdc", color: "#3F3F3F" },
  { background: "#1a1a1a", color: "var(--hds-color-util-white)" },
  { background: "#ececec", color: "#444444" },
];

export function usePaymentsTimeline(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const $ = (sel: string) => el.querySelectorAll(sel);
    const has = (sel: string) => $(sel).length > 0;
    const list = el.querySelector<HTMLElement>(
      ".payments-graphic__checkout-payment-methods",
    );
    const cardDetails = el.querySelector<HTMLElement>(
      ".payments-graphic__checkout-payment-methods-item-card-details",
    );
    const shippingRow = el.querySelector<HTMLElement>(
      ".payments-graphic__checkout-payment-table-row--shipping",
    );
    if (!list || !cardDetails || !shippingRow) return;

    const items = [...list.children].slice(1) as HTMLElement[];
    const itemHeights = items.map((i) => i.offsetHeight);
    const cardDetailsHeight = cardDetails.offsetHeight;
    const shippingHeight = shippingRow.offsetHeight;

    const methodsSequence = (index: number): AnimationSequence => {
      const cardSelected = SELECTED[index] === 0;
      const seq: AnimationSequence = [
        [
          ".payments-graphic__checkout-payment-methods-card-icons",
          CARD_ICONS[index],
          { ease: EASE.easeInOutQuart, duration: 0.7, at: "<0.3" },
        ],
        [
          ".payments-graphic__checkout-payment-methods-item-card-details",
          {
            clipPath: cardSelected ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
            opacity: cardSelected ? 1 : 0,
          },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<-0.3" },
        ],
      ];
      let shift = 0;
      const cardClip = `inset(0 0 ${-cardDetailsHeight}px 0)`;
      items.forEach((_, c) => {
        const active = ACTIVE[index].includes(c);
        const selected = SELECTED[index] === c;
        seq.push(
          [
            `.payments-graphic__checkout-payment-methods-item:nth-child(${c + 2}) .payments-graphic__checkout-payment-methods-active-checkbox`,
            { opacity: selected ? 1 : 0 },
            { ease: EASE.easeInSine, duration: 0.4, at: "<0.3" },
          ],
          [
            `.payments-graphic__checkout-payment-methods-item:nth-child(${c + 2})`,
            {
              transform: `translateY(${shift}px)`,
              clipPath:
                c === 0
                  ? cardClip
                  : active
                    ? "inset(0 0 0% 0)"
                    : "inset(0 0 100% 0)",
              opacity: active ? 1 : 0,
            },
            { ease: EASE.easeInOutQuart, duration: 1, at: "<-0.3" },
          ],
        );
        if (c === 0 && cardSelected) shift += cardDetailsHeight;
        if (!active) shift -= itemHeights[c] ?? 0;
      });
      seq.push(
        [
          ".payments-graphic__checkout-payment-button, .payments-graphic__checkout-payment-methods-border-bottom",
          { transform: `translateY(${shift}px)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__checkout-payment-methods-border-horizontal",
          { transform: `translateY(${shift}px)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
      );
      return seq;
    };

    const shippingSequence = (index: number): AnimationSequence => {
      const visible = SHIPPING_VISIBLE[index];
      const t = shippingHeight + TIMING.checkoutTableRowGap;
      return [
        [
          ".payments-graphic__checkout-payment-table-row--shipping",
          { opacity: visible ? 1 : 0 },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__checkout-payment-table-row--total",
          { transform: `translateY(${visible ? 0 : -t}px)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
      ];
    };

    const build = (index: number, isReset: boolean, delayOverride?: number) => {
      const s = 100 * index;
      const seq: AnimationSequence = [
        [
          ".payments-graphic__terminal-pay-label-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1 },
        ],
        [
          ".payments-graphic__checkout-browser-url-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__terminal-payment-amount-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 0.8, at: "<0.1" },
        ],
        [
          ".payments-graphic__terminal-message-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 0.8, at: "<0.1" },
        ],
        [
          ".payments-graphic__terminal-transaction-button-text-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 0.8, at: "<0.1" },
        ],
        [
          ".payments-graphic__checkout-payment-button-text-values, .payments-graphic__checkout-separator-text-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 0.8, at: "<" },
        ],
        [
          ".browser-graphic__url-box-content svg",
          URL_ICON[index],
          { ease: EASE.easeInOutQuart, duration: 0.8, at: "<" },
        ],
        [
          ".payments-graphic__terminal-transaction-details-content",
          { transform: `translateX(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__checkout-header-logos",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__checkout-input-values, .payments-graphic__checkout-input-label-values, .payments-graphic__checkout-order-summary-title-values",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__checkout-item-card-contents, .payments-graphic__checkout-payment-methods-item-label-values",
          { transform: `translateX(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<" },
        ],
        [
          ".payments-graphic__checkout-payment-table-row-value-block-contents",
          { transform: `translateY(-${s}%)` },
          {
            ease: EASE.easeInOutQuart,
            duration: 1,
            at: "<",
            delay: stagger(0.06),
          },
        ],
        [
          ".payments-graphic__checkout-payment-table-row-label-block-contents",
          { transform: `translateY(-${s}%)` },
          { ease: EASE.easeInOutQuart, duration: 1, at: "<0.06" },
        ],
        ...shippingSequence(index),
        ...methodsSequence(index),
        [
          ".payments-graphic__terminal-transaction-button, .payments-graphic__checkout-payment-button",
          BUTTON[index],
          { ease: EASE.easeInSine, duration: 0.35, at: "<0.3" },
        ],
      ];
      const scoped = seq
        .filter(
          (step) =>
            !(
              Array.isArray(step) &&
              typeof step[0] === "string" &&
              !has(step[0])
            ),
        )
        .map((step) =>
          Array.isArray(step) && typeof step[0] === "string"
            ? ([
                $(step[0]),
                ...step.slice(1),
              ] as unknown as (typeof seq)[number])
            : step,
        );
      const controls = animate(
        scoped,
        isReset
          ? { duration: 0, delay: delayOverride ?? TIMING.resetDelay }
          : { delay: delayOverride ?? TIMING.productTransitionDelay },
      );
      controls.pause();
      return controls;
    };

    let disposed = false;
    let index = 0;
    let current: AnimationPlaybackControls | null = null;
    let visible = false;
    let started = false;
    let hidden = false;

    const step = async (first = false) => {
      if (disposed) return;
      index = (index + 1) % 4;
      const isReset = index === 0;
      current?.stop();
      current = build(index, isReset, first ? TIMING.initialDelay : undefined);
      current.play();
      if (hidden) current.pause();
      await current.finished;
      if (!disposed) step();
    };

    // reset to the Roastery state immediately, then start cycling once ≥50% visible
    build(0, true).play();
    const startIO = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          started = true;
          startIO.disconnect();
          step(true);
        }
      },
      { threshold: 0.5 },
    );
    startIO.observe(el);
    const pauseIO = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        hidden = !visible;
        if (!current) return;
        if (hidden) current.pause();
        else current.play();
      },
      { threshold: 0.01 },
    );
    pauseIO.observe(el);

    return () => {
      disposed = true;
      startIO.disconnect();
      pauseIO.disconnect();
      current?.stop();
    };
  }, [root]);
}
