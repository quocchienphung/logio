"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ButtonArrow,
  ChevronDown,
  ChevronLeft,
  LinkArrow,
  SparkleIcon,
  StripeLogo,
} from "@/components/stripe/icons";
import { MegaMenuContent } from "./MegaMenu";
import { MENUS, type Menu } from "./menus";

type MenuId = Menu["id"];
type Status = "initial" | "open" | "close";

// Menus open on the first hover frame; the close delay alone keeps passing pointers from flickering them.
const OPEN_DELAY = 0;
const CLOSE_DELAY = 150;
const CLOSE_ANIM = 300; // --navigation-duration-slow
const MOBILE_QUERY = "(max-width: 939px)";

/**
 * Site header. Markup, class names and data-status/aria attributes mirror the reference
 * (Base UI NavigationMenu) so the partitioned stylesheet drives all visuals/transitions.
 *
 * Desktop: the horizontal list lives in the header; hovering a trigger opens a portaled popup with
 * the mega-menu content ([data-activation-direction] slides between menus).
 * Mobile (≤939px): the hamburger opens the same popup, which then hosts the vertical list, the
 * Start now / Contact sales footer, and a stacked second `__content` for the chosen submenu.
 */
export function Navigation() {
  const pathname = usePathname();
  return <NavigationMenu key={pathname} />;
}

