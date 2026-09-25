// Layout/media/tooltip controllers of the legacy product pages.
//   DomGraphic         ← v1-chunk-6NTPOWLV.js
//   StripeSet          ← v1-StripeSet-L54OFY6U.js
//   Track              ← v1-Track-PCQTHG4I.js → v1-chunk-RKQAIDWX.js
//   Video              ← v1-Video-WYZVNHR6.js → v1-chunk-YDW2KO6D.js
//   PortalTooltipItem  ← v1-PortalTooltipItem-Y3O6X7SV.js → v1-chunk-TAAFKDSH.js
//   GuidesCard         ← v1-Card-R77AR2VK.js
import type { Controller } from "../types";
import { listen, target, targetList } from "../lib";
import { clamp, disableAmbientAnimations, exposeCore, scrollObserver, v1Body } from "./util";

// ---- DomGraphic ---------------------------------------------------------------------------------
type Device = "Phone" | "Tablet" | "Desktop";
const deviceFor = (w: number): Device => (w < 600 ? "Phone" : w < 900 ? "Tablet" : "Desktop");

export interface DomGraphicApi {
  readonly currentDevice: Device;
  readonly computedSourceWidth: number;
  readonly computedSourceHeight: number;
  readonly aspectRatio: number;
}

export const DomGraphic: Controller = (el) => {
  const num = (v: string | undefined) => parseFloat(v || "0") || 0;
  const d = el.dataset;
  const src = {
    w: num(d.jsSourceWidth), h: num(d.jsSourceHeight),
    wPhone: num(d.jsSourceWidthPhone), hPhone: num(d.jsSourceHeightPhone),
    wTablet: num(d.jsSourceWidthTablet), hTablet: num(d.jsSourceHeightTablet),
    wDesktop: num(d.jsSourceWidthDesktop), hDesktop: num(d.jsSourceHeightDesktop),
  };
  const maxWidth = d.jsMaxWidth;
  const scaleContainer = target(el, "DomGraphic", "scaleContainer");
  let windowWidth = window.innerWidth;

  const pick = (phone: number, tablet: number, desktop: number, base: number) => {
    const dev = deviceFor(windowWidth);
    if ((phone && dev === "Phone") || (phone && !tablet && dev === "Tablet")) return phone;
    if (tablet && dev === "Tablet") return tablet;
    if (desktop && dev === "Desktop") return desktop;
    return base || 0;
  };
  const api: DomGraphicApi = {
    get currentDevice() {
      return deviceFor(windowWidth);
    },
    get computedSourceWidth() {
      return pick(src.wPhone, src.wTablet, src.wDesktop, src.w);
    },
    get computedSourceHeight() {
      return pick(src.hPhone, src.hTablet, src.hDesktop, src.h);
    },
    get aspectRatio() {
      return this.computedSourceHeight / this.computedSourceWidth;
    },
  };
  const updateGraphicProps = () => {
    el.style.setProperty("--aspectRatio", `${api.aspectRatio * 100}%`);
    el.style.setProperty("--maxWidth", maxWidth || `${api.computedSourceWidth}px`);
    el.style.setProperty("--domGraphicWidth", `${api.computedSourceWidth}px`);
    el.style.setProperty("--domGraphicHeight", `${api.computedSourceHeight}px`);
  };
  const handleWindowResize = () => {
    const w = window.innerWidth;
    const changed = deviceFor(w) !== deviceFor(windowWidth);
    windowWidth = w;
    if (changed) updateGraphicProps();
  };
  const ro = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const scale = entry.contentRect.width / api.computedSourceWidth;
      scaleContainer?.style.setProperty("transform", `scale(${scale})`);
      el.style.setProperty("--scale", String(scale));
    });
  });
  const off = listen(window, "resize", handleWindowResize);
  updateGraphicProps();
  ro.observe(el);
  exposeCore(el, "DomGraphic", api);
  return () => {
    off();
    ro.disconnect();
  };
};

// ---- StripeSet ----------------------------------------------------------------------------------
const STRIPE_OVERLAP = -11;
const STRIPE_START_Y = -5;
const STRIPE_SUBPIXEL_SHIFT = 0.25;

