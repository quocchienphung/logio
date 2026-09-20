"use client";

import { useEffect, useRef, useState } from "react";
import { DataViz } from "./DataViz";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

export const TIME_OF_DAY_VALUES = [
  "pre-dawn",
  "sunrise",
  "daytime",
  "dusk",
  "sunset",
  "night",
] as const;
export type TimeOfDay = (typeof TIME_OF_DAY_VALUES)[number];

const LABELS: Record<TimeOfDay, string> = {
  "pre-dawn": "Pre-dawn",
  sunrise: "Sunrise",
  daytime: "Daytime",
  dusk: "Dusk",
  sunset: "Sunset",
  night: "Night",
};

/** Reference mapping (index chunk): local hour → theme. */
export function timeOfDayFor(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return "pre-dawn";
  if (hour >= 8 && hour < 11) return "sunrise";
  if (hour >= 11 && hour < 16) return "daytime";
  if (hour >= 16 && hour < 20) return "dusk";
  if (hour >= 20 && hour < 23) return "sunset";
  return "night";
}

const STATS = [
  {
    id: "payment-methods",
    value: "135+",
    description: "currencies and payment methods supported",
  },
  {
    id: "payments-volume",
    value: "$1.9T",
    description: "in payments volume processed in 2025",
  },
  {
    id: "historical-uptime",
    value: "99.999%",
    description: "historical uptime for Stripe services",
    link: { href: "https://status.stripe.com", text: "historical uptime" },
    rest: " for Stripe services",
  },
  {
    id: "active-subscriptions",
    value: "200M+",
    description: "active subscriptions managed on Stripe Billing",
  },
];

const MENU_HEIGHT = 183; // --stats-menu-height measured at 1440

