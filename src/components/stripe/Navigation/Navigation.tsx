"use client";

import Link from "next/link";
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

const OPEN_DELAY = 100;
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
  const contentRefs = useRef<Partial<Record<MenuId, HTMLDivElement | null>>>(
    {},
  );
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0, avail: 0 });
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  // Portal host + breakpoint subscription (initial values are derived in the same microtask so the
  // first client paint already knows the breakpoint).
  useEffect(() => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(mq.matches);
    queueMicrotask(() => {
      setPortalHost(host);
      sync();
    });
    mq.addEventListener("change", sync);
    return () => {
      host.remove();
      mq.removeEventListener("change", sync);
    };
  }, []);

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
        x: r.left,
        y: r.top + r.height,
        w: r.width,
        h: r.height,
        avail: window.innerHeight - (r.top + r.height),
      });
    }
  }, []);

  const open = useCallback(
    (id: MenuId) => {
      clear("close");
      clear("unmount");
      setActive((prev) => {
        if (prev && prev !== id) {
          const order = MENUS.map((m) => m.id);
          setDirection(
            order.indexOf(id) > order.indexOf(prev) ? "following" : "preceding",
          );
          setLeaving(prev);
          clear("leave");
          timers.current.leave = window.setTimeout(() => setLeaving(null), 500);
        } else {
          setDirection(undefined);
        }
        return id;
      });
      measureAnchor();
      setPopupStatus((s) => (s === "open" ? s : "initial"));
    },
    [measureAnchor],
  );

  const scheduleOpen = (id: MenuId) => {
    if (mobile) return;
    clear("open");
    timers.current.open = window.setTimeout(() => open(id), OPEN_DELAY);
  };

  const close = useCallback(() => {
    clear("open");
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
    measureAnchor();
    setMobileOpen(true);
    setMobileSub(null);
    setPopupStatus("initial");
  };

  // initial → open on the next frame so the clip-path/opacity transitions run
  useLayoutEffect(() => {
    if (popupStatus !== "initial") return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPopupStatus("open")),
    );
    return () => cancelAnimationFrame(raf);
  }, [popupStatus]);

  // animate popup height between desktop menus
  useLayoutEffect(() => {
    if (!active || mobile) return;
    const el = contentRefs.current[active];
    if (el) setPopupHeight(el.offsetHeight);
  }, [active, popupStatus, mobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measureAnchor);
    const t = timers.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measureAnchor);
      Object.values(t).forEach((id) => id && window.clearTimeout(id));
    };
  }, [closeMobile, measureAnchor]);

  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
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
              onFocus={() => !mobile && open(m.id)}
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
            href="https://dashboard.stripe.com/login"
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
            Not sure where to start?
          </strong>{" "}
          Tell us about your business to get personalized Stripe product
          recommendations.
        </span>
        <a
          className="hds-link hds-link--callout"
          href="/personalize"
          aria-describedby="navigation-personalize-mobile"
        >
          Find what&apos;s right for you
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
            href="https://dashboard.stripe.com/register"
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
                href="https://dashboard.stripe.com/login"
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