export const StripeSet: Controller = (el) => {
  const stripes = targetList(el, "StripeSet", "stripes");
  const intersection = target(el, "StripeSet", "intersection");
  if (disableAmbientAnimations() || stripes.length <= 1 || !intersection || !el.classList.contains("StripeSet--layoutIntersecting")) return;
  const alignEnd = el.dataset.jsAlign === "End";
  const overlap = alignEnd ? -STRIPE_OVERLAP : STRIPE_OVERLAP;
  const startY = alignEnd ? -STRIPE_START_Y : STRIPE_START_Y;
  const moving = alignEnd ? [stripes[0], stripes[2]].filter(Boolean) : [stripes[1]];
  let windowHeight = window.innerHeight;
  let shiftY = Infinity;
  let intersectionShiftY = Infinity;

  const handleScroll = () => {
    const progress = (windowHeight - el.getBoundingClientRect().bottom) / windowHeight;
    const e = Math.round(startY + overlap * progress * 2) / 2;
    const t = alignEnd ? -e : e;
    if (t !== intersectionShiftY) {
      intersection.style.transform = `translateY(${t - STRIPE_SUBPIXEL_SHIFT}px)`;
      intersectionShiftY = t;
    }
    if (e !== shiftY) {
      moving.forEach((s) => (s.style.transform = `translateY(${e}px)`));
      shiftY = e;
    }
  };
  const handleResize = () => {
    windowHeight = window.innerHeight;
    handleScroll();
  };
  let offScroll: (() => void) | null = null;
  const offResize = listen(window, "resize", handleResize);
  handleResize();
  const stop = scrollObserver(
    el,
    { threshold: 0.01 },
    () => {
      offScroll ??= listen(window, "scroll", handleScroll, { passive: true });
    },
    () => {
      offScroll?.();
      offScroll = null;
    },
  );
  return () => {
    stop();
    offScroll?.();
    offResize();
  };
};

// ---- Track --------------------------------------------------------------------------------------
export interface TrackApi {
  index: number;
  setIndex(i: number): void;
}

export const Track: Controller = (el) => {
  let current = 0;
  const api: TrackApi = {
    get index() {
      return current;
    },
    set index(n: number) {
      current = n;
      el.style.setProperty("--currentIndex", String(n));
    },
    setIndex(n: number) {
      api.index = n;
    },
  };
  exposeCore(el, "Track", api);
};

// ---- Video --------------------------------------------------------------------------------------
const VIDEO_PLAYING = "Video--playing";
const VIDEO_POSTER_HIDDEN = "Video--posterHidden";
const HAVE_ENOUGH_DATA = 4;
const SUBTITLE_FALLBACKS: Record<string, string> = { en: "en-GB", "en-GB": "en", es: "es-419", "es-419": "es", fr: "fr-CA", "fr-CA": "fr" };

export interface VideoApi {
  readonly isPlaying: boolean;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
}

export const Video: Controller = (el) => {
  const video = target<HTMLVideoElement>(el, "Video", "video");
  if (!video) return;
  const playButton = target(el, "Video", "playButton");
  const excludeControls = el.classList.contains("Video--excludeControls");
  const supportTimestamp = el.classList.contains("Video--supportQueryStringTimestamp");
  const emit = (name: string) => el.dispatchEvent(new CustomEvent(name));

  const hidePoster = () => el.classList.add(VIDEO_POSTER_HIDDEN);
  const showPoster = () => el.classList.remove(VIDEO_POSTER_HIDDEN);
  const showPlayButton = () => {
    el.classList.remove(VIDEO_PLAYING);
    if (!excludeControls) video.removeAttribute("controls");
  };
  const hidePlayButton = () => {
    el.classList.add(VIDEO_PLAYING);
    if (!excludeControls) video.setAttribute("controls", "controls");
    hidePoster();
  };
  const api: VideoApi = {
    get isPlaying() {
      return !video.paused && video.readyState !== HAVE_ENOUGH_DATA;
    },
    async play() {
      if (api.isPlaying) return;
      try {
        await video.play();
        hidePlayButton();
        emit("Video:play");
      } catch {
        // autoplay/network refusal: the poster and play button stay (reference logs at info level)
      }
    },
    pause() {
      video.pause();
      showPlayButton();
      emit("Video:pause");
    },
    stop() {
      api.pause();
      video.currentTime = 0;
      showPlayButton();
      emit("Video:stop");
    },
  };

  const handlePaused = () => {
    if (video.readyState === HAVE_ENOUGH_DATA && !video.seeking) showPlayButton();
  };
  const handleEnded = () => {
    if (!video.loop) {
      api.stop();
      showPoster();
    }
    emit("Video:done");
  };
  const enableSubtitlesForForeignLanguage = () => {
    const tracks = Array.from(video.textTracks);
    if (tracks.some((t) => t.mode === "showing")) return;
    const parts = (document.documentElement.lang || "en-US").split("-");
    while (parts.length > 2) parts.splice(0, 2, parts.slice(0, 2).join("-"));
    const langs = [parts[0]];
    const fallback = SUBTITLE_FALLBACKS[langs[0]];
    if (fallback) langs.push(fallback);
    if (langs.includes(video.lang)) return;
    const match = langs.flatMap((l) => tracks.filter((t) => t.language === l));
    if (match.length) match[0].mode = "showing";
  };

  const offs = [
    listen(video, "ended", handleEnded),
    listen(video, "pause", handlePaused),
    listen(video, "play", hidePlayButton),
  ];
  if (supportTimestamp) {
    const raw = new URL(document.location.href).searchParams.get("t");
    const t = Number(raw);
    if (raw && Number.isFinite(t) && t >= 0) {
      video.currentTime = t;
      hidePoster();
    }
  }
  if (video.lang && video.textTracks?.length) enableSubtitlesForForeignLanguage();
  if (playButton) offs.push(listen(playButton, "click", () => void api.play()));
  if (excludeControls) offs.push(listen(el, "click", () => (video.paused ? void api.play() : api.pause())));
  if (video.autoplay && !video.paused) hidePoster();
  exposeCore(el, "Video", api);
  return () => offs.forEach((f) => f());
};

