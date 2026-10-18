"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { UsageMeter, type UsageCategory, type UsageDay, type UsageLimit, type UsageMeterLook } from "./UsageMeter";
import "./usage-meter.css";
import "./stage.css";

/*
 * The affectUI preview stage for the Usage Meter: the demo data and its one-time tour
 * (Last month → 7 days → This month), plus the stage's reset, theme and style switches.
 */

const PERIODS = [
  { id: "month", label: "This month" },
  { id: "last", label: "Last month" },
  { id: "7d", label: "7 days" },
];
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Seeded daily usage: weekends run at 45%, a gentle upward drift, and the rest of the period as stubs. */
function dailyUsage(start: Date, pastDays: number, sum: number, seed: number, length = pastDays): UsageDay[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const weights = Array.from({ length: pastDays }, (_, i) => {
    const weekday = addDays(start, i).getDay();
    return (weekday === 0 || weekday === 6 ? 0.45 : 1) * (0.7 + rand() * 0.6) * (1 + i / pastDays / 3);
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((w) => Math.round((w / weightSum) * sum));
  values[values.length - 1] += sum - values.reduce((a, b) => a + b, 0);
  return Array.from({ length }, (_, i) => ({ label: dateFormat.format(addDays(start, i)), value: i < pastDays ? values[i] : null }));
}

// Explicit colors keep each category's shade across periods (API stays c4 when Image drops out).
const c = (n: number) => `var(--ui-um-c${n})`;
const cc = (n: number) => `var(--ui-umc-c${n})`;
type Data = { used: [string, number, number][]; limits: UsageLimit[]; days: (today: Date) => UsageDay[] };
const DATA: Record<string, Data> = {
  month: {
    used: [["Chat", 3980, 1], ["Search", 1640, 2], ["Image", 1120, 3], ["API", 680, 4]],
    limits: [
      { label: "Seats", used: 8, total: 10 },
      { label: "Storage", used: 3.2, total: 5, unit: "GB" },
      { label: "Projects", used: 12, total: null },
    ],
    days: (t) => dailyUsage(addDays(t, -21), 22, 7420, 11, 30),
  },
  last: {
    used: [["Chat", 5210, 1], ["Search", 2140, 2], ["Image", 1690, 3], ["API", 960, 4]],
    limits: [
      { label: "Seats", used: 10, total: 10 },
      { label: "Storage", used: 2.9, total: 5, unit: "GB" },
      { label: "Projects", used: 11, total: null },
    ],
    days: (t) => dailyUsage(addDays(t, -51), 30, 10000, 29),
  },
  "7d": {
    used: [["Chat", 1260, 1], ["Search", 540, 2], ["API", 340, 4]],
    limits: [
      { label: "Seats", used: 8, total: 10 },
      { label: "Storage", used: 3.2, total: 5, unit: "GB" },
      { label: "Projects", used: 12, total: null },
    ],
    days: (t) => dailyUsage(addDays(t, -6), 7, 2140, 5),
  },
};

function resetCopy(today: Date) {
  const at = addDays(today, 9);
  const days = Math.round((at.getTime() - today.getTime()) / 864e5);
  return {
    at,
    label: days <= 0 ? "Resets today" : days === 1 ? "Resets tomorrow" : `Resets in ${days} days`,
    title: `Resets on ${dateFormat.format(at)}`,
  };
}

function UsageDemo({ look, today }: { look: UsageMeterLook; today: Date }) {
  const [period, setPeriod] = useState("month");
  const touched = useRef(false);
  const data = DATA[period];
  const daily = useMemo(() => DATA[period].days(today), [period, today]);
  const used: UsageCategory[] = data.used.map(([label, value, n]) => ({ label, value, color: look === "clean" ? cc(n) : c(n) }));
  const reset = resetCopy(today);

  // The preview tours the periods once; any pointer or key input hands control to the visitor.
  useEffect(() => {
    const timers = ["last", "7d", "month"].map((id, i) =>
      window.setTimeout(() => !touched.current && setPeriod(id), 3600 + i * 3200),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="usage-demo" onPointerDown={() => (touched.current = true)} onKeyDown={() => (touched.current = true)}>
      <UsageMeter
        look={look}
        title="Acme AI"
        plan="Pro plan"
        total={10000}
        used={used}
        limits={data.limits}
        daily={daily}
        periods={PERIODS}
        period={period}
        onPeriodChange={setPeriod}
        resetAt={reset.at}
        resetLabel={reset.label}
        resetTitle={reset.title}
        onUpgrade={() => {}}
      />
    </div>
  );
}

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3.20455C7.1424 3.20455 3.20455 7.1424 3.20455 12C3.20455 16.8576 7.1424 20.7955 12 20.7955C16.8576 20.7955 20.7955 16.8576 20.7955 12C20.7955 11.4603 21.233 11.0227 21.7727 11.0227C22.3125 11.0227 22.75 11.4603 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C14.1254 1.25 16.1072 1.86735 17.7751 2.93159L19 1.70668C19.173 1.43228 19.4788 1.25 19.8272 1.25C20.367 1.25 20.8045 1.68754 20.8045 2.22727V5.28828C20.8045 6.48198 19.3213 7.02646 18.548 6.12763C16.9364 4.33189 14.6005 3.20455 12 3.20455Z"
      fill="currentColor"
    />
  </svg>
);
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17.5 12C17.5 15.0376 15.0376 17.5 12 17.5C8.96243 17.5 6.5 15.0376 6.5 12C6.5 8.96243 8.96243 6.5 12 6.5C15.0376 6.5 17.5 8.96243 17.5 12Z" fill="currentColor" />
    <path
      d="M12 1C12.5523 1 13 1.44772 13 2V3.5C13 4.05228 12.5523 4.5 12 4.5C11.4477 4.5 11 4.05228 11 3.5V2C11 1.44772 11.4477 1 12 1ZM4.22149 4.22149C4.61202 3.83097 5.24518 3.83097 5.6357 4.22149L6.69636 5.28215C7.08689 5.67268 7.08689 6.30584 6.69636 6.69636C6.30584 7.08689 5.67268 7.08689 5.28215 6.69636L4.22149 5.6357C3.83097 5.24518 3.83097 4.61201 4.22149 4.22149ZM19.7784 4.2216C20.1689 4.61213 20.1689 5.24529 19.7784 5.63582L18.7177 6.69648C18.3272 7.087 17.694 7.087 17.3035 6.69648C16.913 6.30595 16.913 5.67279 17.3035 5.28226L18.3642 4.2216C18.7547 3.83108 19.3879 3.83108 19.7784 4.2216ZM1 12C1 11.4477 1.44772 11 2 11H3.5C4.05228 11 4.5 11.4477 4.5 12C4.5 12.5523 4.05228 13 3.5 13H2C1.44772 13 1 12.5523 1 12ZM19.5 12C19.5 11.4477 19.9477 11 20.5 11H22C22.5523 11 23 11.4477 23 12C23 12.5523 22.5523 13 22 13H20.5C19.9477 13 19.5 12.5523 19.5 12ZM17.303 17.3035C17.6936 16.913 18.3267 16.913 18.7172 17.3035L19.7779 18.3642C20.1684 18.7547 20.1684 19.3879 19.7779 19.7784C19.3874 20.1689 18.7542 20.1689 18.3637 19.7784L17.303 18.7177C16.9125 18.3272 16.9125 17.694 17.303 17.3035ZM6.69685 17.3036C7.08738 17.6942 7.08738 18.3273 6.69685 18.7178L5.63619 19.7785C5.24567 20.169 4.6125 20.169 4.22198 19.7785C3.83145 19.388 3.83145 18.7548 4.22198 18.3643L5.28264 17.3036C5.67316 16.9131 6.30633 16.9131 6.69685 17.3036ZM12 19.5C12.5523 19.5 13 19.9477 13 20.5V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V20.5C11 19.9477 11.4477 19.5 12 19.5Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10.5163 2.04296C10.6958 2.27649 10.722 2.59345 10.5832 2.85326C9.99927 3.9469 9.66792 5.19607 9.66792 6.52485C9.66792 10.8367 13.1633 14.3321 17.4751 14.3321C18.8039 14.3321 20.0531 14.0007 21.1467 13.4168C21.4065 13.278 21.7235 13.3042 21.957 13.4837C22.1906 13.6632 22.2974 13.9627 22.2302 14.2495C21.1556 18.8349 17.0409 22.25 12.1269 22.25C6.39589 22.25 1.75 17.6041 1.75 11.8731C1.75 6.95906 5.16505 2.84445 9.7505 1.76979C10.0373 1.70258 10.3368 1.80944 10.5163 2.04296Z"
      fill="currentColor"
    />
  </svg>
);
const ClassicIcon = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
    <rect x="0.5" y="0.5" width="15" height="13" rx="3.5" fill="currentColor" opacity="0.18" />
    <rect x="2.5" y="2.5" width="11" height="6.5" rx="2" fill="var(--switch-card, #fff)" stroke="currentColor" strokeOpacity="0.35" />
    <rect x="9" y="10.4" width="4.5" height="1.6" rx="0.8" fill="currentColor" opacity="0.55" />
  </svg>
);
const CleanIcon = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
    <rect x="1.5" y="1.5" width="13" height="11" rx="2.5" fill="var(--switch-card, #fff)" stroke="currentColor" strokeOpacity="0.55" />
    <path d="M4 5h6M4 7.6h4" stroke="currentColor" strokeOpacity="0.55" strokeLinecap="round" />
  </svg>
);

