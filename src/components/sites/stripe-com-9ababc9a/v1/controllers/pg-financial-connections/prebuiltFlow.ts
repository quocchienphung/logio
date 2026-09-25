// Financial Connections "How it works" prebuilt flow: pick a bank, sign in through the bank's window, the form
// switches to the connected account, pay, success, then a Replay button.
// Reference modules: v1-PrebuiltFlowAnimation-Y43376XD.js (FinancialConnectionsPrebuiltFlowAnimation),
// v1-chunk-D3UHXIKT.js (FinancialConnectionsPrebuiltFlowBankConnection).
// Behaviour notes: docs/research/products/motion/pages-b.md.
import { exposeApi, getApi, listen, prefersReducedMotion, target, targetList } from "../lib";
import type { Controller } from "../types";
import { EASE, Timeline, pauseWhenHidden, run, typeText } from "../pg-payment-methods/motion";
import { press, snapshotStyles } from "./shared";

const READY_TO_SUBMIT = "FinancialConnectionsPrebuiltFlowForm__submitButton--readyToSubmit";
const BANK_SELECTED = "FinancialConnectionsPrebuiltFlowForm__bankItem--isSelected";
/** The bank item the flow selects (formBankFieldItems[3]). */
const SELECTED_BANK_INDEX = 3;

interface BankConnectionApi {
  show(tl: Timeline): Promise<void>;
  hide(tl: Timeline): Promise<void>;
  main(tl: Timeline): Promise<void>;
  reset(): void;
}

export const FinancialConnectionsPrebuiltFlowBankConnection: Controller = (el) => {
  const C = "FinancialConnectionsPrebuiltFlowBankConnection";
  const browser = target(el, C, "browser");
  const username = target(el, C, "usernameField");
  const password = target(el, C, "passwordField");
  const signOn = target(el, C, "signOnButton");
  const restore = snapshotStyles([el]);
  const email = username?.textContent ?? "";
  const initialPassword = password?.textContent ?? "";
  if (username) username.textContent = "";
  const oc = EASE.outCubic;
  const api: BankConnectionApi = {
    show: (tl) => {
      el.style.pointerEvents = "auto";
      return browser
        ? tl.animate(browser, [{ opacity: 0, transform: "scale(0.8)" }, { opacity: 1, transform: "scale(1.0)" }], { duration: 500, easing: oc })
        : Promise.resolve();
    },
    hide: async (tl) => {
      if (browser) await tl.animate(browser, [{ opacity: 1, transform: "scale(1.0)" }, { opacity: 0, transform: "scale(0.8)" }], { duration: 500, easing: oc });
      el.style.pointerEvents = "none";
    },
    main: async (tl) => {
      if (username) await typeText(tl, (s) => (username.innerText = s), email, 120);
      if (password) await typeText(tl, (s) => (password.innerText = s), "•".repeat(17), 100);
      await tl.wait(300);
      await press(tl, signOn);
    },
    reset: () => {
      if (username) username.innerText = "";
      if (password) password.innerText = "";
    },
  };
  exposeApi(el, C, api);
  return () => {
    restore();
    if (username) username.textContent = email;
    if (password) password.textContent = initialPassword;
  };
};

