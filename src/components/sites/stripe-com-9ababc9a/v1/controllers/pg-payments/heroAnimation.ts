// /payments hero: three stacked checkout cards (Payment Element → Klarna → Checkout with Link) that
// scale in, play a short scripted interaction and hand over to the next card, forever.
//   PaymentsHeroAnimation, …PaymentElements, …Klarna, …Checkout ← v1-HeroAnimation-QR7HNW7K.js
//   PaymentsHeroAnimationLink                                    ← v1-chunk-4LG2VPOX.js
// Time-driven (starts 100 ms after mount, no scroll trigger in the reference). The page uses the
// non-centered variant (no PaymentsHeroAnimation--centered class), so each card intros/exits in place.
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, prefersReducedMotion, target, targetList } from "../lib";
import { Delay, EASE, Exec, Group, Sequence, Type, Waapi, type Step } from "./motion";
import { pauseWhenHidden } from "./util";

const SELECTED = "GraphicFormPaymentMethodField__item--isSelected";
const EASE_O = EASE.inOutCubic; // reference `o` (PE5OG4GE.f)
const EASE_N = EASE.outSine; // reference `n` (PE5OG4GE.b)

// Monochrome: the reference animates the de-selected payment-method tab from the accent colour to the
// idle colour. Values are the generator's greys for the same hexes (#9966ff → #626262, #727f96 → #7e7e7e,
// #0a2540 → #2b2b2b, #e6ebf1 → #eaeaea), so the keyframes start from what the CSS already shows.
const PE_ACTIVE = "#626262";
const PE_IDLE = "#7e7e7e";
const KL_ACTIVE = "#2b2b2b";
const KL_IDLE_TEXT = "#7e7e7e";
const KL_IDLE_BORDER = "#eaeaea";
// Link email chip: #303030 → Link blue #0055FF (accent → near-black on light).
const LINK_TEXT = "#303030";
const LINK_ACCENT = "#1a1a1a";
const CODE = ["6", "5", "5", "2", "9", "3"];
const CODE_EMPTY_FOCUSED = "PaymentsHeroAnimationLink__verificationCodeInput--emptyFocused";

const press = (el: Element | null, scale: number, duration: number) =>
  new Waapi({ el, keyframes: [{ transform: "scale(1.0)" }, { transform: `scale(${scale})`, offset: 0.7 }, { transform: "scale(1.0)" }], duration });
const addClass = (el: Element | null | undefined, c: string) => new Exec(() => el?.classList.add(c));
const removeClass = (el: Element | null | undefined, c: string) => new Exec(() => el?.classList.remove(c));
const fade = (el: WaapiEl, from: number, to: number, duration: number, extra: { delay?: number; easing?: string } = {}) =>
  new Waapi({ el, keyframes: [{ opacity: from }, { opacity: to }], duration, easing: extra.easing ?? EASE_N, delay: extra.delay });
type WaapiEl = Element | null | undefined | (Element | null | undefined)[];

interface CardApi {
  createIntroAnimation(): Step;
  createViewAnimation(): Step;
  createExitAnimation(): Step;
}

export interface LinkApi {
  createAnimation(fadeDown?: () => void, fadeOut?: () => void): Step;
  createExitAnimation(): Step;
}

