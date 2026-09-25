// Payment-methods hero: the looping carousel of checkout cards, and the scale container inside the cards.
// Reference modules: v1-HeroCarousel-WI6LQIXL.js (PaymentMethodHubHeroCarousel),
// v1-HeroGraphicCardScaleContainer-6EHFGGVE.js (PaymentMethodHubHeroGraphicCardScaleContainer).
// Behaviour notes: docs/research/products/motion/pages-b.md.
import { prefersReducedMotion, targetList } from "../lib";
import type { Controller } from "../types";
import { EASE, Timeline, run, whenActive } from "./motion";

const POSITION_COUNT = 7;
const CARD_HORIZONTAL_GAP = 25;
const CARD_VERTICAL_GAP = 50;
const AUTO_ADVANCE_RATE = 3000;
const FADE_IN_OFFSET = 100;
const STAGGER_AMOUNT = 120;
const DURATION = 1400;
const RESIZE_DEBOUNCE = 100;
/** Wrapper (display: contents) that lets the controllers of a cloned card mount while it is attached. */
const SLOT_CLASS = "PgPmHeroCarouselSlot";

interface Point {
  x: number;
  y: number;
}

/** Stores the first child's rounded size as the aspect-ratio variables of .PaymentMethodHubHeroScaleContainer. */
export const PaymentMethodHubHeroGraphicCardScaleContainer: Controller = (el) => {
  const child = el.firstElementChild;
  if (!child) return;
  const { width, height } = child.getBoundingClientRect();
  if (!width || !height) return;
  el.style.setProperty("--paymentMethodHubHeroScaleContainerWidth", `${Math.round(width)}`);
  el.style.setProperty("--paymentMethodHubHeroScaleContainerHeight", `${Math.round(height)}`);
};

type Registry = typeof import("../registry");

