// HostedPage — port of v1-chunk-CF276NCD.js (entry v1-HostedPage-MAB2KHQ2.js).
// The hero's hosted invoice page plays one pass: invoice due → "Pay" pressed → the email card pops up
// while the footer slides away and the card form types (InvoicingCardField, forms group) → "Pay"
// pressed → receipt → 4 s → back to the due screen. The reference starts it from HeroGraphic.connect()
// (v1-HeroGraphic-OBT326ZX.js, payment-links group); this port exposes the same animateIn() and, if no
// parent has called it by the next task, starts itself when it sits inside a HeroGraphic.
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, target } from "../lib";
import { Clock, disableAmbientAnimations, gateClock } from "../pg-tax/motion";

const EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

export interface HostedPageApi {
  animateIn(): void;
}

/** Structural type of the forms group's card-field step (see forms/api.ts). */
interface StepLike {
  play(): Promise<void>;
  pause(): void;
}
interface CardFieldLike {
  getAnimation(): StepLike;
}

export const HostedPage: Controller = (el) => {
  const N = "HostedPage";
  const t = (name: string) => target(el, N, name);
  const dueScreen = t("dueScreen");
  const payScreen = t("payScreen");
  const receiptScreen = t("receiptScreen");
  const duePayButton = t("duePayButton");
  const duePayButtonBackground = t("duePayButtonBackground");
  const payButton = t("payButton");
  const payButtonBackground = t("payButtonBackground");
  const payButtonLabel = t("payButtonLabel");
  const footer = t("footer");
  const footerBackground = t("footerBackground");

  const isStatic = disableAmbientAnimations();
  const clock = new Clock({ instant: isStatic });
  const d = (ms: number) => (isStatic ? 0 : ms);
  const anim = (node: Element | null, keyframes: Keyframe[], duration: number) => clock.animate(node, keyframes, { duration: d(duration), easing: EASE });

  const screenIn = (s: Element | null) => anim(s, [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }], 600);
  const screenOut = (s: Element | null) => anim(s, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.06)" }], 600);
  const press = (button: Element | null, bg: Element | null) =>
    Promise.all([anim(button, [{ transform: "scale(1)" }, { transform: "scale(0.95)" }], 200), anim(bg, [{ opacity: 0 }, { opacity: 1 }], 200)]);
  const release = (button: Element | null, bg: Element | null) =>
    Promise.all([anim(button, [{ transform: "scale(0.95)" }, { transform: "scale(1)" }], 200), anim(bg, [{ opacity: 1 }, { opacity: 0 }], 200)]);

  const cardField = () => {
    const node = childControllers(el, "InvoicingCardField")[0];
    return node ? getApi<CardFieldLike>(node, "InvoicingCardField") : undefined;
  };

  let started = false;
  const run = async () => {
    await clock.wait(500);
    await screenIn(dueScreen);
    await clock.wait(2000);
    await press(duePayButton, duePayButtonBackground);
    await clock.wait(100);
    await release(duePayButton, duePayButtonBackground);
    await Promise.all([
      anim(el, [{ transform: "scale(1)" }, { transform: "scale(1.06) translateY(-76px)" }], 600), // email pops out
      anim(footerBackground, [{ transform: "translateY(0)" }, { transform: "translateY(80px)" }], 600),
      anim(footer, [{ transform: "translateY(0)" }, { transform: "translateY(72px)" }], 600),
      screenOut(dueScreen),
      screenIn(payScreen),
    ]);
    const field = isStatic ? undefined : cardField();
    if (field) await clock.run(field.getAnimation());
    await anim(payButtonLabel, [{ opacity: 0.75 }, { opacity: 1 }], 400);
    await clock.wait(400);
    await press(payButton, payButtonBackground);
    await clock.wait(100);
    await release(payButton, payButtonBackground);
    await Promise.all([screenOut(payScreen), screenIn(receiptScreen)]);
    await clock.wait(4000);
    await Promise.all([
      screenOut(receiptScreen),
      anim(el, [{ transform: "scale(1.06) translateY(-76px)" }, { transform: "scale(1)" }], 600), // email drops back
      anim(footerBackground, [{ transform: "translateY(80px)" }, { transform: "translateY(0)" }], 600),
      anim(footer, [{ transform: "translateY(72px)" }, { transform: "translateY(0)" }], 600),
      screenIn(dueScreen),
    ]);
  };

  const api: HostedPageApi = {
    animateIn() {
      if (started) return;
      started = true;
      void run();
    },
  };
  exposeApi(el, N, api);

  const ungate = isStatic ? () => undefined : gateClock(clock, el);
  const inHero = !!el.parentElement?.closest('[data-js-controller~="HeroGraphic"]');
  const fallback = inHero ? window.setTimeout(() => api.animateIn(), 0) : 0;

  return () => {
    window.clearTimeout(fallback);
    ungate();
    clock.dispose(true);
  };
};