/** "The backbone of global commerce" — time-of-day themed stats with the data-viz. */
export function Stats() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("daytime");
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noTransition, setNoTransition] = useState(true);
  const [desktop, setDesktop] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  // Reference: non-desktop viewports always render the night (dark) theme.
  const effectiveTimeOfDay: TimeOfDay = desktop ? timeOfDay : "night";
  const dark = effectiveTimeOfDay === "night";

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 940px)");
    const sync = () => setDesktop(mq.matches);
    // Deferred so the server-rendered (daytime) markup hydrates before the client theme applies.
    const init = window.setTimeout(() => {
      setTimeOfDay(timeOfDayFor(new Date().getHours()));
      sync();
    }, 0);
    const t = window.setTimeout(() => setNoTransition(false), 50);
    mq.addEventListener("change", sync);
    return () => {
      window.clearTimeout(init);
      window.clearTimeout(t);
      mq.removeEventListener("change", sync);
    };
  }, []);

  // Toggling to/from night gets a 1200ms "transitioning" state (text colours cross-fade).
  useEffect(() => {
    if (!transitioning) return;
    const t = window.setTimeout(() => setTransitioning(false), 1200);
    return () => window.clearTimeout(t);
  }, [transitioning, timeOfDay]);

  const changeTimeOfDay = (next: TimeOfDay) => {
    if ((timeOfDay === "night") !== (next === "night")) setTransitioning(true);
    setTimeOfDay(next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!controlsRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <section
      className={`hds-color-mode stats-section${dark ? " stats-section--dark" : ""}${transitioning ? " stats-section--transitioning" : ""} stats-section--time-${effectiveTimeOfDay} section ${dark ? "hds-mode--dark" : "section--white hds-mode--light"}`}
    >
      <span
        className="stats-section__border"
        aria-hidden="true"
        style={{ "--stats-menu-height": `${MENU_HEIGHT}px` }}
      >
        <span className="stats-section__border-inline-graphic" />
      </span>
      <span
        className="stats-section__active-indicator-container"
        aria-hidden="true"
        style={{
          "--active-stat-index": active,
          "--hover-indicator-index": hover ?? active,
          "--stats-menu-height": `${MENU_HEIGHT}px`,
        }}
      >
        <span className="stats-section__active-indicator-graphic">
          <span className="stats-section__active-indicator stats-section__active-indicator--top" />
          <span className="stats-section__active-indicator stats-section__active-indicator--bottom" />
        </span>
      </span>
      <div className="section-container stats-section__container">
        <div
          className="section-row section-row-gap"
          style={{
            "--section-row-gap-mb": "var(--hds-space-core-500)",
            "--section-row-gap-tb": "var(--hds-space-core-700)",
            "--section-row-gap-dt": "var(--hds-space-core-1000)",
          }}
        >
          <h2 className="hds-heading stats-section__title hds-heading--xxl">
            The backbone of&nbsp;global commerce
          </h2>
          <div className="stats-section__stats-list">
            {STATS.map((s) => (
              <div className="stats-list__stat" key={s.id}>
                <p className="hds-text stats-list__stat-value hds-text--xxl">
                  {s.value}
                </p>
                <p className="hds-text stats-list__stat-description hds-text--md">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
          <div className="stats-section__stats-menu">
            {STATS.map((s, i) => (
              <div className="stats-menu__stat-wrapper" key={s.id}>
                <button
                  type="button"
                  className={`stats-menu__stat${i === active ? " stats-menu__stat--active" : ""}`}
                  aria-labelledby={`stat-${s.id}-value`}
                  aria-describedby={`stat-${s.id}-description`}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <p
                    className="hds-text stats-menu__stat-value hds-text--xxl"
                    id={`stat-${s.id}-value`}
                  >
                    {s.value}
                  </p>
                </button>
                <span
                  className="hds-text stats-menu__stat-description hds-text--md"
                  id={`stat-${s.id}-description`}
                  aria-hidden={s.link ? undefined : true}
                >
                  {s.link ? (
                    <>
                      <a
                        className="hds-link stats-menu__stat-description__link hds-link--secondary"
                        href={s.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.link.text}
                      </a>
                      {s.rest}
                    </>
                  ) : (
                    s.description
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Reference mounts the controls + data-viz only once the (desktop-only) spacer is in view. */}
        <div className="stats-section__stats-spacer">
          {desktop ? (
            <div className="stats-section__controls" ref={controlsRef}>
              <button
                type="button"
                className="time-of-day-select__trigger"
                data-value={timeOfDay}
                aria-expanded={menuOpen}
                aria-label={`${LABELS[timeOfDay]}. Choose a time of day`}
                aria-haspopup="listbox"
                role="combobox"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <TimeOfDayIcon />
              </button>
              {menuOpen ? (
                <ul
                  className="time-of-day-select__menu"
                  role="listbox"
                  aria-label="Time of day"
                >
                  {TIME_OF_DAY_VALUES.map((t) => (
                    <li
                      key={t}
                      role="option"
                      aria-selected={t === timeOfDay}
                      className={`time-of-day-select__option${t === timeOfDay ? " time-of-day-select__option--selected" : ""}`}
                      onClick={() => {
                        changeTimeOfDay(t);
                        setMenuOpen(false);
                      }}
                    >
                      <span
                        className="time-of-day-select__option-icon"
                        data-value={t}
                      >
                        <TimeOfDayIcon />
                      </span>
                      {LABELS[t]}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {desktop ? (
            <DataViz
              activeIndex={active}
              timeOfDay={effectiveTimeOfDay}
              desktop={desktop}
            />
          ) : null}
        </div>
        <div className="stats-section__globe">
          <picture className="stats-section__globe-picture">
            <source
              type="image/webp"
              srcSet="/stripe/DatavizStatic3x-w768-1a465163.webp 1x, /stripe/DatavizStatic3x-w1536-821aa774.webp 2x"
            />
            <img
              loading="lazy"
              width="2304"
              height="900"
              alt=""
              src="/stripe/DatavizStatic3x-w768-0f1b035a.png"
            />
          </picture>
        </div>
      </div>
      <div className="section-background" aria-hidden="true">
        <div
          className={`stats-animation-gradient${noTransition ? " stats-animation-gradient--no-transition" : ""}`}
        >
          {TIME_OF_DAY_VALUES.map((t) => (
            <div
              key={t}
              className={`stats-animation-gradient__gradient stats-animation-gradient__gradient--${t}${t === timeOfDay ? " stats-animation-gradient__gradient--active" : ""}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
