// Financial Connections hero: the phone app walks through linking a bank account and adding funds, in a loop.
// Reference modules: v1-HeroAnimation-6ERK6PLS.js (FinancialConnectionsHeroAnimation,
// FinancialConnectionsAppFundsView), v1-chunk-PWUOO3VZ.js (…AppHomeView), v1-chunk-KJY7YNJU.js
// (…AppBankSelectionSheet), v1-chunk-ZDYBYFFU.js (…AppBankConnectionSheet), v1-chunk-57NEKIGV.js
// (…AppAccountSelectionSheet), v1-chunk-FAX6HCYM.js (…AppAddFundsSheet).
// Behaviour notes: docs/research/products/motion/pages-b.md.
//
// Each child controller exposes animation factories that take the parent's Timeline, so the parent can pause
// the whole walkthrough (offscreen, hidden tab) and restart it, like the reference's nested step objects.
import { exposeApi, getApi, prefersReducedMotion, target, targetList } from "../lib";
import type { Controller } from "../types";
import { EASE, Timeline, bezier, run, typeText, whenActive } from "../pg-payment-methods/motion";
import { addCents, conceal, formatCurrency, parseCurrency, press, reveal, snapshotStyles } from "./shared";

type Tl = Timeline;
/** v1-chunk-YGF75VGH tween default easing (the currency tweens pass none). */
const TWEEN_EASE = bezier(0.25, 1, 0.5, 1);
const DARK = "theme--Dark";
const FUNDS_TAB = "FinancialConnectionsHeroPhoneGraphic--isFundsTabSelected";
const RIPPLE = "FinancialConnectionsAppAddFundsSheet__keyRipple";
const slideUp = [{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }];
const slideDown = [{ transform: "translateY(0%)" }, { transform: "translateY(100%)" }];

// ---- children -------------------------------------------------------------------------------------------------

interface HomeViewApi {
  animation(tl: Tl): Promise<void>;
  addFunds(tl: Tl, from: number, add: number, symbol: string, decimals: boolean): Promise<void>;
}
export const FinancialConnectionsAppHomeView: Controller = (el) => {
  const C = "FinancialConnectionsAppHomeView";
  const button = target(el, C, "button");
  const label = target(el, C, "investmentsAmountLabel");
  const initial = label?.textContent ?? "";
  const api: HomeViewApi = {
    animation: (tl) => press(tl, button),
    addFunds: (tl, from, add, symbol, decimals) =>
      tl.tween(840, TWEEN_EASE, (v) => {
        if (label) label.textContent = formatCurrency(addCents(from, add * v), symbol, decimals ? 2 : 0);
      }),
  };
  exposeApi(el, C, api);
  return () => {
    if (label) label.textContent = initial;
  };
};

interface FundsViewApi {
  animation(tl: Tl): Promise<void>;
  addFunds(tl: Tl, from: number, add: number, symbol: string, decimals: boolean): Promise<void>;
}
export const FinancialConnectionsAppFundsView: Controller = (el) => {
  const C = "FinancialConnectionsAppFundsView";
  const button = target(el, C, "addFundsButton");
  const label = target(el, C, "amountLabel");
  const initial = label?.textContent ?? "";
  const api: FundsViewApi = {
    animation: async (tl) => {
      await tl.wait(2000);
      await press(tl, button);
    },
    addFunds: (tl, from, add, symbol, decimals) =>
      tl.tween(840, TWEEN_EASE, (v) => {
        if (label) label.textContent = formatCurrency(addCents(from, add * v), symbol, decimals ? 2 : 0);
      }),
  };
  exposeApi(el, C, api);
  return () => {
    if (label) label.textContent = initial;
  };
};

