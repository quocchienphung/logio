// Billing bento hover graphics (reference: billing module 39828, `e1` UsageBasedBillingBentoGraphic
// and `eI` InvoicingBentoGraphic, wired through FeatureBentoCard onHoverChange / onHoverMove):
//  - usage-based billing: a 0..1 progress tweens to 1 on hover (duration 1 s x remaining, easeOutCubic)
//    and back to 0 on leave (0.6 s x current). It lifts the 12 animated bars with a 0.6 stagger window
//    (each bar rises over 0.4 of the progress, 40 % -> 0 %), narrows the usage meter
//    (translateX(±30 % x (1 - 0.3 p))) and counts the token total up with easeOutCubic
//    (1,503,042,973 -> 2,010,569,010), text updates throttled to 50 ms;
//  - invoicing: the blurred gradient behind the invoice eases toward the pointer (3 % per 60 Hz frame)
//    while hovered; the loop stops once it settles within 0.1 px.
// Disabled on mobile and with reduced motion (static end state for the counter/bars, as in the source).

import { EASE, easeOutCubicPoly, toEaseFn } from "../revenue-shared/easing";
import { breakpoint, Disposer, listen, onBreakpointChange, onReducedMotionChange, reducedMotion, throttle, type Cleanup } from "../revenue-shared/env";

const COUNT_FROM = 1503042973; // from source
const COUNT_DELTA = 507526037; // from source: 1503042973 + 507526037 * w2(p)
const COUNT_STATIC = 2010569010; // from source: reduced motion / mobile value
const fmt = new Intl.NumberFormat("en-US");

/** Calls `cb(true/false)` like FeatureBentoCard: mouse enter/leave and focus entering/leaving the card. */
function onHoverChange(card: HTMLElement, cb: (hover: boolean) => void): Cleanup {
  const d = new Disposer();
  d.add(listen(card, "mouseenter", () => cb(true)));
  d.add(listen(card, "mouseleave", () => cb(false)));
  d.add(
    listen<FocusEvent>(card, "focusin", (e) => {
      if (!(e.relatedTarget instanceof Node && card.contains(e.relatedTarget))) cb(true);
    }),
  );
  d.add(
    listen<FocusEvent>(card, "focusout", (e) => {
      if (!(e.relatedTarget instanceof Node && card.contains(e.relatedTarget))) cb(false);
    }),
  );
  return () => d.run();
}

