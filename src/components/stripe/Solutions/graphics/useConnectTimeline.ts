"use client";

import { useEffect, type RefObject } from "react";
import { animate, stagger, type AnimationSequence } from "motion";
import { EASE } from "@/components/stripe/motion/easings";

// Port of the reference Connect graphic orchestration (bundle chunk 16240). Three merchant
// checkouts pay in turn: the pay button presses, the success screen slides in, the dotted
// connection draws toward the dashboard while the amount pill rides the path, the matching
// dashboard row highlights and its volume counts up. Plays once per ≥70% viewport entry and
// resets when scrolled away.
const PATH_FORWARD =
  "M1.00002 95 L1 9.45337 C1 4.7847 4.7847 1 9.45337 1 L131 1.00001";
const PATH_REVERSE =
  "M131 1.00001L9.45337 1C4.7847 1 1 4.7847 1 9.45337L1.00002 95";
const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
const setText = (node: Element | null, text: string) =>
  node?.replaceChildren(document.createTextNode(text));

interface Merchant {
  card: string;
  amountCell: string;
  row: string;
  volume: number;
  increment: number;
  paymentAmount: string;
}

export function useConnectTimeline(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const q = <T extends Element = HTMLElement>(sel: string) =>
      el.querySelector<T>(sel);
    const qa = (sel: string) => el.querySelectorAll(sel);
    const path = q<SVGPathElement>(
      ".connect-platform-graphic__connection svg path:not(.connect-platform-graphic__connection-mask)",
    );
    const maskPath = q<SVGPathElement>(
      ".connect-platform-graphic__connection-mask",
    );
    const pill = q(
      ".connect-platform-graphic__connection-amount-pill-container",
    );
    const pillText = q(".connect-platform-graphic__connection-amount-pill");
    if (!path || !maskPath || !pill || !pillText) return;
    const volumeCell = (name: string) =>
      qa(`.connect-platform-graphic__dashboard-table-amount--${name}`)[1] ??
      null;

    const merchants: Merchant[] = [
      {
        card: ".connect-platform-graphic__payment-card-content--daybreak-yoga",
        amountCell:
          ".connect-platform-graphic__dashboard-table-amount--daybreak-yoga",
        row: ".connect-platform-graphic__dashboard-table-row--daybreak-yoga",
        volume: 788000,
        increment: 99900,
        paymentAmount:
          q(
            ".connect-platform-graphic__payment-card-content--daybreak-yoga .connect-platform-graphic__payment-card-pay-button span",
          )?.textContent ?? "$999.00",
      },
      {
        card: ".connect-platform-graphic__payment-card-content--quiet-fire-yoga",
        amountCell:
          ".connect-platform-graphic__dashboard-table-amount--quiet-fire-yoga",
        row: ".connect-platform-graphic__dashboard-table-row--quiet-fire-yoga",
        volume: 156887,
        increment: 2750,
        paymentAmount:
          q(
            ".connect-platform-graphic__payment-card-content--quiet-fire-yoga .connect-platform-graphic__payment-card-pay-button",
          )?.textContent?.trim() ?? "£22.00",
      },
      {
        card: ".connect-platform-graphic__payment-card-content--jackson-hot-yoga",
        amountCell:
          ".connect-platform-graphic__dashboard-table-amount--jackson-hot-yoga",
        row: ".connect-platform-graphic__dashboard-table-row--jackson-hot-yoga",
        volume: 1264330,
        increment: 4770,
        paymentAmount:
          q(
            ".connect-platform-graphic__payment-card-content--jackson-hot-yoga .connect-platform-graphic__payment-card-pay-button span",
          )?.textContent ?? "A$72.00",
      },
    ];
    const volumeCells = [
      "daybreak-yoga",
      "quiet-fire-yoga",
      "jackson-hot-yoga",
    ].map(volumeCell);

    const scoped = (seq: AnimationSequence): AnimationSequence =>
      seq
        .filter(
          (s) =>
            !(
              Array.isArray(s) &&
              typeof s[0] === "string" &&
              qa(s[0]).length === 0
            ),
        )
        .map((s) =>
          Array.isArray(s) && typeof s[0] === "string"
            ? ([qa(s[0]), ...s.slice(1)] as unknown as (typeof seq)[number])
            : s,
        );
    const run = (seq: AnimationSequence, opts?: { delay?: number }) =>
      animate(scoped(seq), opts).finished;

    let running = false;
    let disposed = false;
    let visible = false;

    const ridePath = () => {
      const total = path.getTotalLength();
      const end = path.getPointAtLength(total);
      return animate(0.3, 0.82, {
        duration: 1.6,
        ease: EASE.easeOutQuadratic,
        onUpdate: (t) => {
          const p = path.getPointAtLength(t * total);
          pill.style.setProperty("--translate-x", `${p.x - end.x}px`);
          pill.style.setProperty("--translate-y", `${p.y - end.y}px`);
        },
      }).finished;
    };

    const countUp = (cell: Element | null, base: number, inc: number) =>
      animate(0, inc, {
        duration: 1.6,
        ease: EASE.easeInOutCubic,
        delay: 0.9,
        onUpdate: (v) => setText(cell, usd(base + v)),
      }).finished;

    const payment = async (m: Merchant, cell: Element | null, delay = 0) => {
      pill.style.setProperty("--translate-x", "-40px");
      pill.style.setProperty("--translate-y", "70px");
      setText(pillText, m.paymentAmount);
      maskPath.setAttribute("d", PATH_FORWARD);
      const a = m.card;
      const t = m.amountCell;
      const r = m.row;
      const intro: AnimationSequence = [
        [
          `${a} .connect-platform-graphic__payment-card-pay-button`,
          { transform: "scale(1)" },
          { duration: 0 },
        ],
        [
          `${a} .connect-platform-graphic__payment-screen--order-details`,
          { opacity: 1, transform: "translateY(0)" },
          { duration: 0 },
        ],
        [
          `${a} .connect-platform-graphic__payment-screen--success`,
          { opacity: 0 },
          { duration: 0 },
        ],
        [
          `${a} .connect-platform-graphic__payment-screen--success .connect-platform-graphic__payment-screen-summary, ${a} .connect-platform-graphic__payment-summary-table-row`,
          { opacity: 0, transform: "translateY(-16px)" },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__connection-mask",
          { strokeDashoffset: 150 },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__connection-ring",
          { transform: "scale(0)" },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__connection-amount-pill",
          { opacity: 1, transform: "scale(1)" },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__dashboard-table-row",
          { opacity: 1 },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__dashboard-table-row-bg",
          { opacity: 0 },
          { duration: 0 },
        ],
        [
          t,
          {
            fontWeight: "var(--hds-font-weight-normal)",
            color: "var(--hds-color-core-neutral-600)",
          },
          { duration: 0 },
        ],
        [
          `${a} .connect-platform-graphic__payment-card-pay-button`,
          { transform: "scale(0.97)" },
          { ease: EASE.easeInCubic, duration: 0.2, delay: 1 },
        ],
        [
          `${a} .connect-platform-graphic__payment-card-pay-button`,
          { transform: "scale(1)" },
          { ease: EASE.easeOutCubic, duration: 0.2 },
        ],
        [
          `${a} .connect-platform-graphic__payment-screen--order-details`,
          { opacity: 0, transform: "translateY(12px)" },
          { ease: EASE.easeOutSine, duration: 0.2, at: "+0.4" },
        ],
        [
          `${a} .connect-platform-graphic__payment-screen--success`,
          { opacity: 1 },
          { ease: EASE.easeOutSine, duration: 0.1, at: "<" },
        ],
        [
          `${a} .connect-platform-graphic__payment-screen--success .connect-platform-graphic__payment-screen-summary`,
          { opacity: 1, transform: "translateY(0)" },
          { ease: EASE.easeOutQuadratic, duration: 0.2, at: "+0.05" },
        ],
        [
          `${a} .connect-platform-graphic__payment-summary-table-row`,
          { opacity: 1, transform: "translateY(0)" },
          {
            ease: EASE.easeOutQuadratic,
            duration: 0.18,
            at: "<0.06",
            delay: stagger(0.06),
          },
        ],
        [
          ".connect-platform-graphic__connection-mask",
          { strokeDashoffset: 0 },
          { ease: EASE.easeInOutCubic, duration: 1.8, at: "+0.2" },
        ],
        [
          ".connect-platform-graphic__connection-ring",
          { transform: "scale(1)" },
          { ease: EASE.easeOutCubic, duration: 0.3, at: "-0.25" },
        ],
      ];
      const land: AnimationSequence = [
        [
          ".connect-platform-graphic__connection-amount-pill",
          { opacity: 0, transform: "scale(0.4)" },
          { ease: EASE.easeOutCubic, duration: 0.4 },
        ],
        [
          `.connect-platform-graphic__dashboard-table-row:not(${r})`,
          { opacity: 0.7 },
          { ease: EASE.easeOutSine, duration: 0.3, at: "<0.2" },
        ],
        [
          `${r} .connect-platform-graphic__dashboard-table-row-bg`,
          { opacity: 1 },
          { ease: EASE.easeOutCubic, duration: 0.3, at: "<" },
        ],
        [
          t,
          {
            fontWeight: "var(--hds-font-weight-bold)",
            color: "var(--hds-color-core-neutral-800)",
          },
          { ease: EASE.easeOutCubic, duration: 0.2, at: "<" },
        ],
        [
          ".connect-platform-graphic__connection-mask",
          { strokeDashoffset: 222 },
          { ease: EASE.easeOutCubic, duration: 1 },
        ],
        [
          ".connect-platform-graphic__connection-ring",
          { transform: "scale(0)" },
          { ease: EASE.easeInCubic, duration: 0.3, at: "-0.3" },
        ],
      ];
      const settle: AnimationSequence = [
        [
          ".connect-platform-graphic__dashboard-table-row",
          { opacity: 1 },
          { ease: EASE.easeInSine, duration: 0.3 },
        ],
        [
          `${r} .connect-platform-graphic__dashboard-table-row-bg`,
          { opacity: 0 },
          { ease: EASE.easeInCubic, duration: 0.3, at: "<" },
        ],
        [
          t,
          {
            fontWeight: "var(--hds-font-weight-normal)",
            color: "var(--hds-color-core-neutral-600)",
          },
          { ease: EASE.easeInCubic, duration: 0.3, at: "<" },
        ],
      ];
      await run(intro, { delay });
      if (disposed) return;
      maskPath.setAttribute("d", PATH_REVERSE);
      await ridePath();
      if (disposed) return;
      await Promise.all([countUp(cell, m.volume, m.increment), run(land)]);
      if (disposed) return;
      await run(settle, { delay: 1 });
    };

    const reset = () => {
      setText(volumeCells[1], usd(156887));
      setText(volumeCells[0], usd(788000));
      setText(volumeCells[2], usd(1264330));
      return run([
        [
          ".connect-platform-graphic__payment-screen--order-details",
          { opacity: 1, transform: "translateY(0)" },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__payment-screen--success",
          { opacity: 0 },
          { duration: 0 },
        ],
        [
          ".connect-platform-graphic__payment-card-content",
          { transform: "translateX(-200%)" },
          { duration: 0 },
        ],
      ]);
    };

    const play = async () => {
      if (running || disposed) return;
      running = true;
      await reset();
      await payment(merchants[0], volumeCells[0], 1.2);
      if (disposed) return;
      await run([
        [
          ".connect-platform-graphic__payment-card-content",
          { transform: "translateX(-100%)" },
          { ease: EASE.easeInOutCubic, duration: 1, delay: 1 },
        ],
      ]);
      await payment(merchants[1], volumeCells[1]);
      if (disposed) return;
      await run([
        [
          ".connect-platform-graphic__payment-card-content",
          { transform: "translateX(0%)" },
          { ease: EASE.easeInOutCubic, duration: 1, delay: 1 },
        ],
      ]);
      await payment(merchants[2], volumeCells[2]);
      running = false;
      if (!visible && !disposed) reset();
    };

    reset();
    if (reduced) return;
    const startIO = new IntersectionObserver(
      ([e]) => e.isIntersecting && play(),
      { threshold: 0.7 },
    );
    const leaveIO = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (!visible && !running) reset();
      },
      { threshold: 0.01 },
    );
    startIO.observe(el);
    leaveIO.observe(el);
    return () => {
      disposed = true;
      startIO.disconnect();
      leaveIO.disconnect();
    };
  }, [root]);
}
