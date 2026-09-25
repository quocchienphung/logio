// Product hero sub-navigation (reference modules 91353 ProductHeroSubnav + 22744 HeroSubnav):
//  - static desktop nav, mobile static nav (toggle), and a client-only sticky nav portalled to <body>
//    that slides in once the page scrolls past the manifesto section (the reference stickyAnchorRef);
//  - the "Pricing" dropdown: 30 ms hover intent on fine pointers, click toggle, outside press, Escape,
//    arrow-key roving, pointer "safe zone" between trigger and drawer, viewport clamping (16 px), and
//    on desktop the sticky nav hosts the drawer in its drawer slot.

import { breakpoint, debounce, Disposer, listen, onBreakpointChange, throttle, type Cleanup } from "./env";

const SHIFT_VAR = "--hero-subnav-dropdown-item-shift";
const HOVER_DELAY = 30; // from source: setTimeout(..., 30)
const VIEWPORT_MARGIN = 16; // from source: Math.max(16 - left, ...)

const hoverNone = () => window.matchMedia("(hover: none)").matches;
const isMouse = (e: PointerEvent) => e.pointerType === "mouse" && !hoverNone();

type Rect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;
const inRect = (r: Rect, x: number, y: number) => r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
/** Pointer "safe zone": inside the trigger, or in the corridor between trigger bottom and drawer bottom. */
const inSafeZone = (x: number, y: number, trig: Rect, drawer: Rect) =>
  inRect(trig, x, y) ||
  (drawer.height > 0 && x >= Math.min(trig.left, drawer.left) && x <= Math.max(trig.right, drawer.right) && y >= trig.bottom && y <= drawer.bottom);

interface DropdownHost {
  /** Reference context M: whether the nav hosting the dropdown is interactive. */
  active: () => boolean;
  /** Reference context S: drawer slot on desktop sticky nav (drawer is portalled there). */
  slot: () => HTMLElement | null;
}

interface DropdownApi {
  close: () => void;
  sync: () => void;
  dispose: Cleanup;
}