export const FinancialConnectionsPrebuiltFlowAnimation: Controller = (el) => {
  if (prefersReducedMotion()) return; // reference: disableAmbientAnimations() → static
  const C = "FinancialConnectionsPrebuiltFlowAnimation";
  const form = target(el, C, "form");
  const formTrack = target(el, C, "formTrack");
  const formWrapper = target(el, C, "formWrapper");
  const formSuccess = target(el, C, "formSuccess");
  const submit = target(el, C, "formSubmitButton");
  const overlay = target(el, C, "overlay");
  const replay = target(el, C, "replay");
  const replayButton = target(el, C, "replayButton");
  const bankItems = targetList(el, C, "formBankFieldItems");
  const bcEl = el.querySelector('[data-js-controller~="FinancialConnectionsPrebuiltFlowBankConnection"]');
  const bank = bcEl ? getApi<BankConnectionApi>(bcEl, "FinancialConnectionsPrebuiltFlowBankConnection") : undefined;
  if (!form || !formTrack || !formWrapper || !formSuccess || !submit || !overlay || !replay || !replayButton || !bank) return;
  const formHeight = getComputedStyle(form).getPropertyValue("--financialConnectionsPrebuiltFlowFormHeight").trim();
  const formTrackHeight = getComputedStyle(form).getPropertyValue("--financialConnectionsPrebuiltFlowFormTrackHeight").trim();
  const formSuccessHeight = getComputedStyle(formSuccess).getPropertyValue("--financialConnectionsPrebuiltFlowFormSuccessHeight").trim();
  const restore = snapshotStyles([formSuccess, replay]);
  const tl = new Timeline();
  const oc = EASE.outCubic;
  let started = false;
  let isPlaying = false;
  let isFinished = false;
  const showOverlay = () => tl.animate(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 750, easing: oc });
  const hideOverlay = () => tl.animate(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: 750, easing: oc });

  const sequence = async () => {
    const bankItem = bankItems[SELECTED_BANK_INDEX];
    await tl.wait(2000);
    // bank click: press + selected state 100ms in
    await Promise.all([
      bankItem ? press(tl, bankItem) : undefined,
      tl.wait(100).then(() => bankItem?.classList.add(BANK_SELECTED)),
    ]);
    await Promise.all([bank.show(tl), showOverlay()]);
    await bank.main(tl);
    // bank connected: window closes, the form track slides to the connected account, the button arms
    await Promise.all([
      bank.hide(tl),
      hideOverlay(),
      tl.animate(formTrack, [{ transform: "translateY(0)" }, { transform: `translateY(calc(-1 * ${formTrackHeight} - 6px))` }], {
        duration: 750,
        delay: 300,
        easing: oc,
      }),
      tl.wait(300).then(() => submit.classList.add(READY_TO_SUBMIT)),
    ]);
    await tl.wait(2000);
    // pay
    await press(tl, submit);
    formSuccess.style.pointerEvents = "auto";
    await Promise.all([
      tl.animate(form, [{ height: formHeight }, { height: formSuccessHeight }], { duration: 500, easing: oc }),
      tl.animate(formWrapper, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: oc }),
      tl.animate(formSuccess, [{ opacity: 0, transform: "translateY(120px)" }, { opacity: 1, transform: "translateY(0px)" }], { duration: 500, easing: oc }),
    ]);
    await tl.wait(3000);
    // replay prompt
    replay.style.pointerEvents = "auto";
    await Promise.all([showOverlay(), tl.animate(replay, [{ opacity: 0 }, { opacity: 1 }], { duration: 750, easing: oc })]);
  };
  const play = () => {
    isPlaying = true;
    isFinished = false;
    run(
      sequence().then(() => {
        isPlaying = false;
        isFinished = true;
      }),
    );
  };

  const onReplay = () => {
    submit.classList.remove(READY_TO_SUBMIT);
    bankItems[SELECTED_BANK_INDEX]?.classList.remove(BANK_SELECTED);
    formSuccess.style.pointerEvents = "";
    replay.style.pointerEvents = "";
    bank.reset();
    tl.reset();
    tl.resume();
    play();
  };

  // IntersectionObserver(0.25): start once, then pause/resume an unfinished run with the viewport
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio >= 0.25) {
        if (!started) {
          started = true;
          play();
        } else if (!isFinished && tl.paused) tl.resume();
      } else if (started && !isFinished && isPlaying) tl.pause();
    },
    { threshold: 0.25 },
  );
  io.observe(el);
  const offs = [listen(replayButton, "click", onReplay), pauseWhenHidden(tl)];

  return () => {
    io.disconnect();
    offs.forEach((f) => f());
    tl.reset();
    restore();
    submit.classList.remove(READY_TO_SUBMIT);
    bankItems[SELECTED_BANK_INDEX]?.classList.remove(BANK_SELECTED);
  };
};
