// Card-number / expiry / CVC demo fields. Reference modules:
//   CheckoutCardField ...... v1-chunk-NJ7SLHQS.js (playAnimation(), focus class GraphicFormFieldInput--focused)
//   InvoicingCardField ..... v1-chunk-FMT7F2YQ.js (getAnimation(), InvoicingFieldInput--focused)
//   PaymentLinksCardField .. v1-chunk-44GSCTHH.js (getAnimation(), PaymentLinksFieldInput--focused)
// They are driven by parent controllers (checkout cards, invoicing hosted page, payment-links hero), which
// call the API below. Values are the reference's fake test data; nothing is submitted anywhere.
import { target, targetList } from "../lib";
import { Delay, Exec, Group, Sequence, Type, Waapi, type Step } from "./anim";
import { classController } from "./util";

type Network = "visa" | "mastercard" | "amex" | "discover" | "chinaunionpay";

interface Variant {
  name: string;
  focusClass: string;
  networks: Network[];
}

export class CardField {
  isCardNetworkDetected = false;
  private currentCardNetwork: Network | undefined;
  private currentAnimation: Step | null = null;
  private iconAnimation: Step | null = null;
  private readonly cardNumber: HTMLElement | null;
  private readonly cardNumberInput: HTMLElement | null;
  private readonly expiration: HTMLElement | null;
  private readonly expirationInput: HTMLElement | null;
  private readonly cvc: HTMLElement | null;
  private readonly cvcInput: HTMLElement | null;
  private readonly cardIcons: HTMLElement[];
  private readonly activeCardIcon: HTMLElement | null;
  private readonly initialInputs: [HTMLElement, string][];
  private readonly initialActiveIcon: Node[];

  constructor(
    readonly el: HTMLElement,
    private readonly v: Variant,
  ) {
    const t = (n: string) => target(el, v.name, n);
    this.cardNumber = t("cardNumber");
    this.cardNumberInput = t("cardNumberInput");
    this.expiration = t("expiration");
    this.expirationInput = t("expirationInput");
    this.cvc = t("cvc");
    this.cvcInput = t("cvcInput");
    this.cardIcons = targetList(el, v.name, "cardIcons");
    this.activeCardIcon = t("activeCardIcon");
    this.initialInputs = this.inputs.map((i) => [i, i.textContent ?? ""]);
    this.initialActiveIcon = this.activeCardIcon ? Array.from(this.activeCardIcon.childNodes) : [];
  }
  connect(): void {}
  disconnect(): void {
    this.currentAnimation?.cancel();
    this.iconAnimation?.cancel();
    this.initialInputs.forEach(([n, t]) => (n.textContent = t));
    this.fields.forEach((f) => f.classList.remove(this.v.focusClass));
    this.activeCardIcon?.replaceChildren(...this.initialActiveIcon);
  }

  private get inputs(): HTMLElement[] {
    return [this.cardNumberInput, this.expirationInput, this.cvcInput].filter((n): n is HTMLElement => n !== null);
  }
  private get fields(): HTMLElement[] {
    return [this.cardNumber, this.expiration, this.cvc].filter((n): n is HTMLElement => n !== null);
  }

  /** TypeAnimation:update handler: write the value, and detect the network once two digits are in. */
  private update(input: HTMLElement, value: string): void {
    input.textContent = value;
    if (input === this.cardNumberInput && value.length >= 2 && !this.isCardNetworkDetected && this.currentCardNetwork)
      this.setCardNetwork(this.currentCardNetwork);
  }