function mountDropdown(li: HTMLElement, host: DropdownHost): DropdownApi {
  const d = new Disposer();
  const trigger = li.querySelector<HTMLButtonElement>(".hero-subnav-dropdown-item__trigger");
  const drawer = li.querySelector<HTMLElement>(".hero-subnav-dropdown-item__drawer");
  const list = drawer?.querySelector<HTMLElement>(".hero-subnav-dropdown-item__list") ?? null;
  if (!trigger || !drawer || !list) return { close: () => {}, sync: () => {}, dispose: () => {} };
  let open = false;
  let timer: number | undefined;
  let pointerInside = false;
  let docCleanup: Disposer | null = null;
  let portalled = false;

  const contains = (n: EventTarget | null) => n instanceof Node && (li.contains(n) || drawer.contains(n));
  const links = () => Array.from(list.querySelectorAll<HTMLAnchorElement>("a"));
  const clearTimer = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };
  const focusInside = () => {
    if (list.contains(document.activeElement)) return true;
    if (document.activeElement !== trigger) return false;
    try {
      return trigger.matches(":focus-visible");
    } catch {
      return false;
    }
  };

  const placeDrawer = () => {
    const desktop = breakpoint() === "desktop";
    const slot = desktop ? host.slot() : null;
    if (slot && drawer.parentElement !== slot) {
      slot.appendChild(drawer);
      portalled = true;
    } else if (!slot && drawer.parentElement !== li) {
      li.appendChild(drawer);
      portalled = false;
    }
  };

  const clampShift = () => {
    list.style.removeProperty(SHIFT_VAR);
    const { left, right } = list.getBoundingClientRect();
    const shift = Math.max(VIEWPORT_MARGIN - left, Math.min(0, document.documentElement.clientWidth - VIEWPORT_MARGIN - right));
    if (shift !== 0) list.style.setProperty(SHIFT_VAR, `${shift}px`);
  };

  const render = () => {
    trigger.setAttribute("aria-expanded", String(open));
    drawer.classList.toggle("hero-subnav-dropdown-item__drawer--open", open);
    if (open) {
      list.removeAttribute("hidden");
      list.removeAttribute("inert");
    } else {
      list.setAttribute("hidden", "");
      list.setAttribute("inert", "");
    }
  };

  const bindOpen = () => {
    docCleanup?.run();
    docCleanup = new Disposer();
    const desktop = breakpoint() === "desktop";
    if (desktop && !portalled) {
      clampShift();
      docCleanup.add(listen(window, "resize", clampShift));
    }
    let trigRect: Rect | undefined;
    let drawerRect: Rect | undefined;
    const reset = () => {
      trigRect = undefined;
      drawerRect = undefined;
    };
    docCleanup.add(
      listen<PointerEvent>(document, "pointerdown", (e) => {
        if (!contains(e.target)) setOpen(false);
      }),
    );
    docCleanup.add(
      listen<KeyboardEvent>(document, "keydown", (e) => {
        if (e.key !== "Escape") return;
        const had = contains(document.activeElement);
        setOpen(false);
        if (had) trigger.focus();
      }),
    );
    if (desktop) {
      docCleanup.add(
        listen<PointerEvent>(
          document,
          "pointermove",
          (e) => {
            if (!isMouse(e)) return;
            if (contains(e.target)) {
              clearTimer();
              return;
            }
            trigRect ??= li.getBoundingClientRect();
            drawerRect ??= list.getBoundingClientRect();
            if (inSafeZone(e.clientX, e.clientY, trigRect, drawerRect)) clearTimer();
            else if (timer === undefined) intent(false);
          },
          { passive: true },
        ),
      );
      docCleanup.add(listen(document, "scroll", reset, { capture: true, passive: true }));
      docCleanup.add(listen(window, "resize", reset, { passive: true }));
      const ro = new ResizeObserver(reset);
      ro.observe(li);
      ro.observe(list);
      docCleanup.add(() => ro.disconnect());
    }
    if (portalled) {
      docCleanup.add(
        listen(
          document,
          "scroll",
          (e) => {
            if (e.target instanceof Node && e.target.contains(trigger)) setOpen(false);
          },
          true,
        ),
      );
    }
  };

  const setOpen = (v: boolean) => {
    clearTimer();
    if (open === v) return;
    open = v;
    render();
    if (open) bindOpen();
    else {
      docCleanup?.run();
      docCleanup = null;
      list.style.removeProperty(SHIFT_VAR);
    }
  };

  const intent = (v: boolean) => {
    clearTimer();
    if (!v && focusInside()) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      if (!v && focusInside()) return;
      setOpen(v);
    }, HOVER_DELAY);
  };

  const onEnter = (e: PointerEvent) => {
    pointerInside = true;
    if (breakpoint() === "desktop" && isMouse(e)) intent(true);
  };
  const onLeave = (e: PointerEvent) => {
    pointerInside = false;
    if (breakpoint() === "desktop" && isMouse(e)) intent(false);
  };
  d.add(listen(li, "pointerenter", onEnter));
  d.add(listen(li, "pointerleave", onLeave));
  d.add(
    listen<PointerEvent>(drawer, "pointerenter", (e) => {
      if (portalled) onEnter(e);
    }),
  );
  d.add(
    listen<PointerEvent>(drawer, "pointerleave", (e) => {
      if (portalled) onLeave(e);
    }),
  );
  d.add(
    listen<FocusEvent>(li, "focusout", (e) => {
      if (!pointerInside && !contains(e.relatedTarget)) setOpen(false);
    }),
  );

  const dir = (key: string) => (key === "ArrowDown" || key === "ArrowRight" ? 1 : key === "ArrowUp" || key === "ArrowLeft" ? -1 : 0);
  const rove = (e: KeyboardEvent, step: number) => {
    const active = document.activeElement;
    if (active === trigger) {
      e.preventDefault();
      if (open && step === 1) {
        links()[0]?.focus();
        return;
      }
      const nav = trigger.closest("nav");
      const triggers = nav ? Array.from(nav.querySelectorAll<HTMLElement>(".hero-subnav-dropdown-item__trigger")) : [];
      triggers[triggers.indexOf(trigger) + step]?.focus();
      return;
    }
    const ls = links();
    const i = ls.indexOf(active as HTMLAnchorElement);
    if (i !== -1) {
      e.preventDefault();
      ls[i + step]?.focus();
    }
  };
  const focusAfterTrigger = () => {
    const nav = trigger.closest("nav");
    if (!nav) return;
    const all = Array.from(nav.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (n) => !list.contains(n),
    );
    for (const n of all.slice(all.indexOf(trigger) + 1)) {
      n.focus();
      if (document.activeElement === n) return;
    }
    trigger.focus();
  };

  d.add(
    listen(trigger, "click", () => {
      clearTimer();
      setOpen(!open);
    }),
  );
  d.add(
    listen<KeyboardEvent>(trigger, "keydown", (e) => {
      const step = dir(e.key);
      if (step !== 0) {
        rove(e, step);
        return;
      }
      const first = links()[0];
      if (portalled && open && e.key === "Tab" && !e.shiftKey && first) {
        e.preventDefault();
        first.focus();
      }
    }),
  );
  d.add(
    listen<MouseEvent>(list, "click", (e) => {
      if (e.target instanceof Element && e.target.closest("a")) setOpen(false);
    }),
  );
  d.add(
    listen<KeyboardEvent>(list, "keydown", (e) => {
      const step = dir(e.key);
      if (step !== 0) {
        rove(e, step);
        return;
      }
      if (!portalled || e.key !== "Tab") return;
      const ls = links();
      if (e.shiftKey) {
        if (document.activeElement === ls[0]) {
          e.preventDefault();
          trigger.focus();
        }
        return;
      }
      if (document.activeElement === ls[ls.length - 1]) {
        e.preventDefault();
        setOpen(false);
        focusAfterTrigger();
      }
    }),
  );

  placeDrawer();
  render();
  return {
    close: () => setOpen(false),
    sync: () => {
      if (!host.active()) setOpen(false);
      const wasPortalled = portalled;
      placeDrawer();
      if (open && wasPortalled !== portalled) bindOpen();
    },
    dispose: () => {
      clearTimer();
      docCleanup?.run();
      if (drawer.parentElement !== li) li.appendChild(drawer);
      d.run();
    },
  };
}