function NavigationMenu() {
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState<MenuId | null>(null);
  const [leaving, setLeaving] = useState<MenuId | null>(null);
  const [popupStatus, setPopupStatus] = useState<Status | null>(null);
  const [direction, setDirection] = useState<
    "following" | "preceding" | undefined
  >();
  const [popupHeight, setPopupHeight] = useState<number | undefined>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState<MenuId | null>(null);
  const timers = useRef<{
    open?: number;
    close?: number;
    unmount?: number;
    leave?: number;
  }>({});
  const navRef = useRef<HTMLElement>(null);
  const restoringFocus = useRef(false);
  const contentRefs = useRef<Partial<Record<MenuId, HTMLDivElement | null>>>(
    {},
  );
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0, avail: 0 });
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  const reset = useCallback(() => {
    Object.values(timers.current).forEach((id) => window.clearTimeout(id));
    Object.keys(timers.current).forEach((key) => {
      timers.current[key as keyof typeof timers.current] = undefined;
    });
    setActive(null);
    setLeaving(null);
    setPopupStatus(null);
    setPopupHeight(undefined);
    setDirection(undefined);
    setMobileOpen(false);
    setMobileSub(null);
  }, []);

  // Portal host + breakpoint subscription (initial values are derived in the same microtask so the
  // first client paint already knows the breakpoint).
  useEffect(() => {
    const host = document.createElement("div");
    host.dataset.navigationPortal = "";
    document.body.appendChild(host);
    const mq = window.matchMedia(MOBILE_QUERY);
    let disposed = false;
    const sync = () => {
      reset();
      setMobile(mq.matches);
    };
    queueMicrotask(() => {
      if (disposed) return;
      setPortalHost(host);
      sync();
    });
    mq.addEventListener("change", sync);
    return () => {
      disposed = true;
      host.remove();
      mq.removeEventListener("change", sync);
    };
  }, [reset]);

  const clear = (k: keyof typeof timers.current) => {
    if (timers.current[k]) window.clearTimeout(timers.current[k]);
    timers.current[k] = undefined;
  };

  const measureAnchor = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (window.matchMedia(MOBILE_QUERY).matches) {
      const header = el.closest("header")!.getBoundingClientRect();
      setAnchor({
        x: 0,
        y: header.height,
        w: window.innerWidth,
        h: header.height,
        avail: window.innerHeight - header.height,
      });
    } else {
      setAnchor({
        x: r.left + window.scrollX,
        y: r.bottom + window.scrollY,
        w: r.width,
        h: r.height,
        avail: window.innerHeight - (r.top + r.height),
      });
    }
  }, []);

  const open = useCallback(
    (id: MenuId) => {
      clear("open");
      clear("close");
      clear("unmount");
      if (active && active !== id) {
        const order = MENUS.map((m) => m.id);
        setDirection(
          order.indexOf(id) > order.indexOf(active) ? "following" : "preceding",
        );
        setLeaving(active);
        clear("leave");
        timers.current.leave = window.setTimeout(() => setLeaving(null), 500);
      } else {
        setDirection(undefined);
      }
      setActive(id);
      measureAnchor();
      setPopupStatus((s) => (s === "open" ? s : "initial"));
    },
    [active, measureAnchor],
  );

  const scheduleOpen = (id: MenuId) => {
    if (mobile) return;
    clear("open");
    if (OPEN_DELAY === 0) open(id);
    else timers.current.open = window.setTimeout(() => open(id), OPEN_DELAY);
  };

  const close = useCallback(() => {
    clear("open");
    clear("close");
    setPopupStatus((s) => (s ? "close" : s));
    clear("unmount");
    timers.current.unmount = window.setTimeout(() => {
      setPopupStatus(null);
      setActive(null);
      setLeaving(null);
      setPopupHeight(undefined);
    }, CLOSE_ANIM);
  }, []);

  const scheduleClose = () => {
    if (mobile) return;
    clear("open");
    clear("close");
    timers.current.close = window.setTimeout(close, CLOSE_DELAY);
  };

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileSub(null);
    close();
  }, [close]);

  const toggleMobile = () => {
    if (mobileOpen) {
      closeMobile();
      return;
    }
    // A mobile close hides the drawer immediately, while its desktop transition timer can still
    // be pending. Cancel it before reopening so it cannot unmount the newly opened drawer.
    reset();
    measureAnchor();
    setMobileOpen(true);
    setPopupStatus("initial");
  };

  // initial → open on the next frame so the open transition starts from the initial styles
  useLayoutEffect(() => {
    if (popupStatus !== "initial") return;
    const raf = requestAnimationFrame(() => setPopupStatus("open"));
    return () => cancelAnimationFrame(raf);
  }, [popupStatus]);

  // animate popup height between desktop menus
  useLayoutEffect(() => {
    if (!active || mobile) return;
    const el = contentRefs.current[active];
    if (!el) return;
    const measure = () => setPopupHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, popupStatus, mobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mobileOpen) {
        closeMobile();
        navRef.current?.querySelector<HTMLButtonElement>(".navigation-hamburger-button")?.focus();
      } else if (active) {
        close();
        restoringFocus.current = true;
        navRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="navigation-popup-${active}"]`)?.focus();
        restoringFocus.current = false;
      }
    };
    const outside = (e: Event) => {
      if (!(e.target instanceof Node)) return;
      if (!navRef.current?.contains(e.target) && !portalHost?.contains(e.target)) closeMobile();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measureAnchor);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measureAnchor);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [active, close, closeMobile, measureAnchor, mobileOpen, portalHost, reset]);

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [mobileOpen]);

  // leaving mobile while the drawer is open closes it
  useEffect(() => {
    if (!mobile && mobileOpen) queueMicrotask(closeMobile);
  }, [mobile, mobileOpen, closeMobile]);

  const isOpen = popupStatus === "open" || popupStatus === "initial";
  const contentStatus = (id: MenuId): Status =>
    id === active ? (popupStatus === "close" ? "close" : "open") : "close";

  const menuList = (
    <div
      className="hds-navigation-menu__content navigation-menu-content"
      data-status={mobile ? (mobileOpen ? "open" : "unmounted") : "unmounted"}
    >
      <ul
        className={`hds-navigation-menu__list navigation-menu-list hds-navigation-menu__list--${mobile ? "vertical" : "horizontal"}`}
      >
        {MENUS.map((m) => (
          <li
            key={m.id}
            className="hds-navigation-menu__item navigation-item"
            value={m.id}
            data-testid={`header-${m.id}-nav-item`}
          >
            <button
              type="button"
              className="hds-button hds-navigation-menu__trigger hds-button--transparent"
              aria-expanded={
                mobile ? mobileSub === m.id : active === m.id && isOpen
              }
              aria-controls={`navigation-popup-${m.id}`}
              data-active={active === m.id ? "" : undefined}
              onMouseEnter={() => scheduleOpen(m.id)}
              onFocus={(e) => {
                if (!mobile && !restoringFocus.current && e.currentTarget.matches(":focus-visible")) open(m.id);
              }}
              onClick={() => {
                if (mobile) setMobileSub(m.id);
                else if (active === m.id && isOpen) close();
                else open(m.id);
              }}
            >
              {m.label}
              <ChevronDown />
            </button>
          </li>
        ))}
        <li className="hds-navigation-menu__item navigation-item">
          <a
            className="hds-button hds-navigation-menu__trigger hds-button--transparent"
            href="/pricing"
            onMouseEnter={scheduleClose}
          >
            Pricing
          </a>
        </li>
        <li className="hds-navigation-menu__item navigation-item navigation-item--desktop-only navigation-item--guide-me">
          <a
            className="hds-button hds-navigation-menu__trigger hds-button--transparent"
            href="/personalize"
            onMouseEnter={scheduleClose}
          >
            <SparkleIcon />
            Guide me
          </a>
        </li>
        <li className="hds-navigation-menu__item navigation-item navigation-item__sign-in--mobile">
          <a
            className="hds-button hds-navigation-menu__trigger hds-button--transparent"
            href="/login"
          >
            Sign in
          </a>
        </li>
      </ul>
      <div className="navigation__personalize-callout--mobile">
        <span
          className="hds-text hds-text--sm hds-text--subdued"
          id="navigation-personalize-mobile"
        >
          <strong className="hds-text hds-text--sm hds-text--emphasized">
            Company CRM
          </strong>{" "}
          Manage companies, explore your pipeline and organize your sales workspace.
        </span>
        <a
          className="hds-link hds-link--callout"
          href="/personalize"
          aria-describedby="navigation-personalize-mobile"
          aria-label="Guide me"
        >
          <SparkleIcon /> Guide me
          <LinkArrow />
        </a>
      </div>
    </div>
  );

  const overflow = (
    <div
      className="navigation-menu-overflow"
      data-status={mobileOpen ? "open" : "unmounted"}
    >
      <section className="navigation-menu-footer">
        <div className="hds-button-group">
          <a
            className="hds-button hds-button--primary"
            href="/signup"
          >
            Start now
            <ButtonArrow />
          </a>
          <a
            className="hds-button hds-button--secondary-on-quiet"
            href="/contact/sales"
          >
            Contact sales
          </a>
        </div>
      </section>
      <section className="navigation-menu-header">
        <button
          type="button"
          className="hds-button navigation-back-button hds-button--transparent"
          onClick={() => setMobileSub(null)}
        >
          <ChevronLeft />
          Back
        </button>
      </section>
    </div>
  );

  const popupVisible = mobile ? mobileOpen && popupStatus : popupStatus;

  return (
    <header className="hds-color-mode navigation section section--white hds-mode--light">
      <div className="section-container navigation__layout">
        <nav
          ref={navRef}
          className={`hds-navigation-menu navigation-menu navigation-menu--homepage${isOpen ? " hds-navigation-menu--open" : ""}`}
          id="navigation-menu"
          onMouseLeave={scheduleClose}
        >
          <Link
            className="hds-link navigation-menu-home-link"
            href="/"
            aria-label="Stripe homepage"
          >
            <StripeLogo />
          </Link>
          {!mobile ? menuList : null}
          {!mobile ? overflow : null}
          <button
            type="button"
            className="hds-ui-button hds-navigation-menu__trigger navigation-hamburger-button navigation-hamburger-button--homepage hds-ui-button--quiet"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={toggleMobile}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                className="navigation-hamburger__background"
                x="0"
                y="0"
                width="100"
                height="100"
                fill="var(--hds-color-button-secondary-bg)"
              />
              <rect
                className="navigation-hamburger__line line-1"
                width="40"
                height="5"
                x="30"
                y="38"
              />
              <rect
                className="navigation-hamburger__line line-2"
                width="40"
                height="5"
                x="30"
                y="48"
              />
              <rect
                className="navigation-hamburger__line line-3"
                width="40"
                height="5"
                x="30"
                y="48"
              />
              <rect
                className="navigation-hamburger__line line-4"
                width="40"
                height="5"
                x="30"
                y="58"
              />
            </svg>
          </button>
          <ul className="navigation-buttons">
            <li className="hds-navigation-menu__item navigation-item">
              <a
                className="hds-button navigation-cta-button navigation-item__sign-in hds-button--secondary-on-quiet hds-button--compact"
                href="/login"
                aria-label="Sign in"
                onMouseEnter={scheduleClose}
              >
                {/* The label is cut out of a white overlay so the hero ribbon shows through the letters (darkened so
                    the monochrome ribbon reads as a dark-grey label rather than a disabled one). */}
                <svg
                  className="navigation-item__sign-in__mask"
                  aria-hidden="true"
                >
                  <defs>
                    <mask id="navigation-sign-in-cutout">
                      <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="white"
                      />
                      <text
                        x="50%"
                        y="50%"
                        dy="-0.5"
                        dominantBaseline="central"
                        textAnchor="middle"
                        fontSize="1em"
                        fill="black"
                      >
                        Sign in
                      </text>
                    </mask>
                  </defs>
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="var(--hds-color-text-solid)"
                    opacity="0.62"
                  />
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="var(--hds-color-surface-bg-quiet)"
                    mask="url(#navigation-sign-in-cutout)"
                  />
                </svg>
                <span className="navigation-button-measure">Sign in</span>
              </a>
            </li>
            <li className="hds-navigation-menu__item navigation-item">
              <a
                className="hds-button navigation-cta-button navigation-item__contact-sales hds-button--primary hds-button--compact"
                href="/contact/sales"
                onMouseEnter={scheduleClose}
              >
                Contact sales
                <ButtonArrow />
              </a>
            </li>
          </ul>
        </nav>
        <div
          className={`navigation-menu__background${mobileOpen ? " navigation-menu__background--mobile-visible" : ""}`}
        />
      </div>

      {popupVisible && portalHost
        ? createPortal(
            <>
              <div
                className="hds-navigation-menu__overlay"
                data-status={popupStatus === "close" ? "close" : "open"}
                onMouseEnter={scheduleClose}
              />
              <div
                className="hds-navigation-menu__positioner"
                onClickCapture={(e) => {
                  if (e.target instanceof Element && e.target.closest("a[href]") && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) reset();
                }}
                style={{
                  "--position-x": `${anchor.x}px`,
                  "--position-y": `${anchor.y}px`,
                  "--available-width": `${anchor.w}px`,
                  "--available-height": `${anchor.avail}px`,
                  "--anchor-width": `${anchor.w}px`,
                  "--anchor-height": `${anchor.h}px`,
                  "--root-height": `${anchor.h}px`,
                  "--root-width": `${anchor.w}px`,
                }}
                onMouseEnter={() => !mobile && clear("close")}
                onMouseLeave={scheduleClose}
              >
                <nav
                  className="hds-navigation-menu__popup"
                  data-status={popupStatus ?? undefined}
                  data-activation-direction={mobile ? undefined : direction}
                  id={
                    active
                      ? `navigation-popup-${active}`
                      : "navigation-popup-mobile"
                  }
                  style={{
                    "--hds-navigation-menu-popup-height":
                      !mobile && popupHeight ? `${popupHeight}px` : "auto",
                  }}
                >
                  <div className="hds-navigation-menu__viewport">
                    {mobile ? (
                      <>
                        {menuList}
                        {overflow}
                        {mobileSub ? (
                          <div
                            className="hds-navigation-menu__content"
                            data-status="open"
                          >
                            <MegaMenuContent
                              menu={MENUS.find((m) => m.id === mobileSub)!}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      MENUS.filter(
                        (m) => m.id === active || m.id === leaving,
                      ).map((m) => (
                        <div
                          key={m.id}
                          ref={(el) => {
                            contentRefs.current[m.id] = el;
                          }}
                          className="hds-navigation-menu__content"
                          data-status={contentStatus(m.id)}
                        >
                          <MegaMenuContent menu={m} />
                        </div>
                      ))
                    )}
                  </div>
                </nav>
              </div>
            </>,
            portalHost,
          )
        : null}
    </header>
  );
}
