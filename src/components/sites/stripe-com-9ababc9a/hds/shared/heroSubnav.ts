// Product hero sub-navigation (reference modules 91353 ProductHeroSubnav + 22744 HeroSubnav, chunk 61541).
// - Static desktop nav and a mobile static nav whose cross button opens a drawer.
// - A sticky copy, portalled to <body>, that slides in once the page scrolls past an anchor section
//   (on /managed-payments: the manifesto). Its own cross button opens a full-height drawer on
//   mobile/tablet with a click-to-close backdrop; Escape closes it.
// Scroll is throttled (50ms, leading+trailing) and the anchor offset re-measured on resize
// (debounced 50ms), exactly like the reference hook.

import { mountHorizontalScrollContainers } from "./horizontalScroll";
import { type Cleanup, combine, debounce, getBreakpoint, listen, onBreakpointChange, throttle } from "./runtime";

interface Options {
  /** Section whose top edge starts the sticky zone; null = no sticky nav. */
  stickyAnchor: HTMLElement | null;
}

const setInert = (el: HTMLElement | null, inert: boolean) => {
  if (!el) return;
  if (inert) el.setAttribute("inert", "");
  else el.removeAttribute("inert");
};

export function mountHeroSubnav(container: HTMLElement, { stickyAnchor }: Options): Cleanup {
  const staticNav = container.querySelector<HTMLElement>(".hero-static-subnav");
  const mobileNav = container.querySelector<HTMLElement>(".hero-mobile-static-subnav");
  if (!staticNav || !mobileNav) return () => {};
  const mobileToggle = mobileNav.querySelector<HTMLButtonElement>(".hero-subnav__mobile-toggle-button");
  const mobileContent = mobileNav.querySelector<HTMLElement>(".hero-mobile-static-subnav__content-container");
  const cleanups: Cleanup[] = [];

  let mobileOpen = false; // HeroSubnav `m`
  let stickyOpen = false; // HeroStickySubnav `p`
  let inStickyZone = false;
  let anchorTop: number | null = null;

  // ---- sticky copy (HeroStickySubnav), client-only portal
  let sticky: HTMLElement | null = null;
  let stickyNav: HTMLElement | null = null;
  let stickyToggle: HTMLButtonElement | null = null;
  let stickyContent: HTMLElement | null = null;
  let backdrop: HTMLElement | null = null;
  if (stickyAnchor) {
    sticky = document.createElement("div");
    sticky.className = "hero-sticky-subnav";
    stickyNav = document.createElement("nav");
    stickyNav.className = "hero-subnav hero-subnav--sticky";
    const label = staticNav.getAttribute("aria-label");
    if (label) stickyNav.setAttribute("aria-label", label);
    const title = document.createElement("span");
    title.className = "hero-subnav__title";
    const titleSrc = staticNav.querySelector(".product-hero-subnav__title");
    if (titleSrc) title.append(titleSrc.cloneNode(true));
    stickyContent = document.createElement("div");
    stickyContent.className = "hero-subnav__content-container";
    const clip = document.createElement("div");
    clip.className = "hero-subnav__content-clip";
    const content = document.createElement("div");
    content.className = "hero-subnav__content";
    // The sticky nav renders the same items as the mobile static nav (page nav + secondary nav + CTA).
    mobileNav.querySelector(".hero-mobile-static-subnav__content")?.childNodes.forEach((n) => content.append(n.cloneNode(true)));
    clip.append(content);
    stickyContent.append(clip);
    const drawerSlot = document.createElement("div");
    drawerSlot.className = "hero-subnav__drawer-slot";
    stickyToggle = (mobileToggle?.cloneNode(true) as HTMLButtonElement | undefined) ?? null;
    stickyNav.append(title, stickyContent, drawerSlot);
    if (stickyToggle) stickyNav.append(stickyToggle);
    backdrop = document.createElement("div");
    backdrop.className = "hero-sticky-subnav__mobile-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    sticky.append(stickyNav, backdrop);
    document.body.append(sticky);
    cleanups.push(() => sticky?.remove());
    cleanups.push(mountHorizontalScrollContainers(sticky));
  }

  const render = () => {
    const bp = getBreakpoint();
    const compact = bp !== "desktop"; // mobile || tablet
    const stickyActive = !!stickyAnchor && inStickyZone;
    const stickyVisible = compact ? stickyActive && !mobileOpen : stickyActive; // `w`
    // Close the sticky drawer when it is no longer applicable.
    if (stickyOpen && !(compact && stickyVisible)) stickyOpen = false;

    mobileNav.classList.toggle("hero-mobile-static-subnav--open", mobileOpen);
    mobileToggle?.classList.toggle("hero-subnav__mobile-toggle-button--open", mobileOpen);
    mobileToggle?.setAttribute("aria-expanded", String(mobileOpen));
    setInert(mobileContent, !mobileOpen);
    staticNav.setAttribute("aria-hidden", String(stickyVisible));
    mobileNav.setAttribute("aria-hidden", String(stickyVisible));

    if (sticky && stickyNav) {
      sticky.classList.toggle("hero-sticky-subnav--visible", stickyVisible);
      sticky.setAttribute("aria-hidden", String(!stickyVisible));
      stickyNav.classList.toggle("hero-subnav--sticky-mobile-open", stickyOpen);
      stickyToggle?.classList.toggle("hero-subnav__mobile-toggle-button--open", stickyOpen);
      stickyToggle?.setAttribute("aria-expanded", String(stickyOpen));
      setInert(stickyContent, compact && !stickyOpen);
      backdrop?.classList.toggle("hero-sticky-subnav__mobile-backdrop--active", stickyOpen);
    }
  };

  if (mobileToggle) {
    cleanups.push(
      listen(mobileToggle, "click", () => {
        mobileOpen = !mobileOpen;
        render();
      }),
    );
  }
  if (stickyToggle) {
    cleanups.push(
      listen(stickyToggle, "click", () => {
        stickyOpen = !stickyOpen;
        render();
      }),
    );
  }
  if (backdrop) {
    cleanups.push(
      listen(backdrop, "click", () => {
        stickyOpen = false;
        render();
      }),
    );
  }
  cleanups.push(
    listen(document, "keydown", (e) => {
      if (e.key === "Escape" && stickyOpen) {
        stickyOpen = false;
        render();
      }
    }),
  );

  if (stickyAnchor) {
    const measure = debounce(() => {
      anchorTop = window.scrollY + stickyAnchor.getBoundingClientRect().top;
      inStickyZone = window.scrollY >= anchorTop;
      render();
    }, 50);
    const onScroll = throttle(() => {
      inStickyZone = anchorTop !== null && window.scrollY >= anchorTop;
      render();
    }, 50);
    measure();
    onScroll();
    cleanups.push(listen(window, "scroll", onScroll, { passive: true }));
    cleanups.push(listen(window, "resize", measure, { passive: true }));
    cleanups.push(() => {
      onScroll.cancel();
      measure.cancel();
    });
  }
  cleanups.push(onBreakpointChange(render));
  cleanups.push(mountHorizontalScrollContainers(container));
  render();
  return combine(cleanups);
}