  /** Focus each field in turn: 300ms, type at 90ms/char, 400ms; then blur the last one. */
  getAnimation(cardNumber = "4242 4242 4242 4242", expiration = "12/24", cvc = "123", network: Network = "visa"): Step {
    this.currentCardNetwork = network;
    const rows: [HTMLElement | null, HTMLElement | null, string][] = [
      [this.cardNumber, this.cardNumberInput, cardNumber],
      [this.expiration, this.expirationInput, expiration],
      [this.cvc, this.cvcInput, cvc],
    ];
    const steps: Step[] = rows.flatMap(([field, input, value]) => [
      new Exec(() => {
        rows.forEach(([f]) => f?.classList.remove(this.v.focusClass));
        field?.classList.add(this.v.focusClass);
      }),
      new Delay(300),
      new Type({ endString: value, speed: 90, onUpdate: (s) => input && this.update(input, s) }),
      new Delay(400),
    ]);
    steps.push(new Exec(() => rows[rows.length - 1][0]?.classList.remove(this.v.focusClass)));
    return new Sequence(steps);
  }

  /** CheckoutCardField: build and start the typing sequence. */
  playAnimation(cardNumber?: string, expiration?: string, cvc?: string, network?: Network): Step {
    this.currentAnimation?.cancel();
    this.currentAnimation = this.getAnimation(cardNumber, expiration, cvc, network);
    void this.currentAnimation.play();
    return this.currentAnimation;
  }

  reset(): void {
    this.currentAnimation?.pause();
    this.inputs.forEach((i) => (i.textContent = ""));
    this.fields.forEach((f) => f.classList.remove(this.v.focusClass));
    this.setCardNetwork(undefined);
  }

  setCardNetwork(network: Network | undefined): void {
    this.isCardNetworkDetected = network !== undefined;
    this.iconAnimation?.cancel();
    if (network) this.copyDetectedCardNetwork(network);
    this.iconAnimation = network ? this.collapsingCardIconsAnimation() : this.resetCardIconsAnimation();
    void this.iconAnimation.play();
  }

  /** Network icons slide right under each other and fade (500ms), the detected one scales in (500ms, +100ms). */
  private collapsingCardIconsAnimation(): Step {
    const steps: Step[] = [
      new Waapi({
        el: [...this.cardIcons].reverse(),
        keyframes: (i) => [
          { transform: "translateX(0)", opacity: 1 },
          { transform: `translateX(calc(${i * 100}% + ${i * 4}px))`, opacity: 0 },
        ],
        duration: 500,
      }),
    ];
    if (this.activeCardIcon)
      steps.push(
        new Waapi({
          el: this.activeCardIcon,
          keyframes: [
            { transform: "scale(0.8)", opacity: 0 },
            { transform: "scale(1.0)", opacity: 1 },
          ],
          duration: 500,
          delay: 100,
        }),
      );
    return new Group(steps);
  }

  private resetCardIconsAnimation(): Step {
    const steps: Step[] = [new Waapi({ el: [...this.cardIcons].reverse(), keyframes: [{ transform: "translateX(0)", opacity: 1 }], duration: 0 })];
    if (this.activeCardIcon) steps.unshift(new Waapi({ el: this.activeCardIcon, keyframes: [{ transform: "scale(0.8)", opacity: 0 }], duration: 0 }));
    return new Group(steps);
  }

  private copyDetectedCardNetwork(network: Network): void {
    const icon = this.cardIcons[this.v.networks.indexOf(network)];
    if (!icon || !this.activeCardIcon) return;
    this.activeCardIcon.replaceChildren(icon.cloneNode(true));
  }
}

export const cardFieldControllers = {
  CheckoutCardField: classController("CheckoutCardField", (el) => new CardField(el, { name: "CheckoutCardField", focusClass: "GraphicFormFieldInput--focused", networks: ["visa", "mastercard", "amex", "discover"] })),
  InvoicingCardField: classController("InvoicingCardField", (el) => new CardField(el, { name: "InvoicingCardField", focusClass: "InvoicingFieldInput--focused", networks: ["visa", "mastercard", "amex", "chinaunionpay"] })),
  PaymentLinksCardField: classController("PaymentLinksCardField", (el) => new CardField(el, { name: "PaymentLinksCardField", focusClass: "PaymentLinksFieldInput--focused", networks: ["visa", "mastercard", "amex", "chinaunionpay"] })),
};
