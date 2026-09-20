"use client";

import { useEffect, type RefObject } from "react";

// Port of the reference developer-systems diagram cycle (bundle chunk 55849). Every 4s (1s after
// entering view, ≥20% visible, tab visible) the scenario advances enterprise → startups → smb →
// commercial: connected systems and PSP tiles toggle their --animate highlight and the partner app
// tiles flip (rotateX +180° per flip, 300ms stagger across tiles whose logo changes).
// The reference cycles four logos per tile; this port flips between the two faces in the markup.
const SCENARIOS = ["enterprise", "startups", "smb", "commercial"] as const;
const SYSTEMS = [
  "erp",
  "crm",
  "subscriptions",
  "legacyBilling",
  "bookingSystem",
] as const;
const STATE: Record<
  (typeof SCENARIOS)[number],
  { activeSystems: string[]; activePsps: number[]; activePspIntl: boolean }
> = {
  enterprise: {
    activeSystems: [
      "erp",
      "crm",
      "subscriptions",
      "legacyBilling",
      "bookingSystem",
    ],
    activePsps: [0, 1, 2, 3],
    activePspIntl: true,
  },
  startups: {
    activeSystems: ["crm", "bookingSystem"],
    activePsps: [],
    activePspIntl: false,
  },
  smb: {
    activeSystems: ["crm", "subscriptions", "bookingSystem"],
    activePsps: [1, 2],
    activePspIntl: true,
  },
  commercial: {
    activeSystems: ["subscriptions", "erp", "bookingSystem", "legacyBilling"],
    activePsps: [0, 1, 2],
    activePspIntl: true,
  },
};
// Which tiles carry a logo per scenario (null = placeholder), from the reference's G table.
const APP_LOGOS: (string | null)[][] = [
  [null, "Mailchimp", null, "Chargeflow"],
  ["Salesforce", "Xero", "Intercom", "Xero"],
  ["Netsuite", "Rewardful", "Puzzle", "Taxually"],
  [null, "Hubspot", null, null],
  ["SAP", "Mercury", "Billit", "Docusign"],
  ["Adobe", "QuickBooks", "Churnkey", "RevenueCat"],
];

export function useDeveloperSystems(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const systems = [
      ...el.querySelectorAll<HTMLElement>(
        ".developer-systems-animation__system-container",
      ),
    ];
    const psps = [
      ...el.querySelectorAll<HTMLElement>(
        ".developer-systems-animation__psp-container--multiple .developer-systems-animation__psp-app-container",
      ),
    ];
    const pspIntl = el.querySelector<HTMLElement>(
      ".developer-systems-animation__psp-container--single .developer-systems-animation__psp-app-container",
    );
    const leftApps = [
      ...el.querySelectorAll<HTMLElement>(
        ".developer-systems-animation__apps .developer-systems-animation__app-logo",
      ),
    ];
    const rightApp = el.querySelector<HTMLElement>(
      ".developer-systems-animation__figure--chart-right .developer-systems-animation__app-logo",
    );
    const flips = new Map<HTMLElement, number>();
    let index = 0;
    let prev = 0;
    let timers: number[] = [];

    const apply = () => {
      const s = STATE[SCENARIOS[index]];
      systems.forEach((sys, i) => {
        sys.classList.remove(
          "developer-systems-animation__system-container--initial",
        );
        sys.classList.toggle(
          "developer-systems-animation__system-container--animate",
          s.activeSystems.includes(SYSTEMS[i]),
        );
      });
      psps.forEach((p, i) => {
        p.classList.remove(
          "developer-systems-animation__psp-app-container--initial",
        );
        p.classList.toggle(
          "developer-systems-animation__psp-app-container--animate",
          s.activePsps.includes(i),
        );
      });
      pspIntl?.classList.remove(
        "developer-systems-animation__psp-app-container--initial",
      );
      pspIntl?.classList.toggle(
        "developer-systems-animation__psp-app-container--animate",
        s.activePspIntl,
      );
      // staggered flips for tiles whose logo differs between scenarios
      let t = 0;
      leftApps.forEach((logo, n) => {
        const row = APP_LOGOS[n];
        if (!row) return;
        const changes =
          row[index % row.length] !== null || row[prev % row.length] !== null;
        if (!changes) return;
        const delay = 300 * t++;
        timers.push(
          window.setTimeout(() => {
            const count = (flips.get(logo) ?? 0) + 1;
            flips.set(logo, count);
            logo.style.transform = `rotateX(${180 * count}deg)`;
          }, delay),
        );
      });
      if (rightApp) {
        const count = (flips.get(rightApp) ?? 0) + 1;
        flips.set(rightApp, count);
        rightApp.style.transform = `rotateX(${180 * count}deg)`;
      }
    };
    const advance = () => {
      prev = index;
      index = (index + 1) % SCENARIOS.length;
      apply();
    };

    let intersecting = false;
    let interval: number | undefined;
    let initial: number | undefined;
    const sync = () => {
      const on = intersecting && !document.hidden;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      interval = initial = undefined;
      if (on) {
        initial = window.setTimeout(() => {
          advance();
          interval = window.setInterval(advance, 4000);
        }, 1000);
      }
    };
    const io = new IntersectionObserver(
      ([e]) => {
        intersecting = e.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.clearTimeout(initial);
      window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
  }, [root]);
}