function mountUsageBento(graphic: HTMLElement, card: HTMLElement): Cleanup {
  const d = new Disposer();
  const value = graphic.querySelector<HTMLElement>(".usage-based-billing-bento-graphic__value");
  const bars = Array.from(graphic.querySelectorAll<HTMLElement>(".usage-based-billing-bento-graphic__chart-bar--animated"));
  const meter = graphic.querySelector<HTMLElement>(".usage-based-billing-bento-graphic__usage-meter-indicator");
  const fill = graphic.querySelector<HTMLElement>(".usage-based-billing-bento-graphic__usage-meter-indicator-fill");
  if (!value || !bars.length || !meter || !fill) return () => {};
  let reduced = reducedMotion();
  let mobile = breakpoint() === "mobile";
  let p = 0;
  let shown = -1;
  let raf = 0;
  const ease = toEaseFn(EASE.easeOutCubic);

  const writeCount = throttle(() => {
    if (reduced) return;
    const n = Math.round(COUNT_FROM + COUNT_DELTA * easeOutCubicPoly(p));
    if (n !== shown) {
      value.textContent = fmt.format(n);
      shown = n;
    }
  }, 50);
  const render = () => {
    if (reduced || mobile) return;
    const n = bars.length;
    bars.forEach((bar, i) => {
      const local = Math.min(1, Math.max(0, (p - (i / (n - 1)) * 0.6) / 0.4));
      bar.style.transform = `translateY(${40 - 40 * local}%)`;
    });
    const a = 30 * (1 - 0.3 * p);
    meter.style.transform = `translateX(${-a}%)`;
    fill.style.transform = `translateX(${a}%)`;
    writeCount();
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const tweenTo = (to: number, duration: number) => {
    stop();
    const from = p;
    if (duration <= 0) {
      p = to;
      render();
      return;
    }
    let start: number | null = null;
    const step = (ts: number) => {
      start ??= ts;
      const t = Math.min(1, (ts - start) / (duration * 1000));
      p = from + (to - from) * ease(t);
      render();
      raf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  };
  const staticState = () => {
    stop();
    writeCount.cancel();
    p = 0;
    bars.forEach((b) => (b.style.transform = "translateY(0%)"));
    meter.style.transform = "translateX(-30%)";
    fill.style.transform = "translateX(30%)";
  };
  const initText = () => {
    const v = reduced || mobile ? COUNT_STATIC : COUNT_FROM;
    value.textContent = fmt.format(v);
    shown = v;
  };
  const sync = () => {
    if (reduced || mobile) staticState();
    initText();
  };
  d.add(
    onHoverChange(card, (h) => {
      if (reduced || mobile) return;
      if (h) tweenTo(1, 1 * (1 - p));
      else tweenTo(0, 0.6 * p);
    }),
  );
  d.add(
    onReducedMotionChange((r) => {
      reduced = r;
      sync();
    }),
  );
  d.add(
    onBreakpointChange((bp) => {
      mobile = bp === "mobile";
      sync();
    }),
  );
  sync();
  d.add(() => {
    stop();
    writeCount.cancel();
    bars.forEach((b) => (b.style.transform = ""));
    meter.style.transform = "";
    fill.style.transform = "";
  });
  return () => d.run();
}

function mountInvoicingBento(graphic: HTMLElement, card: HTMLElement): Cleanup {
  const d = new Disposer();
  const gradient = graphic.querySelector<HTMLElement>(".invoicing-bento-graphic__invoice-gradient");
  if (!gradient) return () => {};
  const cur = { x: 100, y: 100 }; // from source: useRef({ x: 100, y: 100 })
  const target = { x: 100, y: 100 };
  let raf = 0;
  let last: number | null = null;
  let reduced = reducedMotion();
  let mobile = breakpoint() === "mobile";
  const paint = () => {
    gradient.style.setProperty("--translate-x", `${cur.x}px`);
    gradient.style.setProperty("--translate-y", `${-cur.y}px`);
  };
  const step = (ts: number) => {
    raf = 0;
    const dt = last === null ? 1000 / 60 : Math.min(ts - last, 100);
    last = ts;
    if (Math.abs(target.x - cur.x) < 0.1 && Math.abs(target.y - cur.y) < 0.1) {
      last = null;
      return;
    }
    // from source: 3 % of the remaining distance per frame (made frame-rate independent at 60 Hz).
    const k = 1 - Math.pow(1 - 0.03, dt / (1000 / 60));
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    paint();
    raf = requestAnimationFrame(step);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = null;
  };
  d.add(
    onHoverChange(card, (h) => {
      if (h) {
        if (reduced || mobile) return;
        stop();
        raf = requestAnimationFrame(step);
      } else stop();
    }),
  );
  d.add(
    listen<MouseEvent>(card, "mousemove", (e) => {
      const r = card.getBoundingClientRect();
      target.x = e.clientX - r.left - r.width / 2;
      target.y = r.height / 2 - (e.clientY - r.top);
    }),
  );
  d.add(
    onReducedMotionChange((r) => {
      reduced = r;
      if (r) stop();
      paint();
    }),
  );
  d.add(
    onBreakpointChange((bp) => {
      mobile = bp === "mobile";
      if (mobile) stop();
      paint();
    }),
  );
  paint();
  d.add(stop);
  return () => d.run();
}

export function mountBillingBento(root: HTMLElement): Cleanup {
  const d = new Disposer();
  const usage = root.querySelector<HTMLElement>(".billing-bento .usage-based-billing-bento-graphic");
  const usageCard = usage?.closest<HTMLElement>(".feature-bento-card");
  if (usage && usageCard) d.add(mountUsageBento(usage, usageCard));
  const inv = root.querySelector<HTMLElement>(".billing-bento .invoicing-bento-graphic");
  const invCard = inv?.closest<HTMLElement>(".feature-bento-card");
  if (inv && invCard) d.add(mountInvoicingBento(inv, invCard));
  return () => d.run();
}