interface BankSelectionApi {
  show(tl: Tl): Promise<void>;
  hide(): void;
  fadeBack(tl: Tl): Promise<void>;
  animation(tl: Tl): Promise<void>;
}
export const FinancialConnectionsAppBankSelectionSheet: Controller = (el) => {
  const C = "FinancialConnectionsAppBankSelectionSheet";
  const overlay = target(el, C, "overlay");
  const bankButton = target(el, C, "bankButton");
  const outline = target(el, C, "bankButtonOutline");
  const restore = snapshotStyles([el]);
  const api: BankSelectionApi = {
    show: (tl) => {
      reveal(el);
      return tl.animate(el, slideUp, { duration: 750, easing: EASE.outCubic });
    },
    hide: () => conceal(el),
    fadeBack: (tl) =>
      Promise.all([
        overlay ? tl.animate(overlay, [{ opacity: "0" }, { opacity: 1 }], { duration: 750, easing: EASE.outCubic }) : undefined,
        tl.animate(el, [{ transform: "scale(1) translateY(0px)" }, { transform: "scale(0.95) translateY(-20px)" }], { duration: 750, easing: EASE.outCubic }),
      ]).then(() => undefined),
    animation: async (tl) => {
      await tl.wait(500);
      await Promise.all([
        outline ? tl.animate(outline, [{ opacity: "0" }, { opacity: 1 }], { delay: 150, duration: 450, easing: EASE.outCubic }) : undefined,
        press(tl, bankButton),
      ]);
    },
  };
  exposeApi(el, C, api);
  return restore;
};

interface BankConnectionApi {
  show(tl: Tl): Promise<void>;
  hide(tl: Tl): Promise<void>;
  animation(tl: Tl): Promise<void>;
  reset(): void;
}
export const FinancialConnectionsAppBankConnectionSheet: Controller = (el) => {
  const C = "FinancialConnectionsAppBankConnectionSheet";
  const username = target(el, C, "usernameField");
  const password = target(el, C, "passwordField");
  const submit = target(el, C, "submitButton");
  const restore = snapshotStyles([el]);
  const email = username?.textContent ?? "";
  const initialPassword = password?.textContent ?? "";
  if (username) username.textContent = "";
  const api: BankConnectionApi = {
    show: (tl) => {
      reveal(el);
      return tl.animate(el, slideUp, { duration: 750, easing: EASE.outCubic });
    },
    hide: async (tl) => {
      await tl.animate(el, slideDown, { duration: 750, easing: EASE.outCubic });
      conceal(el);
    },
    animation: async (tl) => {
      if (username) await typeText(tl, (s) => (username.innerText = s), email, 100);
      if (password) await typeText(tl, (s) => (password.innerText = s), "•".repeat(12), 120);
      await press(tl, submit);
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

interface AccountSelectionApi {
  show(tl: Tl): Promise<void>;
  hide(tl: Tl): Promise<void>;
  fadeIn(tl: Tl): Promise<void>;
  fadeOut(tl: Tl): Promise<void>;
  button(tl: Tl): Promise<void>;
  success(tl: Tl): Promise<void>;
}
export const FinancialConnectionsAppAccountSelectionSheet: Controller = (el) => {
  const C = "FinancialConnectionsAppAccountSelectionSheet";
  const t = (n: string) => target(el, C, n);
  const overlay = t("overlay");
  const backButton = t("backButton");
  const selectedAccount = t("selectedAccount");
  const selectedAccountBorder = t("selectedAccountBorder");
  const selectedAccountIcon = t("selectedAccountIcon");
  const accounts = t("accounts");
  const connectBtn = t("connectAccountButton");
  const connectText = t("connectAccountButtonText");
  const spinner = t("connectAccountButtonSpinner");
  const success = t("success");
  const checkmark = t("successCheckmark");
  const oc = EASE.outCubic;
  const api: AccountSelectionApi = {
    show: (tl) =>
      Promise.all([
        overlay ? tl.animate(overlay, [{ opacity: 1 }], { duration: 0 }) : undefined,
        tl.animate(el, [{ transform: "scale(0.95) translateY(-20px)", opacity: 1 }], { duration: 0 }),
      ]).then(() => undefined),
    hide: async (tl) => {
      await tl.wait(500);
      await press(tl, backButton);
      await tl.animate(el, slideDown, { delay: 300, duration: 750, easing: oc });
      await tl.animate(el, [{ opacity: 0 }]);
    },
    fadeIn: (tl) =>
      Promise.all([
        tl.animate(el, [{ transform: "scale(0.95) translateY(-20px)" }, { transform: "scale(1) translateY(0px)" }], { duration: 450, easing: oc }),
        overlay ? tl.animate(overlay, [{ opacity: "1" }, { opacity: 0 }], { duration: 450, easing: oc }) : undefined,
        selectedAccount
          ? tl.animate(selectedAccount, [{ transform: "scale(1.0)" }, { transform: "scale(0.95)", offset: 0.7 }, { transform: "scale(1.0)" }], {
              duration: 600,
              delay: 850,
              easing: oc,
            })
          : undefined,
        selectedAccountBorder ? tl.animate(selectedAccountBorder, [{ opacity: 1 }], { duration: 600, delay: 900, easing: oc }) : undefined,
        selectedAccountIcon
          ? tl.animate(selectedAccountIcon, [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "scale(1.0)" }], { duration: 300, delay: 950, easing: oc })
          : undefined,
      ]).then(() => undefined),
    fadeOut: (tl) =>
      accounts
        ? tl.animate(accounts, [{ opacity: 1, transform: "translateX(0px)" }, { opacity: 0, transform: "translateX(-15px)" }], { duration: 300, delay: 300, easing: oc })
        : Promise.resolve(),
    button: async (tl) => {
      await tl.wait(1000);
      await press(tl, connectBtn);
      if (connectText) await tl.animate(connectText, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: oc });
      if (spinner) await tl.animate(spinner, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: oc });
    },
    success: async (tl) => {
      await Promise.all([
        success ? tl.animate(success, [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0px)" }], { delay: 300, duration: 600, easing: oc }) : undefined,
        checkmark ? tl.animate(checkmark, [{ opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }], { delay: 550, duration: 300, easing: oc }) : undefined,
      ]);
      if (spinner) await tl.animate(spinner, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: oc });
    },
  };
  exposeApi(el, C, api);
};