// ---- PaymentsHeroAnimationLink ----------------------------------------------------------------------
export const PaymentsHeroAnimationLink: Controller = (el) => {
  const N = "PaymentsHeroAnimationLink";
  const t = (n: string) => target(el, N, n);
  const emailText = t("linkEmailText");
  const emailSpinner = t("emailSpinner");
  const emailCancel = t("emailCancel");
  const linkEmail = t("linkEmail");
  const linkEmailBackground = t("linkEmailBackground");
  const shippingInputBottomBorder = t("shippingInputBottomBorder");
  const codeVerification = t("codeVerification");
  const firstCodeInputActiveBorder = t("firstCodeInputActiveBorder");
  const verificationCodeSpinner = t("verificationCodeSpinner");
  const successIcon = t("successIcon");
  const successIconPath = t("successIconPath");
  const shippingTitle = t("shippingTitle");
  const shippingForm = t("shippingForm");
  const orderDetails = t("orderDetails");
  const codeInputs = targetList(el, N, "codeInputElements");
  const codeValues = targetList(el, N, "codeInputValueElements");
  if (!emailText) return;

  const originalEmail = emailText.textContent ?? "";
  const email = (emailText.innerText || originalEmail).trim();
  emailText.textContent = "";

  const emailSearch = (fadeDown?: () => void) =>
    new Sequence([
      new Type({ endString: email, speed: 80, onUpdate: (v) => (emailText.textContent = v) }),
      fade(emailSpinner, 0, 1, 200),
      new Delay(1000),
      new Group([
        new Exec(() => fadeDown?.()),
        new Waapi({ el: emailSpinner, keyframes: [{ opacity: 1, transform: "translateY(0px)" }, { opacity: 0, transform: "translateY(10px)" }], duration: 300, easing: EASE_N }),
        new Waapi({ el: emailCancel, keyframes: [{ opacity: 0, transform: "translateY(0px)" }, { opacity: 1, transform: "translateY(10px)" }], duration: 300, easing: EASE_N }),
        new Waapi({
          el: linkEmail,
          keyframes: [{ transform: "translate(0px, 0px)", color: LINK_TEXT }, { transform: "translate(8px, 8px)", color: LINK_ACCENT }],
          duration: 300,
          easing: EASE_N,
        }),
        new Waapi({ el: shippingInputBottomBorder, keyframes: [{ transform: "translateY(0px)" }, { transform: "translateY(262px)" }], duration: 300, easing: EASE_N }),
        fade(linkEmailBackground, 0, 0.05, 300),
        fade(codeVerification, 0, 1, 300, { delay: 200 }),
      ]),
    ]);

  const codeVerificationAnim = () =>
    new Sequence([
      new Delay(500),
      new Group([fade(firstCodeInputActiveBorder, 0, 1, 100), addClass(codeInputs[0], CODE_EMPTY_FOCUSED)]),
      new Delay(300),
      removeClass(codeInputs[0], CODE_EMPTY_FOCUSED),
      new Delay(200),
      new Group([
        fade(firstCodeInputActiveBorder, 1, 0, 200, { easing: EASE.inSine }),
        new Waapi({
          el: codeInputs,
          keyframes: [
            { transform: "scale(1)", easing: EASE_N },
            { transform: "scale(1.15)", easing: EASE_N },
            { transform: "scale(1)", easing: EASE.inSine },
          ],
          duration: 600,
        }),
        new Exec(() => codeValues.forEach((v, i) => (v.textContent = CODE[i] ?? ""))),
      ]),
      fade(verificationCodeSpinner, 0, 1, 200),
      new Delay(500),
      new Group([
        fade(verificationCodeSpinner, 1, 0, 300),
        new Waapi({ el: successIcon, keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 0 }),
        new Waapi({ el: successIconPath, keyframes: [{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], duration: 300, delay: 100, easing: EASE_N }),
      ]),
    ]);

  const reviewOrder = (fadeOut?: () => void) =>
    new Group([
      new Exec(() => fadeOut?.()),
      fade([shippingTitle, shippingForm], 1, 0, 300),
      new Waapi({ el: orderDetails, keyframes: [{ opacity: 0, transform: "scale(1.02)" }, { opacity: 1, transform: "scale(1)" }], duration: 400, easing: EASE_N }),
    ]);

  const api: LinkApi = {
    createAnimation: (fadeDown, fadeOut) => new Sequence([emailSearch(fadeDown), codeVerificationAnim(), new Delay(1000), reviewOrder(fadeOut)]),
    createExitAnimation: () =>
      new Group([
        new Waapi({ el: [emailSpinner, shippingTitle, shippingForm, shippingInputBottomBorder], keyframes: [{ opacity: 1, transform: "translateY(0px)" }], duration: 0 }),
        new Waapi({ el: linkEmail, keyframes: [{ transform: "translate(0px, 0px)", color: LINK_TEXT }], duration: 0 }),
        new Waapi({ el: [emailCancel, linkEmailBackground, codeVerification, orderDetails, emailSpinner], keyframes: [{ opacity: 0 }], duration: 0 }),
        new Waapi({ el: successIconPath, keyframes: [{ strokeDashoffset: 20 }], duration: 0 }),
        new Exec(() => {
          emailText.textContent = "";
          codeValues.forEach((v) => (v.textContent = ""));
        }),
      ]),
  };
  exposeApi(el, N, api);
  return () => {
    emailText.textContent = originalEmail;
    codeValues.forEach((v) => (v.textContent = ""));
    codeInputs[0]?.classList.remove(CODE_EMPTY_FOCUSED);
  };
};

// ---- Cards --------------------------------------------------------------------------------------------
const cardIntro = (el: Element, delay = 0) =>
  new Waapi({ el, keyframes: [{ opacity: 0, transform: "scale(0.8)" }, { opacity: 1, transform: "scale(1)" }], duration: 1250, delay, easing: EASE_O });
const cardExit = (el: Element, scale: number) =>
  new Waapi({ el, keyframes: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: `scale(${scale})` }], duration: 1250, easing: EASE_O });

