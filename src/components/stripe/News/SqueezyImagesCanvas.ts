// Port of the reference "squeezy" canvas carousel (bundle chunk 22990). Constants, flex fractions,
// easing (easeOutExpo, 1000ms) and the rounded-rect clipping are kept identical.

export interface SqueezyItem {
  imgSrc: string;
  collapsedOffsetX?: number;
}

const C = {
  smallCardGap: 8,
  largeCardGap: 16,
  smallCardWidth: 8,
  columnOneFlexFraction: -0.06,
  columnOneSqueezedFlexFraction: -0.12,
  columnOneStretchedFlexFraction: 0,
  columnTwoFlexFraction: 0.61,
  columnTwoSqueezedFlexFraction: 0.59,
  columnTwoStretchedFlexFraction: 0.71,
  columnThreeFlexFraction: 0.3,
  columnThreeSqueezedFlexFraction: 0.28,
  columnThreeStretchedFlexFraction: 0.4,
  columnFourFlexFraction: 0.15,
  columnFourSqueezedFlexFraction: 0.13,
  columnFourStretchedFlexFraction: 0.25,
  smallCardHoverOffset: 3,
  borderRadius: 6,
  blurValue: 4,
};
const BASE_FLEX = [
  C.columnOneFlexFraction,
  C.columnTwoFlexFraction,
  C.columnThreeFlexFraction,
  C.columnFourFlexFraction,
];
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(Math.min(v, hi), lo);
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

interface Card {
  itemIndex: number;
  img: HTMLImageElement;
  x: number;
  collapsedOffsetX: number;
  width: number;
  leftGap: number;
  columnIndex: number;
  animationStartCollapsedOffsetX?: number;
  animationStartWidth?: number;
  animationStartLeftGap?: number;
  targetCollapsedOffsetX?: number;
  targetWidth?: number;
  targetLeftGap?: number;
}

