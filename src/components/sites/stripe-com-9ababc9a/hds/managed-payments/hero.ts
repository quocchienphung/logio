// /managed-payments hero animation (page bundle module 83758: Hero + HeroGlobe; chunk 38639: Globe,
// GlobeFallback; module 90866: LazyAnimation). Reproduces the React tree the reference mounts into the
// empty `.managed-payments-hero__anim-container`:
//
//   div.lazy-animation.lazy-hero-globe            <- inserted before .managed-payments-hero__ui-anim-container
//     div.globe[aria-hidden]                       (absolute, inset -20px of the square anim container)
//       canvas.globe__canvas
//       div.globe__ui-container
//         div.globe__arc-flag-ui x5 (hidden)       (currency badges: unused by the "flags" variant)
//         span.globe__flag-overlay x10 (hidden)    (flag badges pinned to arc end markers)
//
// The globe fires "domgraphicready" once its dots are on the GPU; the lazy wrapper then (after two
// animation frames) gains `lazy-animation--loaded`: CSS fades it in (opacity .5s cubic-bezier(.33,1,.68,1))
// and, through `.lazy-hero-globe.lazy-animation--loaded ~ .managed-payments-hero__ui-anim-container`,
// starts the five overlay cards' 15s CSS cycle. Without a capable GPU the reference renders
// GlobeFallback (a static image) already marked loaded, so the cards still cycle.
//
// The globe renders only while >=10% visible (100px margin), the tab is visible and motion is allowed;
// with prefers-reduced-motion it stays paused on its first frame (the CSS keeps the cards paused).

import { DOM_GRAPHIC_READY } from "../shared/domGraphic";
import { type Cleanup, combine, getBreakpoint, listen, observeIntersection, observeResize, onBreakpointChange, onReducedMotionChange, prefersReducedMotion } from "../shared/runtime";
import { HERO_GLOBE_PROPS, MAP_DOTS_URL } from "./globe/config";
import { flagSvg } from "./globe/flags";
import { gpuSupportsGlobe } from "./globe/capabilities";