interface AddFundsApi {
  show(tl: Tl): Promise<void>;
  hide(tl: Tl): Promise<void>;
  animation(tl: Tl, amount: number, symbol: string): Promise<void>;
  injectRippleElements(amount: number): void;
  reset(symbol: string): void;
}
export const FinancialConnectionsAppAddFundsSheet: Controller = (el) => {
  const C = "FinancialConnectionsAppAddFundsSheet";
  const addAmount = target(el, C, "addAmount");
  const five = target(el, C, "keyPadFive");
  const zero = target(el, C, "keyPadZero");
  const submit = target(el, C, "submitButton");
  const restore = snapshotStyles([el]);
  const initial = { amount: addAmount?.textContent ?? "", five: five?.innerHTML ?? "", zero: zero?.innerHTML ?? "" };
  const keyFor = (digit: string) => (digit === "5" ? five : zero);
  /** Key ripple: scale 0 → 2.4 (opacity held to 75%, then fades), 1000ms easeOutCubic, ±10px random offset. */
  const ripple = (tl: Tl, r: Element | undefined, delay: number) => {
    if (!r) return Promise.resolve();
    const x = Math.round(Math.random() * 20) - 10;
    const y = Math.round(Math.random() * 20) - 10;
    return tl.animate(
      r,
      [
        { transform: `scale(0) translate(${x}px,${y}px)`, opacity: 1 },
        { transform: `scale(2.4) translate(${x}px,${y}px)`, opacity: 1, offset: 0.75 },
        { transform: `scale(2.4) translate(${x}px,${y}px)`, opacity: 0 },
      ],
      { duration: 1000, delay: delay + 150, easing: EASE.outCubic },
    );
  };
  const api: AddFundsApi = {
    show: (tl) => {
      reveal(el);
      return tl.animate(el, [{ transform: "translateY(100%)" }, { transform: "translateY(0px)" }], { duration: 750, easing: EASE.outCubic });
    },
    hide: async (tl) => {
      await tl.animate(el, slideDown, { duration: 750, easing: EASE.outCubic });
      conceal(el);
    },
    /** Digits are keyed in: ripples (600ms apart), sequential key presses (scale .6), the amount label grows one
     * digit per 600ms (set 300ms into each slot), then the submit button is pressed. */
    animation: async (tl, amount, symbol) => {
      const digits = String(amount).split("");
      const used = new Map<string, number>();
      let typed = "";
      await Promise.all([
        Promise.all(
          digits.map((d, s) => {
            const k = used.get(d) || 0;
            used.set(d, k + 1);
            return ripple(tl, keyFor(d)?.querySelectorAll(`.${RIPPLE}`)[k], s * 600);
          }),
        ),
        (async () => {
          for (const d of digits) {
            const key = keyFor(d);
            if (key) await tl.animate(key, [{ transform: "scale(1.0)" }, { transform: "scale(0.6)", offset: 0.7 }, { transform: "scale(1.0)" }], { duration: 600 });
          }
        })(),
        (async () => {
          for (const d of digits) {
            await tl.wait(300);
            typed += d;
            if (addAmount) addAmount.innerText = formatCurrency(Number(typed), symbol, 0);
            await tl.wait(300);
          }
        })(),
      ]);
      await press(tl, submit);
    },
    injectRippleElements(amount) {
      const pads = new Map<string, [HTMLElement, number]>();
      if (five) pads.set("5", [five, 0]);
      if (zero) pads.set("0", [zero, 0]);
      String(amount)
        .split("")
        .forEach((d) => {
          const p = pads.get(d);
          if (p) p[1] += 1;
        });
      pads.forEach(([pad, n]) => {
        const label = pad.textContent ?? "";
        pad.textContent = label;
        for (let i = 0; i < n; i++) {
          const s = document.createElement("span");
          s.className = RIPPLE;
          pad.append(s);
        }
      });
    },
    reset(symbol) {
      if (addAmount) addAmount.innerText = formatCurrency(0, symbol, 0);
    },
  };
  exposeApi(el, C, api);
  return () => {
    restore();
    if (addAmount) addAmount.textContent = initial.amount;
    if (five) five.innerHTML = initial.five;
    if (zero) zero.innerHTML = initial.zero;
  };
};