export type StageTheme = "light" | "dark";

export interface UsageMeterStageProps {
  /** Where the stage switches sit: a column on the right (wide) or a row along the top (narrow). */
  layout?: "column" | "row";
  defaultLook?: UsageMeterLook;
  /** Extra chrome painted on the stage, e.g. a device status bar. */
  overlay?: ReactNode;
  className?: string;
}

export function UsageMeterStage({ layout = "column", defaultLook = "clean", overlay, className }: UsageMeterStageProps) {
  const [look, setLook] = useState<UsageMeterLook>(defaultLook);
  const [theme, setTheme] = useState<StageTheme>("light");
  const [run, setRun] = useState(0);
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  return (
    <div className={["um-stage", className].filter(Boolean).join(" ")} data-theme={theme} data-layout={layout}>
      <div key={`${look}-${run}`} className="um-stage__look">
        <UsageDemo look={look} today={today} />
      </div>
      {overlay}
      <div className="um-stage__tools">
        <button type="button" className="um-stage__reset" aria-label="Reset preview" title="Reset preview" onClick={() => setRun((r) => r + 1)}>
          <ResetIcon />
        </button>
        <div className="um-stage__group" role="radiogroup" aria-label="Preview theme">
          <button type="button" role="radio" aria-checked={theme === "light"} aria-label="Light theme" title="Light" className="um-stage__btn" onClick={() => setTheme("light")}>
            <SunIcon />
          </button>
          <button type="button" role="radio" aria-checked={theme === "dark"} aria-label="Dark theme" title="Dark" className="um-stage__btn" onClick={() => setTheme("dark")}>
            <MoonIcon />
          </button>
        </div>
        <div className="um-stage__group um-stage__group--style" role="radiogroup" aria-label="Component style">
          <button type="button" role="radio" aria-checked={look === "classic"} aria-label="Classic style" title="Classic style" className="um-stage__btn" onClick={() => setLook("classic")}>
            <ClassicIcon />
          </button>
          <button type="button" role="radio" aria-checked={look === "clean"} aria-label="Clean style" title="Clean style" className="um-stage__btn" onClick={() => setLook("clean")}>
            <CleanIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