/** GlobeFallback image (the reference's money-movement-fallback_2x.png, local copy). */
const FALLBACK_SRC = "/stripe/money-movement-fallback_2x-w894-1283768c.webp";
const FLAG_POOL = 10;
const ARC_UI_POOL = 5;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, attrs: Record<string, string> = {}) {
  const e = document.createElement(tag);
  e.className = className;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function buildFallback(): HTMLElement {
  const root = el("div", "globe lazy-hero-globe lazy-animation--loaded");
  const holder = el("div", "globe__static");
  const picture = document.createElement("picture");
  const img = document.createElement("img");
  for (const [k, v] of Object.entries({ loading: "lazy", width: "894", height: "1456", alt: "", src: FALLBACK_SRC })) img.setAttribute(k, v);
  picture.append(img);
  holder.append(picture);
  root.append(holder);
  return root;
}

/** Overlay card copy switches size with the breakpoint (mobile: lg/md, otherwise sm/xs). */
function mountOverlayTextSizes(container: HTMLElement): Cleanup {
  const apply = () => {
    const mobile = getBreakpoint() === "mobile";
    container.querySelectorAll<HTMLElement>(".managed-payments-hero__ui-anim-overlay-heading").forEach((h) => {
      h.classList.toggle("hds-text--lg", mobile);
      h.classList.toggle("hds-text--sm", !mobile);
    });
    container.querySelectorAll<HTMLElement>(".managed-payments-hero__ui-anim-overlay-description").forEach((d) => {
      d.classList.toggle("hds-text--md", mobile);
      d.classList.toggle("hds-text--xs", !mobile);
    });
  };
  apply();
  return onBreakpointChange(apply);
}

export function mountHero(hero: HTMLElement): Cleanup {
  const animContainer = hero.querySelector<HTMLElement>(".managed-payments-hero__anim-container");
  const uiContainer = hero.querySelector<HTMLElement>(".managed-payments-hero__ui-anim-container");
  if (!animContainer || !uiContainer) return () => {};
  const cleanups: Cleanup[] = [];
  cleanups.push(mountOverlayTextSizes(uiContainer));

  if (!gpuSupportsGlobe()) {
    const fallback = buildFallback();
    animContainer.insertBefore(fallback, uiContainer);
    cleanups.push(() => fallback.remove());
    return combine(cleanups);
  }

  // LazyAnimation wrapper (rootMargin 800px, freezeOnceVisible, waitForReady).
  const lazy = el("div", "lazy-animation lazy-hero-globe");
  animContainer.insertBefore(lazy, uiContainer);
  cleanups.push(() => lazy.remove());

  let globeCleanup: Cleanup | null = null;
  let ready = false;
  let inView = false;
  let raf = 0;
  const reveal = () => {
    if (!ready || !inView || lazy.classList.contains("lazy-animation--loaded") || raf) return;
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        raf = 0;
        lazy.classList.add("lazy-animation--loaded");
      });
    });
  };
  cleanups.push(() => cancelAnimationFrame(raf));
  const onReady = () => {
    ready = true;
    reveal();
  };
  lazy.addEventListener(DOM_GRAPHIC_READY, onReady);
  cleanups.push(() => lazy.removeEventListener(DOM_GRAPHIC_READY, onReady));

  const mountGlobe = () => {
    const globe = el("div", "globe", { "aria-hidden": "true" });
    const canvas = el("canvas", "globe__canvas", { "aria-hidden": "true" });
    const ui = el("div", "globe__ui-container");
    for (let i = 0; i < ARC_UI_POOL; i += 1) {
      const badge = el("div", "globe__arc-flag-ui");
      badge.style.display = "none";
      badge.append(el("span", "globe__arc-flag-ui-currency"));
      ui.append(badge);
    }
    const flags: HTMLElement[] = [];
    for (let i = 0; i < FLAG_POOL; i += 1) {
      const f = el("span", "globe__flag-overlay");
      f.style.display = "none";
      flags.push(f);
      ui.append(f);
    }
    globe.append(canvas, ui);
    lazy.append(globe);

    const local: Cleanup[] = [() => globe.remove()];
    let disposeRenderer: (() => void) | null = null;
    // Loaded lazily so three.js stays out of the page's initial bundle (the reference uses next/dynamic, ssr:false).
    let cancelled = false;
    import("./globe/GlobeRenderer")
      .then(({ GlobeRenderer }) => {
        if (cancelled) return;
        let renderer: InstanceType<typeof GlobeRenderer>;
        try {
          renderer = new GlobeRenderer(canvas, {
            flagPool: flags,
            renderFlagContent: (flagEl, country) => {
              flagEl.innerHTML = flagSvg(country) ?? "";
            },
            imageUrl: MAP_DOTS_URL,
            dotCount: HERO_GLOBE_PROPS.dotCount,
            arcsMaxActive: HERO_GLOBE_PROPS.arcsMaxActive,
            surfaceOpacity: HERO_GLOBE_PROPS.surfaceOpacity,
            glow: HERO_GLOBE_PROPS.glow,
          });
        } catch {
          // Error boundary: GlobeFallback, already "loaded".
          globe.remove();
          lazy.remove();
          const fallback = buildFallback();
          animContainer.insertBefore(fallback, uiContainer);
          local.push(() => fallback.remove());
          return;
        }
        let visible = false;
        const syncPaused = () => {
          renderer.paused = !visible || document.hidden || prefersReducedMotion();
        };
        const rect = globe.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);
        renderer.paused = true;
        renderer.initScene();
        renderer.onLoad(() => {
          globe.dispatchEvent(new CustomEvent(DOM_GRAPHIC_READY, { bubbles: true }));
          syncPaused();
        });
        local.push(
          observeIntersection(
            globe,
            (v) => {
              visible = v;
              syncPaused();
            },
            { threshold: 0.1, rootMargin: "100px" },
          ),
          observeResize(globe, ({ width, height }) => width && height && renderer.setSize(width, height), { delay: 150 }),
          listen(document, "visibilitychange", syncPaused),
          onReducedMotionChange(syncPaused),
        );
        disposeRenderer = () => renderer.dispose();
      })
      .catch(() => {
        /* chunk failed to load: the wrapper stays hidden like the reference's unresolved dynamic import */
      });
    return () => {
      cancelled = true;
      combine(local)();
      disposeRenderer?.();
    };
  };

  cleanups.push(
    observeIntersection(
      lazy,
      (v) => {
        if (!v) return;
        inView = true;
        if (!globeCleanup) globeCleanup = mountGlobe();
        reveal();
      },
      { rootMargin: "800px", once: true },
    ),
    () => globeCleanup?.(),
  );
  return combine(cleanups);
}