export const PaymentMethodHubHeroCarousel: Controller = (el) => {
  const graphics = targetList<HTMLElement>(el, "PaymentMethodHubHeroCarousel", "graphics");
  if (graphics.length === 0) return;
  const initialChildren = Array.from(el.childNodes);
  const originals = graphics.map((g) => g.cloneNode(true) as HTMLElement);
  const tl = new Timeline();
  const mounted = new Map<HTMLElement, () => void>();
  let registry: Registry | null = null;
  let alive = true;
  let active: HTMLElement[] = [...graphics];
  let positions: Point[] = [];
  let cardsToDelete: HTMLElement[] = [];
  let currentIndex = 0;
  let isInit = false;

  // The reference framework mounts controllers on inserted nodes (MutationObserver); do the same for clones
  // (DomGraphic scaling, the scale container) so they match the server-rendered cards.
  const mountCard = (card: HTMLElement) => {
    const slot = card.parentElement;
    if (!registry || !slot || !slot.classList.contains(SLOT_CLASS) || mounted.has(card)) return;
    mounted.set(card, registry.mountControllers(slot));
  };
  import("../registry").then(
    (m) => {
      if (!alive) return;
      registry = m;
      active.forEach(mountCard);
    },
    () => undefined,
  );

  const attach = (card: HTMLElement) => {
    const slot = document.createElement("div");
    slot.className = SLOT_CLASS;
    slot.append(card);
    el.append(slot);
    mountCard(card);
  };
  const detach = (card: HTMLElement) => {
    mounted.get(card)?.();
    mounted.delete(card);
    const slot = card.parentElement;
    if (slot?.classList.contains(SLOT_CLASS)) slot.remove();
    else card.remove();
  };
  const createNewCard = (i: number) => originals[i % originals.length].cloneNode(true) as HTMLElement;
  const posAt = (i: number) => positions[Math.min(i + 1, POSITION_COUNT - 1)];
  const isEdge = (i: number) => i === 0 || i === positions.length - 1;

  const computePositions = () => {
    const first = active[0];
    if (!first) return;
    const step = first.getBoundingClientRect().width + CARD_HORIZONTAL_GAP;
    positions = Array.from({ length: POSITION_COUNT }, (_, s) => ({ x: step * (s - 2), y: s % 2 === 0 ? CARD_VERTICAL_GAP : 0 }));
  };
  const initializeCardDuplicates = () => {
    active = [];
    el.replaceChildren();
    for (let t = 0; t < positions.length; t += 1) {
      const card = createNewCard(t);
      active.push(card);
      attach(card);
    }
  };
  const initializeCardPositions = () => {
    active.forEach((card, e) => {
      const { x, y } = posAt(e);
      card.style.transform = `translate(${x}px, ${y}px)`;
    });
  };
  const deleteCards = () => {
    cardsToDelete.forEach(detach);
    cardsToDelete = [];
  };

  /** Intro: every card rises 100px into its slot and fades in (1400ms, default easing), even cards first. */
  const animateInCards = async () => {
    await Promise.all(
      active.map((card, i) => {
        const { x, y } = posAt(i);
        return tl.animate(
          card,
          [
            { opacity: 0, transform: `translate(${x}px, ${y + FADE_IN_OFFSET}px)` },
            { opacity: 1, transform: `translate(${x}px, ${y}px)` },
          ],
          { duration: DURATION, delay: i % 2 === 0 ? (i * STAGGER_AMOUNT) / 2 : ((i + 4) * STAGGER_AMOUNT) / 2 },
        );
      }),
    );
    await tl.wait(AUTO_ADVANCE_RATE);
  };

  /** One advance: every card moves one slot left (1400ms easeInOutCubic, 120ms stagger per slot), the card
   * leaving slot 1 fades out, a new card is appended at the far right, then a 3s hold. */
  const animateCards = async () => {
    // The reference builds the move group before its exec steps run, i.e. from the list before the
    // new card is pushed and the first one shifted.
    const moving = [...active];
    deleteCards();
    const card = createNewCard(originals.length - currentIndex);
    attach(card);
    active.push(card);
    const gone = active.shift();
    if (gone) cardsToDelete.push(gone);
    await Promise.all(
      moving.map((c, n) => {
        const i = Math.min(n + 1, POSITION_COUNT - 1);
        const from = positions[i];
        const to = positions[n];
        return tl.animate(
          c,
          [
            { transform: `translate(${from.x}px, ${from.y}px)`, opacity: isEdge(i) ? "0" : "1" },
            { transform: `translate(${to.x}px, ${to.y}px)`, opacity: isEdge(n) ? "0" : "1" },
          ],
          { duration: DURATION, easing: EASE.inOutCubic, delay: n === positions.length - 1 ? 0 : i * STAGGER_AMOUNT },
        );
      }),
    );
    await tl.wait(AUTO_ADVANCE_RATE);
    deleteCards();
    next();
  };
  const next = () => {
    currentIndex += 1;
    if (currentIndex >= originals.length) currentIndex = 0;
    run(animateCards());
  };

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!isInit) return;
      // reference: pause the running sequence (its effects stay frozen), re-slot the cards, advance
      tl.abort("keep");
      computePositions();
      initializeCardPositions();
      next();
    }, RESIZE_DEBOUNCE);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(el);

  computePositions();
  initializeCardDuplicates();
  initializeCardPositions();

  let offActive: () => void = () => undefined;
  if (prefersReducedMotion()) {
    // Static final layout of the intro; no auto-advance.
    active.forEach((c, i) => (c.style.opacity = isEdge(Math.min(i + 1, POSITION_COUNT - 1)) ? "0" : "1"));
  } else {
    offActive = whenActive(el, (on) => (on ? tl.resume() : tl.pause()));
    run(
      (async () => {
        await animateInCards();
        isInit = true;
        next();
      })(),
    );
  }

  return () => {
    alive = false;
    offActive();
    ro.disconnect();
    window.clearTimeout(resizeTimer);
    tl.reset();
    [...active, ...cardsToDelete].forEach(detach);
    mounted.forEach((off) => off());
    mounted.clear();
    el.replaceChildren(...initialChildren);
    graphics.forEach((g) => {
      g.style.removeProperty("transform");
      g.style.removeProperty("opacity");
    });
  };
};
