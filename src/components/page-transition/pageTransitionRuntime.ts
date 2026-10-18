/**
 * Page-to-page transition (cross-document View Transitions), rebuilt from the reference capture
 * (docs/zzzz.mp4, 1152×720, measured frame by frame; hd = half the viewport diagonal):
 *
 *  - disc     the incoming page is revealed through a disc that grows from the viewport centre at a
 *             constant 1.858 hd/s (fitted on two transitions, ≈20 px RMSE) with a soft edge (90→10 % over
 *             ≈60 px at 1152×720, then a faint tail ≈50 px further out); it reaches the corners after ≈0.6 s.
 *  - lens in  inside the disc the incoming page is seen through a magnifying lens:
 *             sample = p − k·(p − c)·(1 − ρ²), ρ = |p − c| / R, k = 0.85·(1 − τ/0.75 s)^1.4
 *             (≈2.9× at the centre while the disc is small, gone by 0.75 s), with chromatic aberration.
 *  - lens out the outgoing page is pushed out around the disc edge (0.16·R at the edge, decaying over
 *             0.45·R), with chromatic aberration, until the disc covers it.
 *  - text     text blocks in the first viewport are revealed line by line, top to bottom (first line at
 *             0.35 s, 55 ms apart, 170 ms each), leaning (skew) while the lens and aberration settle.
 *  - media    large images/canvases fade in from 0.48 s over 0.67 s.
 *  - header   the site header stays still.
 *
 * All reference timings are multiplied by TIME_SCALE (the motion is kept, only slowed down so it reads).
 * The function is serialised with `toString()` and inlined into <head> (it must register `pagereveal`
 * before the first render of the new document), so it must stay self-contained: no imports, no
 * references to module scope.
 */