export const PaymentsHeroAnimationPaymentElements: Controller = (el) => {
  const N = "PaymentsHeroAnimationPaymentElements";
  const t = (n: string) => target(el, N, n);
  const items = targetList(el, N, "paymentMethodFieldItems");
  const monthlyRing = t("monthlySubscriptionActiveRadioRing");
  const annualRadio = t("annualSubscriptionRadio");
  const annualRing = t("annualSubscriptionActiveRadioRing");
  const monthlyBorder = t("monthlyPlanActiveBorder");
  const annualBorder = t("annualPlanActiveBorder");
  const monthlyAmounts = targetList(el, N, "monthlyAmountElements");
  const annualAmounts = targetList(el, N, "annualAmountElements");
  const cardDetails = t("cardDetails");
  const paymentBanks = t("paymentBanks");
  let view: Step | undefined;

  const subscriptionSwitch = () =>
    new Group([
      fade(monthlyRing, 1, 0, 300),
      new Waapi({ el: annualRadio, keyframes: [{ transform: "scale(1.0)" }, { transform: "scale(0.84)", offset: 0.7 }, { transform: "scale(1.0)" }], duration: 400, easing: EASE_N }),
      fade(annualRing, 0, 1, 300),
      fade(monthlyBorder, 1, 0, 300),
      fade(annualBorder, 0, 1, 300, { delay: 100 }),
      fade(monthlyAmounts, 1, 0, 300, { delay: 100 }),
      fade(annualAmounts, 0, 1, 300, { delay: 100 }),
    ]);
  const bankSelect = () =>
    new Group([
      press(items[1], 0.92, 600),
      new Sequence([
        new Delay(100),
        new Group([
          new Waapi({ el: items[0], keyframes: [{ color: PE_ACTIVE, borderColor: PE_ACTIVE }, { color: PE_IDLE, borderColor: PE_IDLE }], duration: 200 }),
          addClass(items[1], SELECTED),
        ]),
      ]),
      fade(cardDetails, 1, 0, 200, { delay: 100 }),
      fade(paymentBanks, 0, 1, 300, { delay: 100 }),
    ]);
  const api: CardApi = {
    createIntroAnimation: () => cardIntro(el),
    createViewAnimation: () =>
      (view = new Sequence([cardIntro(el), new Delay(1000), subscriptionSwitch(), new Delay(1000), bankSelect(), new Delay(2000)])),
    createExitAnimation: () =>
      new Sequence([
        cardExit(el, 1.08),
        new Exec(() => {
          view?.cancel();
          items[1]?.classList.remove(SELECTED);
        }),
      ]),
  };
  exposeApi(el, N, api);
  return () => {
    view?.cancel();
    items[1]?.classList.remove(SELECTED);
  };
};

export const PaymentsHeroAnimationKlarna: Controller = (el) => {
  const N = "PaymentsHeroAnimationKlarna";
  const t = (n: string) => target(el, N, n);
  const items = targetList(el, N, "paymentMethodFeildItems");
  let view: Step | undefined;

  const address = () =>
    new Group([
      fade(t("addressPlaceholder"), 1, 0, 300),
      new Waapi({ el: t("inputBottomBorder"), keyframes: [{ transform: "translateY(0px)" }, { transform: "translateY(58px)" }], duration: 300, easing: EASE_N }),
      new Waapi({ el: t("paymentContainer"), keyframes: [{ transform: "translateY(0px)" }, { transform: "translateY(60px)" }], duration: 300, easing: EASE_N }),
      fade(t("addressInputValue"), 0, 1, 300),
    ]);
  const klarnaSelect = () =>
    new Group([
      press(items[1], 0.92, 600),
      new Sequence([
        new Delay(100),
        new Group([
          new Waapi({ el: items[0], keyframes: [{ color: KL_ACTIVE, borderColor: KL_ACTIVE }, { color: KL_IDLE_TEXT, borderColor: KL_IDLE_BORDER }], duration: 200 }),
          addClass(items[1], SELECTED),
        ]),
      ]),
      fade(t("cardPaymentForm"), 1, 0, 200, { delay: 100 }),
      fade(t("paymentButtonBackground"), 0.3, 1, 200, { delay: 100 }),
      fade(t("placeOrderButtonText"), 1, 0, 200, { delay: 100 }),
      fade(t("continueButtonText"), 0, 1, 200, { delay: 100 }),
      new Waapi({
        el: t("klarnaBanner"),
        keyframes: [{ opacity: 0, transform: "translateY(0px)" }, { opacity: 1, transform: "translateY(-120px)" }],
        duration: 400,
        delay: 200,
        easing: EASE_N,
      }),
    ]);
  const reset = () => {
    view?.cancel();
    items[1]?.classList.remove(SELECTED);
  };
  const api: CardApi = {
    createIntroAnimation: () => cardIntro(el),
    createViewAnimation: () => (view = new Sequence([cardIntro(el), new Delay(1000), address(), new Delay(1000), klarnaSelect(), new Delay(2000)])),
    createExitAnimation: () => new Sequence([cardExit(el, 1.2), new Exec(reset)]),
  };
  exposeApi(el, N, api);
  return reset;
};