function crossToggleButton(): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "hds-ui-button hero-subnav__mobile-toggle-button hds-ui-button--quiet hds-ui-button--small";
  b.setAttribute("aria-label", "Toggle navigation menu");
  b.setAttribute("aria-expanded", "false");
  b.innerHTML =
    '<svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="cross-toggle-icon">' +
    '<path class="cross-toggle-icon__vertical" d="M0 3.656h9V4.97H0z"></path>' +
    '<path class="cross-toggle-icon__horizontal" d="M4.972 0v9H3.66V0z"></path></svg>';
  return b;
}

/** Re-ids a cloned subtree so ids / aria references stay unique. */
function reId(tree: HTMLElement, suffix: string) {
  const map = new Map<string, string>();
  tree.querySelectorAll<HTMLElement>("[id]").forEach((n) => {
    const nid = `${n.id}${suffix}`;
    map.set(n.id, nid);
    n.id = nid;
  });
  tree.querySelectorAll<HTMLElement>("[aria-controls],[aria-labelledby]").forEach((n) => {
    for (const a of ["aria-controls", "aria-labelledby"]) {
      const v = n.getAttribute(a);
      if (v && map.has(v)) n.setAttribute(a, map.get(v)!);
    }
  });
  tree.querySelectorAll<SVGElement>("[clip-path]").forEach((n) => {
    const v = n.getAttribute("clip-path") ?? "";
    const m = /url\(#(.+)\)/.exec(v);
    if (m && map.has(m[1])) n.setAttribute("clip-path", `url(#${map.get(m[1])})`);
  });
}

/**
 * Wraps the page nav list in the reference HorizontalScrollableContainer (module 36967) — used by the
 * sticky nav on desktop (`dropdownEscapesScroll`). Adds `--scrollable` when content overflows
 * (ResizeObserver, 150 ms debounce in the reference).
 */
function makeScrollable(pageNav: HTMLElement): Cleanup {
  const ul = pageNav.querySelector<HTMLElement>(":scope > .hero-subnav-items");
  if (!ul) return () => {};
  const inner = document.createElement("div");
  inner.className = "horizontal-scrollable-container__inner";
  pageNav.classList.remove("hero-subnav-page-nav--no-scroll");
  pageNav.classList.add("horizontal-scrollable-container");
  pageNav.insertBefore(inner, ul);
  inner.appendChild(ul);
  const check = debounce(() => {
    pageNav.classList.toggle("horizontal-scrollable-container--scrollable", inner.scrollWidth > inner.clientWidth);
  }, 150);
  const ro = new ResizeObserver(() => check());
  ro.observe(inner);
  check();
  return () => {
    ro.disconnect();
    check.cancel();
    pageNav.insertBefore(ul, inner);
    inner.remove();
    pageNav.classList.remove("horizontal-scrollable-container", "horizontal-scrollable-container--scrollable");
    pageNav.classList.add("hero-subnav-page-nav--no-scroll");
  };
}

/** Mounts the hero sub-navigation found in `root`. `anchor` is the reference stickyAnchorRef section. */
export function mountSubnav(root: HTMLElement, anchor: HTMLElement | null): Cleanup {
  const d = new Disposer();
  const wrap = root.querySelector<HTMLElement>(".product-hero-subnav");
  const staticNav = wrap?.querySelector<HTMLElement>(".hero-static-subnav") ?? null;
  const mobileNav = wrap?.querySelector<HTMLElement>(".hero-mobile-static-subnav") ?? null;
  if (!wrap || !staticNav || !mobileNav) return () => {};

  let stickyActive = false;
  let mobileOpen = false;
  let stickyOpen = false;
  const compact = () => breakpoint() !== "desktop";

  // --- mobile static nav ---
  const mobileToggle = mobileNav.querySelector<HTMLButtonElement>(".hero-subnav__mobile-toggle-button");
  const mobileContainer = mobileNav.querySelector<HTMLElement>(".hero-mobile-static-subnav__content-container");

  // --- sticky nav (client-only in the reference: createPortal(..., document.body)) ---
  const sticky = document.createElement("div");
  sticky.className = "hero-sticky-subnav";
  sticky.setAttribute("aria-hidden", "true");
  const stickyNav = document.createElement("nav");
  stickyNav.className = "hero-subnav hero-subnav--sticky";
  stickyNav.setAttribute("aria-label", staticNav.getAttribute("aria-label") ?? "");
  const title = document.createElement("span");
  title.className = "hero-subnav__title";
  const titleSrc = staticNav.querySelector(".product-hero-subnav__title");
  if (titleSrc) title.appendChild(titleSrc.cloneNode(true));
  const container = document.createElement("div");
  container.className = "hero-subnav__content-container";
  const clip = document.createElement("div");
  clip.className = "hero-subnav__content-clip";
  const content = document.createElement("div");
  content.className = "hero-subnav__content";
  const mobileContent = mobileNav.querySelector<HTMLElement>(".hero-mobile-static-subnav__content");
  if (mobileContent) for (const c of Array.from(mobileContent.children)) content.appendChild(c.cloneNode(true));
  reId(content, "-sticky");
  clip.appendChild(content);
  container.appendChild(clip);
  const slot = document.createElement("div");
  slot.className = "hero-subnav__drawer-slot";
  const stickyToggle = crossToggleButton();
  const backdrop = document.createElement("div");
  backdrop.className = "hero-sticky-subnav__mobile-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  stickyNav.append(title, container, slot, stickyToggle);
  sticky.append(stickyNav, backdrop);
  // Carry the section's colour-mode classes so HDS tokens resolve the same way outside <main>.
  const modeHost = wrap.closest(".hds-color-mode");
  if (modeHost) sticky.classList.add(...Array.from(modeHost.classList).filter((c) => c.startsWith("hds-mode--") || c === "hds-color-mode"));
  document.body.appendChild(sticky);
  d.add(() => sticky.remove());

  const stickyPageNav = content.querySelector<HTMLElement>(":scope > .hero-subnav-page-nav");
  let unscroll: Cleanup | null = null;
  const syncScrollable = () => {
    const want = breakpoint() === "desktop";
    if (want && !unscroll && stickyPageNav) unscroll = makeScrollable(stickyPageNav);
    else if (!want && unscroll) {
      unscroll();
      unscroll = null;
    }
  };
  syncScrollable();
  d.add(() => unscroll?.());

  // --- dropdowns ---
  const dropdowns: DropdownApi[] = [];
  const addDropdowns = (scope: HTMLElement, host: DropdownHost) => {
    scope.querySelectorAll<HTMLElement>(".hero-subnav-dropdown-item").forEach((li) => dropdowns.push(mountDropdown(li, host)));
  };
  addDropdowns(staticNav, { active: () => true, slot: () => null });
  addDropdowns(mobileNav, { active: () => mobileOpen, slot: () => null });
  addDropdowns(content, { active: () => stickyActive && !(compact() && !stickyOpen), slot: () => slot });
  d.add(() => dropdowns.forEach((x) => x.dispose()));

  const render = () => {
    const hidden = compact() ? stickyActive && !mobileOpen : stickyActive;
    staticNav.setAttribute("aria-hidden", String(hidden));
    mobileNav.setAttribute("aria-hidden", String(hidden));
    mobileNav.classList.toggle("hero-mobile-static-subnav--open", mobileOpen);
    mobileToggle?.classList.toggle("hero-subnav__mobile-toggle-button--open", mobileOpen);
    mobileToggle?.setAttribute("aria-expanded", String(mobileOpen));
    if (mobileContainer) {
      if (mobileOpen) mobileContainer.removeAttribute("inert");
      else mobileContainer.setAttribute("inert", "");
    }
    const visible = hidden;
    sticky.classList.toggle("hero-sticky-subnav--visible", visible);
    sticky.setAttribute("aria-hidden", String(!visible));
    if (visible) sticky.removeAttribute("inert");
    else sticky.setAttribute("inert", "");
    stickyNav.classList.toggle("hero-subnav--sticky-mobile-open", stickyOpen);
    stickyToggle.classList.toggle("hero-subnav__mobile-toggle-button--open", stickyOpen);
    stickyToggle.setAttribute("aria-expanded", String(stickyOpen));
    backdrop.classList.toggle("hero-sticky-subnav__mobile-backdrop--active", stickyOpen);
    if (compact() && !stickyOpen) container.setAttribute("inert", "");
    else container.removeAttribute("inert");
    dropdowns.forEach((x) => x.sync());
  };

  if (mobileToggle)
    d.add(
      listen(mobileToggle, "click", () => {
        mobileOpen = !mobileOpen;
        render();
      }),
    );
  d.add(
    listen(stickyToggle, "click", () => {
      stickyOpen = !stickyOpen;
      render();
    }),
  );
  d.add(
    listen(backdrop, "click", () => {
      stickyOpen = false;
      render();
    }),
  );
  d.add(
    listen<KeyboardEvent>(document, "keydown", (e) => {
      if (e.key === "Escape" && stickyOpen) {
        stickyOpen = false;
        render();
      }
    }),
  );

  // --- sticky zone (reference hook `p`: throttled scroll 50 ms, debounced resize 50 ms) ---
  let anchorTop: number | null = null;
  const setSticky = (v: boolean) => {
    if (v === stickyActive) return;
    stickyActive = v;
    if (!(compact() && stickyActive) && stickyOpen) stickyOpen = false;
    render();
  };
  if (anchor) {
    const measure = debounce(() => {
      anchorTop = window.scrollY + anchor.getBoundingClientRect().top;
      setSticky(window.scrollY >= anchorTop);
    }, 50);
    const onScroll = throttle(() => setSticky(anchorTop !== null && window.scrollY >= anchorTop), 50);
    anchorTop = window.scrollY + anchor.getBoundingClientRect().top;
    stickyActive = window.scrollY >= anchorTop;
    d.add(listen(window, "scroll", onScroll, { passive: true }));
    d.add(listen(window, "resize", measure, { passive: true }));
    d.add(() => {
      onScroll.cancel();
      measure.cancel();
    });
  }
  d.add(
    onBreakpointChange(() => {
      if (!(compact() && stickyActive)) stickyOpen = false;
      syncScrollable();
      render();
    }),
  );
  render();
  return () => d.run();
}
