// Comparison table. Reference module: v1-Table-AVBXGDDX.js. Keeps an optional fixed header track in sync
// with the horizontally scrolling body, repositions open portal tooltips while scrolling, scrolls to a
// column from the fixed header links, squares the fixed header's corners when it touches the viewport
// edge, and expands a collapsed table.
import { target, targetList } from "../lib";
import { childApis, classController, disableAmbientAnimations } from "./util";

interface PortalTooltipApi {
  repositionShownTooltip?: () => void;
}

export class Table {
  private readonly isStatic = disableAmbientAnimations();
  private readonly track: HTMLElement | null;
  private readonly fixedHeadCard: HTMLElement | null;
  private readonly fixedHeadTrack: HTMLElement | null;
  private readonly expandButton: HTMLElement | null;
  private readonly fixedHeaderLinks: HTMLElement[];
  private readonly initialClass: string;
  constructor(readonly el: HTMLElement) {
    this.track = target(el, "Table", "track");
    this.fixedHeadCard = target(el, "Table", "fixedHeadCard");
    this.fixedHeadTrack = target(el, "Table", "fixedHeadTrack");
    this.expandButton = target(el, "Table", "expandButton");
    this.fixedHeaderLinks = targetList(el, "Table", "fixedHeaderLinks");
    this.initialClass = el.className;
  }
  private readonly onResize = () => {
    const card = this.fixedHeadCard;
    if (!card) return;
    const { left, right } = card.getBoundingClientRect();
    if (left === 0) card.style.setProperty("--cardBorderRadiusLeft", "0");
    else card.style.removeProperty("--cardBorderRadiusLeft");
    if (right === document.body.clientWidth) card.style.setProperty("--cardBorderRadiusRight", "0");
    else card.style.removeProperty("--cardBorderRadiusRight");
  };
  private readonly onTrackScroll = () => {
    if (this.track) this.fixedHeadTrack?.scrollTo({ left: this.track.scrollLeft, behavior: "auto" });
    childApis<PortalTooltipApi>(this.el, "PortalTooltipItem").forEach((t) => t.repositionShownTooltip?.());
  };
  private readonly onHeaderLinkClick = (e: Event) => {
    e.preventDefault();
    if (!this.track) return;
    const i = this.fixedHeaderLinks.indexOf(e.currentTarget as HTMLElement);
    const left = this.track.scrollWidth * (i / this.fixedHeaderLinks.length);
    this.track.scrollTo({ left, behavior: this.isStatic ? "instant" : "smooth" });
  };
  private readonly onExpand = (e: Event) => {
    e.preventDefault();
    this.el.classList.remove("Table--isCollapsed");
    this.el.classList.add("Table--isExpanded");
  };
  connect(): void {
    if (this.fixedHeadCard) {
      window.addEventListener("resize", this.onResize);
      this.onResize();
    }
    if (this.track) this.track.addEventListener("scroll", this.onTrackScroll, { passive: true });
    this.fixedHeaderLinks.forEach((l) => l.addEventListener("click", this.onHeaderLinkClick));
    this.expandButton?.addEventListener("click", this.onExpand);
  }
  disconnect(): void {
    window.removeEventListener("resize", this.onResize);
    this.track?.removeEventListener("scroll", this.onTrackScroll);
    this.fixedHeaderLinks.forEach((l) => l.removeEventListener("click", this.onHeaderLinkClick));
    this.expandButton?.removeEventListener("click", this.onExpand);
    this.el.className = this.initialClass;
  }
}

export const tableControllers = {
  Table: classController("Table", (el) => new Table(el)),
};