// ---- parent ---------------------------------------------------------------------------------------------------

function child<T>(el: HTMLElement, name: string): T | undefined {
  const node = el.querySelector(`[data-js-controller~="${name}"]`);
  return node ? getApi<T>(node, name) : undefined;
}

export const FinancialConnectionsHeroAnimation: Controller = (el) => {
  if (prefersReducedMotion()) return; // reference: disableAmbientAnimations() → static
  const C = "FinancialConnectionsHeroAnimation";
  const home = child<HomeViewApi>(el, "FinancialConnectionsAppHomeView");
  const funds = child<FundsViewApi>(el, "FinancialConnectionsAppFundsView");
  const bankSel = child<BankSelectionApi>(el, "FinancialConnectionsAppBankSelectionSheet");
  const bankConn = child<BankConnectionApi>(el, "FinancialConnectionsAppBankConnectionSheet");
  const account = child<AccountSelectionApi>(el, "FinancialConnectionsAppAccountSelectionSheet");
  const addSheet = child<AddFundsApi>(el, "FinancialConnectionsAppAddFundsSheet");
  const phone = target(el, C, "phone");
  const track = target(el, C, "track");
  const overlay = target(el, C, "overlay");
  const guides = targetList(el, C, "guides");
  if (!home || !funds || !bankSel || !bankConn || !account || !addSheet || !phone || !track || !overlay) return;

  const toAdd = parseCurrency(el.dataset.toAddAmount);
  let investments = parseCurrency(el.dataset.investmentsAmount);
  const symbol = (el.dataset.toAddAmount || "").replace(/[\d., ]/g, "");
  const [, locale] = (document.documentElement.lang || "").split("-");
  const decimals = !["JP"].includes(locale ?? "");
  const tl = new Timeline();
  const oc = EASE.outCubic;
  const showOverlay = (to = "1") => tl.animate(overlay, [{ opacity: "0" }, { opacity: to }], { duration: 750, easing: oc });
  const hideOverlay = (from = "1") => tl.animate(overlay, [{ opacity: from }, { opacity: "0" }], { duration: 750, easing: oc });
  const trackTo = (from: string, to: string) =>
    tl.animate(track, [{ transform: `translateX(${from})` }, { transform: `translateX(${to})` }], { duration: 500, delay: 200, easing: oc });

  /** The reference reverses the guides list in place each time the main sequence is built, so the pulse order
   * alternates between loops. */
  const guidePulse = () => {
    guides.reverse();
    return Promise.all(
      guides.map((g, o) =>
        tl.animate(g, [{ transform: "scale(1.0)" }, { transform: "scale(1.05)" }, { transform: "scale(1.0)" }], { duration: 1600, delay: 150 + 100 * o, easing: oc }),
      ),
    );
  };

  const main = async () => {
    await tl.wait(1000);
    await home.animation(tl);
    // bank selection
    await Promise.all([showOverlay(), bankSel.show(tl)]);
    await bankSel.animation(tl);
    // bank connection
    await Promise.all([bankSel.fadeBack(tl), bankConn.show(tl)]);
    await bankConn.animation(tl);
    // account selection (guides pulse alongside)
    await Promise.all([
      guidePulse(),
      (async () => {
        await account.show(tl);
        bankSel.hide();
        await Promise.all([account.fadeIn(tl), bankConn.hide(tl)]);
        await account.button(tl);
        await account.fadeOut(tl);
        await account.success(tl);
        await account.hide(tl);
      })(),
    ]);
    // add funds: overlay out, funds tab slides in (dark theme), the funds view presses "Add funds"
    await Promise.all([
      hideOverlay(),
      (async () => {
        await tl.wait(250);
        await Promise.all([
          (async () => {
            await tl.wait(500);
            phone.classList.add(DARK);
            phone.classList.add(FUNDS_TAB);
          })(),
          trackTo("0%", "-100%"),
        ]);
      })(),
      funds.animation(tl),
    ]);
    // add-funds sheet: amount keyed in
    await Promise.all([addSheet.show(tl), showOverlay("0.6")]);
    await tl.wait(1000);
    await addSheet.animation(tl, toAdd, symbol);
    // funds view counts up while the sheet leaves
    await Promise.all([
      addSheet.hide(tl),
      hideOverlay("0.6"),
      (async () => {
        await tl.wait(500);
        await funds.addFunds(tl, investments, toAdd, symbol, decimals);
        await addSheet.animation(tl, toAdd, symbol);
      })(),
    ]);
    // back to the home view, which counts up too
    await tl.wait(1500);
    await Promise.all([
      (async () => {
        await tl.wait(500);
        phone.classList.remove(DARK);
        phone.classList.remove(FUNDS_TAB);
      })(),
      trackTo("-100%", "0%"),
      (async () => {
        await tl.wait(200);
        await home.addFunds(tl, investments, toAdd, symbol, decimals);
      })(),
    ]);
    await tl.wait(2000);
  };
  const loop = async () => {
    for (;;) {
      await main();
      // reference handleAnimationDone: reset the views, carry the new balance, restart (cancels every
      // animation of the pass) and build a new pass
      bankConn.reset();
      addSheet.reset(symbol);
      investments = addCents(investments, toAdd);
      tl.clearFills();
    }
  };

  addSheet.injectRippleElements(toAdd);
  let started = false;
  const offActive = whenActive(
    el,
    (on) => {
      if (!on) return tl.pause();
      tl.resume();
      if (!started) {
        started = true;
        run(loop());
      }
    },
    0.001,
  );
  const restorePhone = phone.className;
  return () => {
    offActive();
    tl.reset();
    phone.className = restorePhone;
  };
};
