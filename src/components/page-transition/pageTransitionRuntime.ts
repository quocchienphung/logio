/**
 * Page-to-page transition (cross-document View Transitions).
 *
 * Timeline, measured frame by frame from the reference capture (30 fps; t = 0 at the click):
 *  - 0 → ~780 ms   a feathered disc of the incoming page grows from the viewport centre
 *                  (covered area ≈ 2 % @ 67 ms, 21 % @ 200 ms, 59 % @ 333 ms, 95 % @ 467 ms).
 *                  The outgoing page is bent around the disc edge like a lens (pushed outward
 *                  with a slight swirl) with RGB channel separation.
 *  - ~150 → 900 ms the incoming page is barrel-warped with RGB separation inside the disc, decaying to 0.
 *  - ~380 → 1150 ms headline / paragraph lines in the first viewport are revealed top-to-bottom,
 *                  one line after the other (~55 ms apart), with RGB fringes and a skew that settle.
 *  - the site header stays still for the whole transition.
 *
 * The function is serialised with `toString()` and inlined into <head> (it must register `pagereveal`
 * before the first render of the new document), so it must stay self-contained: no imports, no
 * references to module scope.
 */
export function pageTransitionRuntime(): void {
  if (!("onpagereveal" in window)) return;

  // disc radius curve least-squares fitted to the coverage measured in the reference (≈11 px RMSE)
  const DISC_MS = 780;
  const DISC_EASE = [0.7, 0.6, 0.75, 0.9] as const;
  const CORE = 0.55; // opaque part of the disc (fraction of the outer radius)
  const TEXT_START = 380;
  const LINE_STAGGER = 55;
  const LINE_MS = 280;
  const TOTAL_MS = 1250;
  const MAX_TEXT_BLOCKS = 8;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Next.js <Link> navigations are client-side and would skip the cross-document transition:
  // let same-origin page links fall through to a normal navigation instead.
  window.addEventListener(
    "click",
    (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const a = target ? target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.stopPropagation();
    },
    true,
  );

  const bezier = (p1x: number, p1y: number, p2x: number, p2y: number) => {
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sy = (t: number) => ((ay * t + by) * t + cy) * t;
    const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (x: number) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const d = sx(t) - x;
        const dd = dsx(t);
        if (Math.abs(d) < 1e-5 || Math.abs(dd) < 1e-6) break;
        t -= d / dd;
      }
      return sy(Math.min(1, Math.max(0, t)));
    };
  };
  const discEase = bezier(DISC_EASE[0], DISC_EASE[1], DISC_EASE[2], DISC_EASE[3]);
  const outEase = bezier(0.22, 1, 0.36, 1);
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  /** Displacement map as a data URL: R/G = 0.5 ± vector (feDisplacementMap convention). */
  const makeMap = (size: number, w: number, h: number, field: (ux: number, uy: number) => [number, number]) => {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = Math.max(1, Math.round((size * h) / w));
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    const img = ctx.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const [vx, vy] = field((x + 0.5) / c.width, (y + 0.5) / c.height);
        const i = (y * c.width + x) * 4;
        img.data[i] = Math.round(128 + 127 * Math.max(-1, Math.min(1, vx)));
        img.data[i + 1] = Math.round(128 + 127 * Math.max(-1, Math.min(1, vy)));
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  };

  /** Lens filter: one displacement per colour channel (slightly different strengths), recombined. */
  const makeFilter = (svg: SVGSVGElement, id: string, w: number, h: number) => {
    const el = (name: string, attrs: Record<string, string | number>, parent: Element) => {
      const n = document.createElementNS(SVG_NS, name);
      for (const k in attrs) n.setAttribute(k, String(attrs[k]));
      parent.appendChild(n);
      return n;
    };
    const f = el("filter", { id, x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" }, svg);
    el("feFlood", { "flood-color": "rgb(128,128,128)", result: "neutral" }, f);
    const image = el("feImage", { x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "mapImg" }, f);
    el("feComposite", { in: "mapImg", in2: "neutral", operator: "over", result: "map" }, f);
    const maps: Element[] = [];
    const channels: [string, string][] = [
      ["dR", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"],
      ["dG", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"],
      ["dB", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"],
    ];
    for (const [name, matrix] of channels) {
      maps.push(el("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: 0, xChannelSelector: "R", yChannelSelector: "G", result: name + "raw" }, f));
      el("feColorMatrix", { in: name + "raw", type: "matrix", values: matrix, result: name }, f);
    }
    el("feComposite", { in: "dR", in2: "dG", operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0, result: "rg" }, f);
    el("feComposite", { in: "rg", in2: "dB", operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0 }, f);
    return { image, maps };
  };

  /** Stable selector for an element (nth-child path from <body>). */
  const pathOf = (node: Element) => {
    const parts: string[] = [];
    let n: Element | null = node;
    while (n && n !== document.body) {
      const parent: Element | null = n.parentElement;
      if (!parent) return null;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${Array.prototype.indexOf.call(parent.children, n) + 1})`);
      n = parent;
    }
    return n ? "body > " + parts.join(" > ") : null;
  };

  /** Line boxes of an element's text, relative to its border box. */
  const linesOf = (el: Element) => {
    const box = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops: { top: number; bottom: number }[] = [];
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 1 || r.height < 1) continue;
      const top = r.top - box.top;
      const bottom = r.bottom - box.top;
      const line = tops.find((l) => Math.abs(l.top - top) < r.height * 0.5);
      if (line) {
        line.top = Math.min(line.top, top);
        line.bottom = Math.max(line.bottom, bottom);
      } else tops.push({ top, bottom });
    }
    tops.sort((a, b) => a.top - b.top);
    // close the gaps so the revealed bands tile the whole block
    for (let i = 0; i < tops.length; i++) {
      tops[i].top = i === 0 ? 0 : tops[i - 1].bottom;
      if (i === tops.length - 1) tops[i].bottom = Math.max(tops[i].bottom, box.height);
    }
    return { box, lines: tops };
  };

  const run = (vt: ViewTransition) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    const cy = H / 2;
    const halfDiag = Math.hypot(cx, cy);
    const rEnd = (halfDiag / CORE) * 1.04;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "fixed";
    svg.style.pointerEvents = "none";
    const outF = makeFilter(svg, "pt-lens-out", W, H);
    const inF = makeFilter(svg, "pt-lens-in", W, H);
    // outgoing page: a ring around the disc edge pushes content outward (sampling toward the centre)
    // with a slight tangential swirl; map spans ±2 outer radii around the centre.
    outF.image.setAttribute(
      "href",
      makeMap(256, 1, 1, (fx, fy) => {
        const ux = (fx - 0.5) * 4;
        const uy = (fy - 0.5) * 4;
        const u = Math.hypot(ux, uy) || 1e-6;
        const m = smooth(0.45, 0.92, u) * (1 - smooth(1.0, 2.0, u));
        const dx = ux / u;
        const dy = uy / u;
        return [-(dx - 0.35 * dy) * m, -(dy + 0.35 * dx) * m];
      }),
    );
    // incoming page: fisheye over the whole viewport, magnifying toward the corners (samples inward,
    // so it never reads outside the snapshot)
    inF.image.setAttribute(
      "href",
      makeMap(256, W, H, (fx, fy) => {
        const ux = ((fx - 0.5) * W) / halfDiag;
        const uy = ((fy - 0.5) * H) / halfDiag;
        const u = Math.hypot(ux, uy);
        return [-ux * u, -uy * u];
      }),
    );
    document.body.appendChild(svg);

    // text blocks in the first viewport get their own snapshot so their lines can be revealed
    const style = document.createElement("style");
    style.id = "pt-runtime-style";
    const blocks: { name: string; lines: { top: number; bottom: number }[]; width: number }[] = [];
    let css = "";
    const candidates = Array.from(document.querySelectorAll("main h1, main h2, main h3, main p"));
    for (const el of candidates) {
      if (blocks.length >= MAX_TEXT_BLOCKS) break;
      if (!(el.textContent || "").trim()) continue;
      if (el.closest("header.navigation, footer")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= H) continue;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.display === "contents" || Number(cs.opacity) === 0) continue;
      const sel = pathOf(el);
      if (!sel) continue;
      const { lines } = linesOf(el);
      if (!lines.length) continue;
      const name = `pt-text-${blocks.length}`;
      blocks.push({ name, lines, width: r.width });
      const masks = lines.map(() => "linear-gradient(#000, #000)").join(", ");
      const positions = lines.map((l) => `0 ${l.top.toFixed(1)}px`).join(", ");
      const sizes = lines.map(() => "100% 0px").join(", ");
      css += `${sel}{view-transition-name:${name};view-transition-class:pt-text}`;
      css += `::view-transition-new(${name}){mask-image:${masks};mask-repeat:no-repeat;mask-position:${positions};mask-size:${sizes}}`;
    }
    style.textContent = css;
    document.head.appendChild(style);

    let raf = 0;
    // filter parameters follow the transition's own clock (an animation on :root), so they stay in
    // sync with the disc even when animations are slowed down or throttled
    let clock: Animation | null = null;
    const tick = () => {
      const t = clock ? Number(clock.currentTime) || 0 : 0;
      const r = rEnd * discEase(Math.min(1, t / DISC_MS));
      // outgoing lens follows the disc; strength ramps in over the first 250 ms
      const outScale = 0.28 * r * smooth(0, 250, t);
      outF.image.setAttribute("x", String(cx - 2 * r));
      outF.image.setAttribute("y", String(cy - 2 * r));
      outF.image.setAttribute("width", String(4 * r));
      outF.image.setAttribute("height", String(4 * r));
      outF.maps.forEach((m, i) => m.setAttribute("scale", String(outScale * [1.08, 1, 0.92][i])));
      // incoming barrel + RGB split: peaks around 380 ms, gone by 900 ms
      const inK = smooth(150, 380, t) * (1 - outEase(Math.min(1, Math.max(0, (t - 380) / 520))));
      const inScale = 0.16 * halfDiag * inK;
      inF.maps.forEach((m, i) => m.setAttribute("scale", String(inScale * [1.1, 1, 0.9][i])));
      if (clock && clock.playState !== "finished") raf = requestAnimationFrame(tick);
    };

    const root = document.documentElement;
    const anims: Animation[] = [];
    vt.ready
      .then(() => {
        clock = root.animate([{ "--pt-clock": "0" }, { "--pt-clock": "1" }] as Keyframe[], { duration: TOTAL_MS, fill: "both" });
        anims.push(clock);
        anims.push(root.animate([{ "--pt-r": "0px" }, { "--pt-r": `${rEnd}px` }] as Keyframe[], {
          duration: DISC_MS,
          easing: `cubic-bezier(${DISC_EASE.join(",")})`,
          fill: "both",
        }));
        raf = requestAnimationFrame(tick);
        blocks.forEach((b, bi) => {
          const steps = 24;
          const frames: Keyframe[] = [];
          const lineStart = (li: number) => TEXT_START + (bi === 0 ? 0 : 60) + (blocks.slice(0, bi).reduce((n, x) => n + x.lines.length, 0) + li) * LINE_STAGGER;
          const end = lineStart(b.lines.length - 1) + LINE_MS;
          for (let s = 0; s <= steps; s++) {
            const tt = (end * s) / steps;
            const sizes = b.lines.map((l, li) => {
              const p = outEase(Math.min(1, Math.max(0, (tt - lineStart(li)) / LINE_MS)));
              return `100% ${((l.bottom - l.top) * p).toFixed(2)}px`;
            });
            const k = 1 - outEase(Math.min(1, Math.max(0, (tt - lineStart(0)) / (LINE_MS + 120))));
            const off = (10 * k).toFixed(2);
            frames.push({
              offset: s / steps,
              maskSize: sizes.join(", "),
              transform: `skewX(${(-9 * k).toFixed(2)}deg) translateY(${(6 * k).toFixed(2)}px)`,
              filter: `drop-shadow(${-off}px 0 0 rgba(255,0,64,${(0.85 * k).toFixed(3)})) drop-shadow(${off}px 0 0 rgba(0,200,255,${(0.85 * k).toFixed(3)}))`,
            });
          }
          anims.push(root.animate(frames, { duration: end, easing: "linear", fill: "both", pseudoElement: `::view-transition-new(${b.name})` }));
        });
      })
      .catch(() => {});

    vt.finished
      .finally(() => {
        cancelAnimationFrame(raf);
        anims.forEach((a) => a.cancel());
        svg.remove();
        style.remove();
      })
      .catch(() => {});
  };

  window.addEventListener("pagereveal", (e: PageRevealEvent) => {
    const vt = e.viewTransition;
    if (!vt) return;
    if (reduced.matches) {
      vt.skipTransition();
      return;
    }
    run(vt);
  });
}