// ---- PortalTooltipItem --------------------------------------------------------------------------
const TT_FOCUSABLE = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const TT_TAP_FOCUS = "PortalTooltipItem--tapFocus";
const TT_ABOVE = "PortalTooltipItem__tooltip--directionAbove";
const TT_BELOW = "PortalTooltipItem__tooltip--directionBelow";
const TT_STATIC_PROPS = ["--tooltipItemBackgroundColor", "--tooltipItemShadow", "--linkColor"];
const TT_RESPONSIVE_PROPS = ["--tooltipItemPadding", "--tooltipItemTextColor", "--tooltipItemFont", "--tooltipPointOffsetX", "--tooltipPointHeight"];
const TT_EDGE = 16;
const TT_POINT_INSET = 20;
const TT_HIDE_DELAY = 100;

export interface PortalTooltipItemApi {
  readonly isTooltipShown: boolean;
  showTooltip(): void;
  hideTooltip(): void;
  repositionShownTooltip(): void;
}

export const PortalTooltipItem: Controller = (el) => {
  const tooltip = target(el, "PortalTooltipItem", "tooltip");
  if (!tooltip) return;
  // The reference portals into <body>; here that is `.MktBody` (inside `.v1-root`, so the scoped CSS
  // still applies). Positions are document coordinates, corrected for a positioned portal parent.
  const portalRoot = v1Body(el) ?? document.body;
  let portaled = false;
  let shown = false;
  let tooltipId = "";
  let windowWidth = window.innerWidth;
  let pointHeight = 0;
  let focusables: HTMLElement[] = [];
  let hideTimeout: number | undefined;
  let stopObserver: (() => void) | null = null;

  const initStaticStyles = () => {
    const cs = getComputedStyle(tooltip);
    TT_STATIC_PROPS.forEach((p) => tooltip.style.setProperty(p, cs.getPropertyValue(p)));
  };
  const setResponsiveStyles = () => {
    const cs = getComputedStyle(tooltip);
    TT_RESPONSIVE_PROPS.forEach((p) => {
      const v = cs.getPropertyValue(p);
      tooltip.style.setProperty(p, v);
      if (p === "--tooltipPointHeight") pointHeight = v ? parseFloat(v) || 0 : 0;
    });
  };
  const removeResponsiveStyles = () => TT_RESPONSIVE_PROPS.forEach((p) => tooltip.style.removeProperty(p));

  const offsetOrigin = () => {
    const op = tooltip.offsetParent;
    if (!op || op === document.body || op === document.documentElement) return { x: 0, y: 0 };
    const r = op.getBoundingClientRect();
    return { x: r.left + window.scrollX + op.clientLeft, y: r.top + window.scrollY + op.clientTop };
  };
  const addScrollObserver = () => {
    stopObserver?.();
    stopObserver = scrollObserver(el, { threshold: 1, rootMargin: "0px 40px" }, () => {}, hideTooltip);
  };
  const updatePosition = () => {
    tooltip.style.setProperty("transform", "none");
    tooltip.style.left = "0px";
    tooltip.classList.remove(TT_ABOVE, TT_BELOW);
    const r = el.getBoundingClientRect();
    const { width, height } = tooltip.getBoundingClientRect();
    const origin = offsetOrigin();
    if (r.top > height + pointHeight) {
      tooltip.classList.add(TT_ABOVE);
      tooltip.style.top = `${window.scrollY + r.top - (height + pointHeight) - origin.y}px`;
    } else {
      tooltip.classList.add(TT_BELOW);
      tooltip.style.top = `${window.scrollY + r.bottom + pointHeight - origin.y}px`;
    }
    const centre = r.left + r.width / 2;
    const maxLeft = window.innerWidth - (width + TT_EDGE);
    const ideal = centre - width / 2;
    const left = clamp(ideal, TT_EDGE, maxLeft);
    const pointOffset = clamp(Math.round(ideal - left), width / -2 + TT_POINT_INSET, width / 2 - TT_POINT_INSET);
    tooltip.style.setProperty("--tooltipPointOffsetX", `${pointOffset}px`);
    tooltip.style.left = `${left - origin.x}px`;
    addScrollObserver();
  };
  const portalTooltip = () => {
    if (!tooltipId) tooltipId = `PortalTooltipItem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("id", tooltipId);
    portalRoot.appendChild(tooltip);
    portaled = true;
  };
  const unportal = () => {
    if (!portaled) return;
    tooltip.removeAttribute("role");
    tooltip.removeAttribute("id");
    el.appendChild(tooltip);
    portaled = false;
  };
  function showTooltip() {
    tooltip!.style.removeProperty("display");
    tooltip!.style.removeProperty("opacity");
    if (!portaled) portalTooltip();
    el.setAttribute("aria-describedby", tooltipId);
    updatePosition();
    shown = true;
    window.addEventListener("keydown", handleKeyDown);
  }
  function hideTooltip() {
    tooltip!.style.opacity = "0";
  }
  const handleFadeOut = (e: TransitionEvent) => {
    if (e.propertyName !== "opacity" || getComputedStyle(tooltip).opacity !== "0") return;
    tooltip.style.display = "none";
    el.removeAttribute("aria-describedby");
    stopObserver?.();
    stopObserver = null;
    if (document.activeElement === el) el.blur();
    el.classList.remove(TT_TAP_FOCUS);
    shown = false;
    window.removeEventListener("keydown", handleKeyDown);
  };
  const handleEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(hideTimeout);
    showTooltip();
  };
  const handleLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(hideTimeout);
    hideTimeout = window.setTimeout(hideTooltip, TT_HIDE_DELAY);
  };
  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    el.classList.add(TT_TAP_FOCUS);
    el.focus();
  };
  const handleTooltipPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    showTooltip();
  };
  const handleResize = () => {
    if (window.innerWidth === windowWidth) return;
    windowWidth = window.innerWidth;
    unportal();
    removeResponsiveStyles();
    setResponsiveStyles();
  };
  function handleKeyDown(e: KeyboardEvent) {
    if (!shown) return;
    if (e.key === "Escape") hideTooltip();
    else if (e.key === "Tab") {
      if (e.shiftKey) {
        if (focusables.length && document.activeElement === focusables[0]) {
          e.preventDefault();
          el.focus();
        }
      } else if (focusables.length) {
        if (document.activeElement === el) {
          e.preventDefault();
          focusables[0].focus();
          showTooltip();
        } else if (document.activeElement === focusables[focusables.length - 1]) {
          e.preventDefault();
          const all = Array.from(document.querySelectorAll<HTMLElement>(TT_FOCUSABLE));
          all[all.indexOf(el) + 1]?.focus();
          hideTooltip();
        }
      }
    }
  }

  initStaticStyles();
  setResponsiveStyles();
  focusables = Array.from(tooltip.querySelectorAll<HTMLElement>(TT_FOCUSABLE));
  const offs = [
    listen(el, "pointerenter", handleEnter),
    listen(el, "pointerleave", handleLeave),
    listen(el, "pointerdown", handlePointerDown),
    listen(el, "focus", showTooltip),
    listen(el, "blur", hideTooltip),
    listen(tooltip, "transitionend", handleFadeOut),
    listen(tooltip, "pointerenter", handleEnter),
    listen(tooltip, "pointerleave", handleLeave),
    listen(tooltip, "pointerdown", handleTooltipPointerDown),
    listen(window, "resize", handleResize),
  ];
  const api: PortalTooltipItemApi = {
    get isTooltipShown() {
      return shown;
    },
    showTooltip,
    hideTooltip,
    repositionShownTooltip: () => {
      if (shown) updatePosition();
    },
  };
  exposeCore(el, "PortalTooltipItem", api);
  return () => {
    offs.forEach((f) => f());
    window.removeEventListener("keydown", handleKeyDown);
    window.clearTimeout(hideTimeout);
    stopObserver?.();
    unportal();
  };
};

// ---- GuidesCard ---------------------------------------------------------------------------------
const GUIDES_DURATION = 3000;
const GUIDES_COL_STAGGER = 200;

export const GuidesCard: Controller = (el) => {
  const isStatic = disableAmbientAnimations();
  const stop = scrollObserver(el, { threshold: 0.75 }, () => {
    stop();
    el.querySelectorAll<SVGGElement>("g").forEach((g) => {
      const col = Number(g.dataset.col);
      g.querySelectorAll<SVGElement>("path, circle, rect").forEach((s) => {
        s.style.transition = `stroke-dashoffset ${isStatic ? 0 : GUIDES_DURATION}ms ease-out ${col * (isStatic ? 0 : GUIDES_COL_STAGGER)}ms`;
        s.style.strokeDashoffset = "0px";
      });
    });
  });
  return stop;
};