export class SqueezyImagesCanvas {
  private ctx: CanvasRenderingContext2D;
  private dpr = window.devicePixelRatio || 1;
  private images: HTMLImageElement[] = [];
  private itemsCollapsedOffsetX: number[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;
  private cards: Card[] = [];
  private numSmallCards = 3;
  private visibleCardsCount = 7;
  private totalGap = 3 * C.smallCardGap + 3 * C.largeCardGap;
  private imageWidth = 0;
  private colOneBaseWidth = 0;
  private totalMediumCardWidth = 0;
  private columnIndexOffset = 0;
  private cardsOffsetX = 0;
  private animationStartCardsOffsetX = 0;
  private targetCardsOffsetX = 0;
  private mediumCardsWidthOffset = 0;
  private animationStartMediumCardsWidthOffset = 0;
  private targetMediumCardsWidthOffset = 0;
  private animationDuration = 1000;
  private animationStartAt = 0;
  private animationRequestId: number | null = null;
  private interactiveCardsFlexFraction = [...BASE_FLEX];
  private hoveredCardIndex = -1;
  private borderRadius = C.borderRadius;
  private hasInitializedCards = false;

  constructor(
    private canvas: HTMLCanvasElement,
    items: SqueezyItem[],
    private onNextColumnClick: (n: number) => void,
    private prefersReducedMotion = false,
    borderRadius = C.borderRadius,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.borderRadius = borderRadius;
    if (prefersReducedMotion) this.animationDuration = 200;
    canvas.addEventListener("mouseenter", this.updateHoverIndex);
    canvas.addEventListener("mousemove", this.updateHoverIndex);
    canvas.addEventListener("mouseleave", this.resetHoverIndex);
    canvas.addEventListener("click", this.onCanvasClick);
    document.addEventListener("visibilitychange", this.renderGridCards);
    this.init(items);
    this.onCanvasResize();
  }

  private init(items: SqueezyItem[]) {
    this.numSmallCards = clamp(items.length - 4, 1, 3);
    this.visibleCardsCount = 4 + this.numSmallCards;
    this.totalGap = C.smallCardGap * this.numSmallCards + 3 * C.largeCardGap;
    this.images = items.map((it) => {
      const img = new Image();
      img.onload = this.renderGridCards;
      img.src = it.imgSrc;
      return img;
    });
    this.itemsCollapsedOffsetX = items.map((it) => it.collapsedOffsetX || 0);
    this.cards = items.map((_, e) => ({
      itemIndex: e,
      img: this.images[e],
      x: 0,
      collapsedOffsetX: e === 0 ? 0 : this.itemsCollapsedOffsetX[e],
      width: this.getCardWidth(e),
      leftGap: e < 4 ? C.largeCardGap : C.smallCardGap,
      columnIndex: e,
    }));
    this.renderGridCards();
    this.hasInitializedCards = true;
  }

  onCanvasResize = () => {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.ctx.scale(this.dpr, this.dpr);
    this.colOneBaseWidth = this.canvasHeight * (16 / 9);
    this.totalMediumCardWidth =
      this.canvasWidth -
      this.colOneBaseWidth -
      this.totalGap -
      C.smallCardWidth * this.numSmallCards;
    this.imageWidth =
      this.colOneBaseWidth +
      this.totalMediumCardWidth * C.columnOneStretchedFlexFraction;
    if (this.animationRequestId) cancelAnimationFrame(this.animationRequestId);
    this.cards.forEach((c) => {
      c.width = this.getCardWidth(c.columnIndex);
      c.leftGap = c.columnIndex < 4 ? C.largeCardGap : C.smallCardGap;
    });
    if (this.hasInitializedCards) this.resetHoverIndex();
  };

  private updateHoverIndex = (e: MouseEvent) => {
    const x = e.offsetX;
    const idx =
      this.cards.find((c) => c.x <= x && x <= c.x + c.width)?.columnIndex ?? -1;
    if (idx >= 0 && idx !== this.hoveredCardIndex) {
      this.hoveredCardIndex = idx;
      this.updateCardsFlex();
    }
  };

  private resetHoverIndex = () => {
    this.hoveredCardIndex = -1;
    this.updateCardsFlex();
  };

  private onCanvasClick = () => {
    if (this.hoveredCardIndex > 0)
      this.onNextColumnClick(this.hoveredCardIndex);
  };

  private updateCardsFlex() {
    const h = this.hoveredCardIndex;
    this.interactiveCardsFlexFraction =
      h >= 0 && h <= 3 && !this.prefersReducedMotion
        ? [
            h === 0
              ? C.columnOneStretchedFlexFraction
              : C.columnOneSqueezedFlexFraction,
            h === 1
              ? C.columnTwoStretchedFlexFraction
              : C.columnTwoSqueezedFlexFraction,
            h === 2
              ? C.columnThreeStretchedFlexFraction
              : C.columnThreeSqueezedFlexFraction,
            h === 3
              ? C.columnFourStretchedFlexFraction
              : C.columnFourSqueezedFlexFraction,
          ]
        : [...BASE_FLEX];
    this.canvas.style.cursor = h >= 0 ? "pointer" : "default";
    this.startCarouselAnimation();
  }

  private getCardWidth(col: number) {
    if (col < 0 || col > 3) {
      const extra =
        this.hoveredCardIndex === col ? this.targetMediumCardsWidthOffset : 0;
      return C.smallCardWidth + extra;
    }
    if (col === 0)
      return (
        this.colOneBaseWidth +
        (this.totalMediumCardWidth - this.targetMediumCardsWidthOffset) *
          this.interactiveCardsFlexFraction[0]
      );
    return (
      (this.totalMediumCardWidth - this.targetMediumCardsWidthOffset) *
      this.interactiveCardsFlexFraction[col]
    );
  }

  private renderGridCards = () => {
    this.cards.forEach((c, i) => {
      c.x =
        i === 0
          ? this.cardsOffsetX
          : this.cards[i - 1].x + this.cards[i - 1].width + c.leftGap;
    });
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.cards.forEach((c) => {
      if (c.x + c.width < 0 || c.x > this.canvasWidth) return;
      this.renderCard(c);
    });
  };

  private renderCard({ img, width, x, collapsedOffsetX }: Card) {
    if (!img.complete || img.naturalWidth === 0) return;
    this.ctx.save();
    this.setFullHeightRoundedRectClip(x, width);
    const ratio = img.width / img.height;
    let w: number, h: number, ox: number, oy: number;
    if (ratio > this.imageWidth / this.canvasHeight) {
      h = this.canvasHeight;
      w = this.canvasHeight * ratio;
      ox = (this.imageWidth - w) / 2;
      oy = 0;
    } else {
      w = this.imageWidth;
      h = this.imageWidth / ratio;
      ox = 0;
      oy = (this.canvasHeight - h) / 2;
    }
    const dx = ox + (x + width / 2 - w / 2) - collapsedOffsetX;
    this.ctx.drawImage(img, dx, oy, w, h);
    this.ctx.restore();
  }

  private setFullHeightRoundedRectClip(x: number, width: number) {
    const maxR = Math.min(width, this.canvasHeight) / 2;
    const r = clamp(this.borderRadius, 0, maxR);
    const H = this.canvasHeight;
    const p = new Path2D();
    p.moveTo(x, r);
    p.lineTo(x, H - r);
    p.lineTo(x + r, H);
    p.lineTo(x + width - r, H);
    p.lineTo(x + width, H - r);
    p.lineTo(x + width, r);
    p.lineTo(x + width - r, 0);
    p.lineTo(x + r, 0);
    p.arc(x + r, r, r, 0, 2 * Math.PI, true);
    p.arc(x + r, H - r, r, 0, 2 * Math.PI, true);
    p.arc(x + width - r, H - r, r, 0, 2 * Math.PI, true);
    p.arc(x + width - r, r, r, 0, 2 * Math.PI, true);
    this.ctx.clip(p);
  }

  gotoPrev(n: number) {
    for (let i = 0; i < n; i++) {
      const idx =
        (this.cards[0].itemIndex - 1 + this.images.length) % this.images.length;
      this.cards.unshift({
        itemIndex: idx,
        img: this.images[idx],
        x: 0,
        collapsedOffsetX: 0,
        width: C.smallCardWidth,
        leftGap: C.largeCardGap,
        columnIndex: 0,
      });
    }
    this.cards.forEach((c, i) => (c.columnIndex = i + this.columnIndexOffset));
    this.startCarouselAnimation(n);
  }

  gotoNext(n: number) {
    for (let i = 0; i < n; i++) {
      const idx =
        (this.cards[this.cards.length - 1].itemIndex + 1) % this.images.length;
      this.cards.push({
        itemIndex: idx,
        img: this.images[idx],
        x: 0,
        collapsedOffsetX: this.itemsCollapsedOffsetX[idx],
        width: C.smallCardWidth,
        leftGap: C.smallCardGap,
        columnIndex: 0,
      });
    }
    this.columnIndexOffset -= n;
    this.cards.forEach((c, i) => (c.columnIndex = i + this.columnIndexOffset));
    this.startCarouselAnimation();
  }

  private startCarouselAnimation(shift = 0) {
    this.animationStartCardsOffsetX =
      this.cardsOffsetX - shift * (C.smallCardWidth + C.largeCardGap);
    this.targetCardsOffsetX =
      this.columnIndexOffset * (C.smallCardWidth + C.largeCardGap);
    this.animationStartMediumCardsWidthOffset = this.mediumCardsWidthOffset;
    this.targetMediumCardsWidthOffset =
      !this.prefersReducedMotion && this.hoveredCardIndex > 3
        ? C.smallCardHoverOffset
        : 0;
    this.cards.forEach((c) => {
      const col = c.columnIndex;
      c.animationStartCollapsedOffsetX = c.collapsedOffsetX;
      c.animationStartWidth = c.width;
      c.animationStartLeftGap = c.leftGap;
      c.targetCollapsedOffsetX =
        col === 0 ? 0 : this.itemsCollapsedOffsetX[c.itemIndex];
      c.targetWidth = this.getCardWidth(col);
      c.targetLeftGap = col < 4 ? C.largeCardGap : C.smallCardGap;
    });
    this.animationStartAt = performance.now();
    if (this.animationRequestId) cancelAnimationFrame(this.animationRequestId);
    this.animationRequestId = requestAnimationFrame(this.animate);
  }

  private onAnimationComplete() {
    const first = this.cards.findIndex((c) => c.columnIndex === 0);
    this.cards = this.cards.slice(first, first + this.visibleCardsCount);
    this.columnIndexOffset = 0;
    this.cardsOffsetX = 0;
    this.renderGridCards();
  }

  private animate = (t: number) => {
    const p = Math.min((t - this.animationStartAt) / this.animationDuration, 1);
    const a = easeOutExpo(p);
    const lerp = (x: number, y: number) => x + (y - x) * a;
    this.cardsOffsetX = lerp(
      this.animationStartCardsOffsetX,
      this.targetCardsOffsetX,
    );
    this.mediumCardsWidthOffset = lerp(
      this.animationStartMediumCardsWidthOffset,
      this.targetMediumCardsWidthOffset,
    );
    this.cards.forEach((c) => {
      c.collapsedOffsetX = lerp(
        c.animationStartCollapsedOffsetX ?? c.collapsedOffsetX,
        c.targetCollapsedOffsetX ?? c.collapsedOffsetX,
      );
      c.width = lerp(
        c.animationStartWidth ?? c.width,
        c.targetWidth ?? c.width,
      );
      c.leftGap = lerp(
        c.animationStartLeftGap ?? c.leftGap,
        c.targetLeftGap ?? c.leftGap,
      );
    });
    this.renderGridCards();
    if (a < 1) this.animationRequestId = requestAnimationFrame(this.animate);
    else this.onAnimationComplete();
  };

  dispose() {
    if (this.animationRequestId) cancelAnimationFrame(this.animationRequestId);
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.images.forEach((img) => {
      img.onload = null;
      img.src = "";
    });
    this.canvas.removeEventListener("mouseenter", this.updateHoverIndex);
    this.canvas.removeEventListener("mousemove", this.updateHoverIndex);
    this.canvas.removeEventListener("mouseleave", this.resetHoverIndex);
    this.canvas.removeEventListener("click", this.onCanvasClick);
    document.removeEventListener("visibilitychange", this.renderGridCards);
  }
}