export const PaymentsHeroAnimationCheckout: Controller = (el) => {
  const N = "PaymentsHeroAnimationCheckout";
  const shippingForm = target(el, N, "shippingForm");
  const linkEl = childControllers(el, "PaymentsHeroAnimationLink")[0];
  const link = linkEl ? getApi<LinkApi>(linkEl, "PaymentsHeroAnimationLink") : undefined;
  const loose = new Set<Step>();
  const oneShot = (s: Step) => {
    loose.add(s);
    s.play().then(() => loose.delete(s));
  };
  const fadeDown = () =>
    oneShot(
      new Waapi({ el: shippingForm, keyframes: [{ transform: "translateY(0px)", opacity: 1 }, { transform: "translateY(196px)", opacity: 0.4 }], duration: 300, easing: EASE_N }),
    );
  const fadeOut = () => oneShot(new Waapi({ el: shippingForm, keyframes: [{ opacity: 0.4 }, { opacity: 0 }], duration: 300, easing: EASE_N }));

  const api: CardApi = {
    createIntroAnimation: () => cardIntro(el),
    createViewAnimation: () => new Sequence([cardIntro(el), new Delay(1000), link?.createAnimation(fadeDown, fadeOut), new Delay(2000)]),
    createExitAnimation: () =>
      new Sequence([
        cardExit(el, 1.2),
        new Waapi({ el: shippingForm, keyframes: [{ transform: "translateY(0px)", opacity: 1 }], duration: 0 }),
        link?.createExitAnimation(),
      ]),
  };
  exposeApi(el, N, api);
  return () => loose.forEach((s) => s.cancel());
};

// ---- PaymentsHeroAnimation (orchestrator) --------------------------------------------------------------
export const PaymentsHeroAnimation: Controller = (el) => {
  const card = (name: string) => {
    const c = childControllers(el, name)[0];
    return c ? { el: c, api: getApi<CardApi>(c, name) } : undefined;
  };
  const pe = card("PaymentsHeroAnimationPaymentElements");
  const kl = card("PaymentsHeroAnimationKlarna");
  const co = card("PaymentsHeroAnimationCheckout");
  if (!pe?.api || !kl?.api || !co?.api) return;
  const peApi = pe.api;
  const klApi = kl.api;
  const coApi = co.api;

  // Reduced motion: no loop; show the first card in its initial state.
  if (prefersReducedMotion()) {
    const intro = peApi.createIntroAnimation();
    intro.finish();
    return () => intro.cancel();
  }

  let disposed = false;
  const live = new Set<Step>();
  const track = (s: Step) => {
    live.add(s);
    s.play().then(() => live.delete(s));
    return s;
  };
  // Every lap builds fresh steps (reference animateViews → createAnimations → createMainAnimation). The
  // next lap starts while the Checkout card is still exiting, so the two cross-fade.
  const animateViews = () => {
    if (disposed) return;
    const peView = peApi.createViewAnimation();
    const peExit = peApi.createExitAnimation();
    const klView = klApi.createViewAnimation();
    const klExit = klApi.createExitAnimation();
    const coView = coApi.createViewAnimation();
    const coExit = coApi.createExitAnimation();
    track(new Sequence([peView, new Group([peExit, klView]), new Group([klExit, coView]), new Group([coExit, new Exec(animateViews)])]));
  };
  const intro = track(new Sequence([new Delay(100), new Exec(animateViews)]));
  void intro;
  const offVis = pauseWhenHidden(el, () => [...live]);
  return () => {
    disposed = true;
    offVis();
    live.forEach((s) => s.cancel());
    live.clear();
  };
};