export function pageTransitionRuntime(): void {
  if (!("onpagereveal" in window)) return;

  const TIME_SCALE = 1.6;
  const DISC_SPEED = 1.858; // hd per second (reference)
  // soft edge: incoming alpha at R + x·hd, from the measured profile (0.9→0.1 over ≈60 px, then a long faint tail)
  const EDGE: [number, number][] = [[-0.088, 1], [-0.047, 0.9], [-0.024, 0.72], [0, 0.5], [0.021, 0.3], [0.041, 0.1], [0.074, 0.04], [0.118, 0]];
  const LENS_K0 = 0.85;
  const LENS_MS = 750;
  const LENS_POW = 1.4;
  const OUT_PUSH = 0.16; // × R at the edge
  const OUT_DECAY = 0.45; // × R beyond the edge
  const CA_IN = [1.12, 1, 0.88];
  const CA_OUT = [1.12, 1, 0.88];
  const TEXT_START = 350;
  const LINE_STAGGER = 55;
  const LINE_MS = 170;
  const MEDIA_START = 480;
  const MEDIA_MS = 670;
  const MAX_TEXT = 6;
  const MAX_MEDIA = 4;
  const PAD = 48; // filter region margin around named elements
  const MAP = 256;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const S = (ms: number) => ms * TIME_SCALE;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Next.js <Link> navigations are client-side and would skip the cross-document transition:
  // let same-origin page links fall through to a normal (prerendered) navigation instead.
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
  const outEase = bezier(0.22, 1, 0.36, 1);
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  const smooth = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  /** Square displacement map over [-span, span]² as a PNG data URL (R/G = 0.5 ± vector). */
  const makeMap = (span: number, field: (ux: number, uy: number) => [number, number]) => {
    const c = document.createElement("canvas");
    c.width = c.height = MAP;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    const img = ctx.createImageData(MAP, MAP);
    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        const [vx, vy] = field(((x + 0.5) / MAP - 0.5) * 2 * span, ((y + 0.5) / MAP - 0.5) * 2 * span);
        const i = (y * MAP + x) * 4;
        img.data[i] = Math.round(128 + 127 * Math.max(-1, Math.min(1, vx)));
        img.data[i + 1] = Math.round(128 + 127 * Math.max(-1, Math.min(1, vy)));
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  };

  // incoming lens: displacement −u(1 − |u|²) inside the unit disc, normalised by its maximum (2/(3√3))
  const LENS_MAX = 2 / (3 * Math.sqrt(3));
  const OUT_SPAN = 1 + 5 * OUT_DECAY;
  const maps = (() => {
    const key = "pt-maps-v2";
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return JSON.parse(cached) as { lens: string; push: string };
    } catch {}
    const lens = makeMap(1, (ux, uy) => {
      const u2 = ux * ux + uy * uy;
      if (u2 >= 1) return [0, 0];
      const f = (1 - u2) / LENS_MAX;
      return [-ux * f, -uy * f];
    });
    // outgoing push: sample toward the centre, peaking at the disc edge (|u| = 1)
    const push = makeMap(OUT_SPAN, (ux, uy) => {
      const u = Math.hypot(ux, uy) || 1e-6;
      const h = u < 1 ? smooth(0.5, 1, u) : Math.exp(-(u - 1) / OUT_DECAY);
      return [(-ux / u) * h, (-uy / u) * h];
    });
    const out = { lens, push };
    try {
      sessionStorage.setItem(key, JSON.stringify(out));
    } catch {}
    return out;
  })();

  /**
   * Displacement filter with one pass per colour channel (chromatic aberration), recombined.
   * `dark` is for dark ink on a transparent snapshot (text): the channels are split in inverted colour so
   * the fringes come out as the complementary colours they show on a light page instead of black.
   */
  const INVERT = "-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0";
  const makeFilter = (svg: SVGSVGElement, id: string, x: number, y: number, w: number, h: number, href: string, dark = false) => {
    const el = (name: string, attrs: Record<string, string | number>, parent: Element) => {
      const n = document.createElementNS(SVG_NS, name);
      for (const k in attrs) n.setAttribute(k, String(attrs[k]));
      parent.appendChild(n);
      return n;
    };
    const f = el("filter", { id, x, y, width: w, height: h, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" }, svg);
    el("feFlood", { "flood-color": "rgb(128,128,128)", result: "neutral" }, f);
    const image = el("feImage", { href, x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: "none", result: "mapImg" }, f);
    el("feComposite", { in: "mapImg", in2: "neutral", operator: "over", result: "map" }, f);
    if (dark) el("feColorMatrix", { in: "SourceGraphic", type: "matrix", values: INVERT, result: "src" }, f);
    const src = dark ? "src" : "SourceGraphic";
    const passes: Element[] = [];
    const channels: [string, string][] = [
      ["dR", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"],
      ["dG", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"],
      ["dB", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"],
    ];
    for (const [name, matrix] of channels) {
      passes.push(el("feDisplacementMap", { in: src, in2: "map", scale: 0, xChannelSelector: "R", yChannelSelector: "G", result: name + "raw" }, f));
      el("feColorMatrix", { in: name + "raw", type: "matrix", values: matrix, result: name }, f);
    }
    // premultiplied sum: where the passes overlap the colour is whole, at the edges each channel shows alone
    el("feComposite", { in: "dR", in2: "dG", operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0, result: "rg" }, f);
    el("feComposite", { in: "rg", in2: "dB", operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0, result: "sum" }, f);
    if (dark) el("feColorMatrix", { in: "sum", type: "matrix", values: INVERT }, f);
    return {
      place(ix: number, iy: number, size: number, scale: number, ca: number[]) {
        image.setAttribute("x", ix.toFixed(1));
        image.setAttribute("y", iy.toFixed(1));
        image.setAttribute("width", size.toFixed(1));
        image.setAttribute("height", size.toFixed(1));
        passes.forEach((p, i) => p.setAttribute("scale", (scale * ca[i]).toFixed(2)));
      },
    };
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

  /** Line boxes of an element's text, relative to its border box, tiling the whole block. */
  const linesOf = (el: Element) => {
    const box = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const lines: { top: number; bottom: number }[] = [];
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 1 || r.height < 1) continue;
      const top = r.top - box.top;
      const bottom = r.bottom - box.top;
      const line = lines.find((l) => Math.abs(l.top - top) < r.height * 0.5);
      if (line) {
        line.top = Math.min(line.top, top);
        line.bottom = Math.max(line.bottom, bottom);
      } else lines.push({ top, bottom });
    }
    lines.sort((a, b) => a.top - b.top);
    for (let i = 0; i < lines.length; i++) {
      lines[i].top = i === 0 ? 0 : lines[i - 1].bottom;
      if (i === lines.length - 1) lines[i].bottom = Math.max(lines[i].bottom, box.height);
    }
    return lines;
  };

  /** A separate snapshot would escape clipping by an ancestor: only take elements nothing clips. */
  const unclipped = (el: Element, r: DOMRect) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = window.getComputedStyle(a);
      if (cs.viewTransitionName && cs.viewTransitionName !== "none") return false;
      if (Number(cs.opacity) < 1 || (cs.transform && cs.transform !== "none" && el.tagName !== "IMG")) return false;
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const b = a.getBoundingClientRect();
      const rounded = parseFloat(cs.borderTopLeftRadius) > 0 || parseFloat(cs.borderBottomRightRadius) > 0;
      if (rounded || r.left < b.left - 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.bottom > b.bottom + 1) return false;
    }
    return true;
  };

  const visible = (el: Element, r: DOMRect, W: number, H: number) => {
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) return false;
    if (el.closest("header.navigation, footer")) return false;
    const cs = window.getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.display === "contents" || Number(cs.opacity) === 0) return false;
    return !cs.viewTransitionName || cs.viewTransitionName === "none";
  };

  const run = (vt: ViewTransition) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    const cy = H / 2;
    const hd = Math.hypot(cx, cy);
    const rEnd = hd * (1 + EDGE[EDGE.length - 1][0]) + 4;
    const discMs = S((1000 * rEnd) / (DISC_SPEED * hd));
    const speed = rEnd / discMs; // px per ms

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "fixed";
    svg.style.pointerEvents = "none";
    const outF = makeFilter(svg, "pt-lens-out", 0, 0, W, H, maps.push);
    const inF = makeFilter(svg, "pt-lens-in", 0, 0, W, H, maps.lens);

    // the disc with its soft edge, centred on (x, y) in the box's px
    const disc = (x: number, y: number) => {
      const stops = EDGE.map(([o, a]) => `rgb(0 0 0 / ${a}) calc(var(--pt-r) + ${(o * hd).toFixed(1)}px)`);
      return `radial-gradient(circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${stops.join(", ")})`;
    };

    // named snapshots get PAD of padding (pulled back with translate) so the lens can push their
    // content past the element's edges without the mask or filter clipping it
    const padBox = `padding:${PAD}px;translate:${-PAD}px ${-PAD}px`;
    const discLayer = (r: DOMRect) => disc(cx - r.left + PAD, cy - r.top + PAD);

    const style = document.createElement("style");
    style.id = "pt-runtime-style";
    let css = `::view-transition-new(root){mask-image:${disc(cx, cy)};mask-repeat:no-repeat}`;
    // the lens filters live in their own sheet, dropped as soon as the lens has settled (they are the
    // expensive part of each frame; the rest of the transition is masks and opacity)
    let lensCss = "::view-transition-old(root){filter:url(#pt-lens-out)}::view-transition-new(root){filter:url(#pt-lens-in)}";

    type Named = { name: string; box: DOMRect; filter: ReturnType<typeof makeFilter> };
    const blocks: (Named & { lines: { top: number; bottom: number }[] })[] = [];
    const media: Named[] = [];
    const taken: Element[] = [];
    const inside = (el: Element) => taken.some((t) => t.contains(el) || el.contains(t));

    for (const el of Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4, main p"))) {
      if (blocks.length >= MAX_TEXT) break;
      if (!(el.textContent || "").trim() || inside(el)) continue;
      const r = el.getBoundingClientRect();
      if (!visible(el, r, W, H) || !unclipped(el, r)) continue;
      const sel = pathOf(el);
      const lines = sel ? linesOf(el) : [];
      if (!sel || !lines.length) continue;
      const name = `pt-text-${blocks.length}`;
      const ink = (window.getComputedStyle(el).color.match(/[\d.]+/g) || ["0", "0", "0"]).slice(0, 3).map(Number);
      const dark = 0.2126 * ink[0] + 0.7152 * ink[1] + 0.0722 * ink[2] < 128;
      const filter = makeFilter(svg, `pt-f-${name}`, 0, 0, r.width + 2 * PAD, r.height + 2 * PAD, maps.lens, dark);
      blocks.push({ name, box: r, filter, lines });
      taken.push(el);
      // the outer lines reach PAD beyond the box so the lens can push glyphs past its edges
      lines[0].top -= PAD;
      lines[lines.length - 1].bottom += PAD;
      const masks = lines.map(() => "linear-gradient(#000, #000)").join(", ");
      const positions = lines.map((l) => `0 ${(l.top + PAD).toFixed(1)}px`).join(", ");
      const sizes = lines.map(() => "100% 0px").join(", ");
      const ops = lines.map(() => "add").join(", ");
      css += `${sel}{view-transition-name:${name};view-transition-class:pt-text}`;
      // disc ∩ (union of the revealed lines): the top layer intersects with everything below it
      lensCss += `::view-transition-new(${name}){filter:url(#pt-f-${name})}`;
      css += `::view-transition-new(${name}){${padBox};mask-repeat:no-repeat;mask-image:${discLayer(r)}, ${masks};mask-position:0 0, ${positions};mask-size:100% 100%, ${sizes};mask-composite:intersect, ${ops}}`;
    }

    const mediaCandidates = Array.from(document.querySelectorAll("main img, main video, main canvas"))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width * r.height >= 0.008 * W * H && visible(el, r, W, H) && !inside(el) && unclipped(el, r))
      .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
    for (const { el, r } of mediaCandidates) {
      if (media.length >= MAX_MEDIA) break;
      if (inside(el)) continue;
      const sel = pathOf(el);
      if (!sel) continue;
      const name = `pt-media-${media.length}`;
      const filter = makeFilter(svg, `pt-f-${name}`, 0, 0, r.width + 2 * PAD, r.height + 2 * PAD, maps.lens);
      media.push({ name, box: r, filter });
      taken.push(el);
      css += `${sel}{view-transition-name:${name};view-transition-class:pt-media}`;
      lensCss += `::view-transition-new(${name}){filter:url(#pt-f-${name})}`;
      css += `::view-transition-new(${name}){${padBox};mask-repeat:no-repeat;mask-image:${discLayer(r)}}`;
    }

    // timeline (reference ms → scaled)
    let globalLine = 0;
    const lineStarts = blocks.map((b) => b.lines.map(() => S(TEXT_START + LINE_STAGGER * globalLine++)));
    const textEnd = blocks.length ? Math.max(...lineStarts.map((ls) => ls[ls.length - 1])) + S(LINE_MS) : 0;
    const mediaEnd = media.length ? S(MEDIA_START + MEDIA_MS) : 0;
    const total = Math.max(discMs, S(LENS_MS), textEnd + S(120), mediaEnd) + 20;
    css += `::view-transition-old(root){animation-duration:${discMs.toFixed(0)}ms}`;
    css += `::view-transition-new(root),::view-transition-new(pt-header){animation-duration:${total.toFixed(0)}ms}`;
    style.textContent = css;
    document.head.appendChild(style);
    const lensStyle = document.createElement("style");
    lensStyle.textContent = lensCss;
    document.head.appendChild(lensStyle);
    const lensEnd = Math.max(discMs, S(LENS_MS));
    document.body.appendChild(svg);
    const root = document.documentElement;

    let raf = 0;
    // filter parameters follow the transition's own clock (an animation on :root), so they stay in sync
    // with the disc even when animations are slowed down or throttled
    let clock: Animation | null = null;
    const tick = () => {
      const t = clock ? Number(clock.currentTime) || 0 : 0;
      if (t >= lensEnd) {
        lensStyle.remove();
        return;
      }
      const r = Math.min(rEnd, speed * t);
      // outgoing push around the edge, eased in over the first 60 ms so the disc does not pop
      const span = OUT_SPAN * r;
      outF.place(cx - span, cy - span, 2 * span, ((OUT_PUSH * r) / 0.498) * smooth(0, S(60), t), CA_OUT);
      // incoming lens, sized to the disc (or the screen once the disc is larger than it)
      const k = t < S(LENS_MS) ? LENS_K0 * Math.pow(1 - t / S(LENS_MS), LENS_POW) : 0;
      const lr = Math.max(r, 1);
      const scale = (k * lr * LENS_MAX) / 0.498;
      inF.place(cx - lr, cy - lr, 2 * lr, scale, CA_IN);
      for (const n of [...blocks, ...media]) n.filter.place(cx - lr - n.box.left + PAD, cy - lr - n.box.top + PAD, 2 * lr, scale, CA_IN);
      if (clock && clock.playState !== "finished") raf = requestAnimationFrame(tick);
      else lensStyle.remove();
    };

    const anims: Animation[] = [];
    vt.ready
      .then(() => {
        clock = root.animate([{ "--pt-clock": "0" }, { "--pt-clock": "1" }] as Keyframe[], { duration: total, fill: "both" });
        anims.push(clock);
        anims.push(root.animate([{ "--pt-r": "0px" }, { "--pt-r": `${rEnd.toFixed(1)}px` }] as Keyframe[], { duration: discMs, easing: "linear", fill: "both" }));
        raf = requestAnimationFrame(tick);
        blocks.forEach((b, bi) => {
          const starts = lineStarts[bi];
          const end = starts[starts.length - 1] + S(LINE_MS) + S(120);
          const steps = 30;
          const frames: Keyframe[] = [];
          for (let s = 0; s <= steps; s++) {
            const tt = (end * s) / steps;
            const sizes = b.lines.map((l, li) => {
              // the margin above the first line opens as soon as that line starts, the text then wipes down
              const p = outEase(clamp01((tt - starts[li]) / S(LINE_MS)));
              const lead = li === 0 ? PAD * clamp01(p * 8) : 0;
              const h = lead + (l.bottom - l.top - (li === 0 ? PAD : 0)) * p;
              return `100% ${h.toFixed(2)}px`;
            });
            // the block leans while its lines come in, then straightens
            const lean = 1 - outEase(clamp01((tt - starts[0]) / (end - starts[0])));
            frames.push({ offset: s / steps, maskSize: `100% 100%, ${sizes.join(", ")}`, transform: `skewX(${(-9 * lean).toFixed(2)}deg)` });
          }
          anims.push(root.animate(frames, { duration: end, easing: "linear", fill: "both", pseudoElement: `::view-transition-new(${b.name})` }));
        });
        media.forEach((m) => {
          anims.push(
            root.animate([{ opacity: 0 }, { opacity: 1 }], {
              delay: S(MEDIA_START),
              duration: S(MEDIA_MS),
              easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              fill: "both",
              pseudoElement: `::view-transition-new(${m.name})`,
            }),
          );
        });
      })
      .catch(() => {});

    vt.finished
      .finally(() => {
        cancelAnimationFrame(raf);
        anims.forEach((a) => a.cancel());
        svg.remove();
        style.remove();
        lensStyle.remove();
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
