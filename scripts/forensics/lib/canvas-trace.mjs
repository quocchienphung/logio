// Records what a page paints on one 2D canvas, together with the input events that caused it.
// This reads the *output* of a public preview in a real browser (shapes, colours, text, timing); it never reads or downloads the component's source.
//
// A frame is stored compactly: { t, now, polys: [{ p: [x,y,...], f, s, w, a }], labels: [...], lines: [...], other: [[op, ...args]] }
// where `f` is the fill colour, `s` the stroke colour (when the same path was stroked), `w` the line width and `a` the global alpha.

export const traceInit = (canvasClass) => `(() => {
  const want = ${JSON.stringify(canvasClass)};
  const state = window.__trace = { rec: false, frames: [], events: [], marks: [], cur: null, gradients: new WeakMap(), nextGradient: 1, styles: new WeakMap() };
  const proto = CanvasRenderingContext2D.prototype;
  const r2 = v => typeof v === 'number' ? Math.round(v * 100) / 100 : v;
  const mine = ctx => !!ctx.canvas && String(ctx.canvas.className).includes(want);
  const styleOf = ctx => { let s = state.styles.get(ctx); if (!s) { s = { fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1, path: [], stack: [] }; state.styles.set(ctx, s); } return s; };
  function frame(ctx) {
    if (!state.cur) {
      state.cur = { t: performance.now(), now: performance.now(), polys: [], labels: [], lines: [], other: [], raf: false, size: [ctx.canvas.width, ctx.canvas.height] };
      queueMicrotask(() => { if (state.cur && !state.cur.raf) { state.frames.push(state.cur); state.cur = null; } });
    }
    return state.cur;
  }
  const flat = path => { const out = []; for (const p of path) out.push(r2(p[0]), r2(p[1])); return out; };
  const original = {};
  const wrap = (name, fn) => { original[name] = proto[name]; proto[name] = function (...args) { if (state.rec && mine(this)) fn.call(this, args, styleOf(this), frame(this)); return original[name].apply(this, args); }; };
  wrap('save', function (a, s) { s.stack.push({ fillStyle: s.fillStyle, strokeStyle: s.strokeStyle, lineWidth: s.lineWidth, font: s.font, textAlign: s.textAlign, textBaseline: s.textBaseline, globalAlpha: s.globalAlpha }); });
  wrap('restore', function (a, s) { const top = s.stack.pop(); if (top) Object.assign(s, top); });
  wrap('beginPath', function (a, s) { s.path = []; });
  wrap('moveTo', function (a, s) { s.path.push([a[0], a[1]]); });
  wrap('lineTo', function (a, s) { s.path.push([a[0], a[1]]); });
  wrap('closePath', function (a, s) { s.closed = true; });
  wrap('fill', function (a, s, f) { f.polys.push({ p: flat(s.path), f: s.fillStyle, s: null, w: s.lineWidth, a: s.globalAlpha }); });
  wrap('stroke', function (a, s, f) {
    const last = f.polys.at(-1), p = flat(s.path);
    if (last && last.s === null && last.p.length === p.length && last.p.every((v, i) => v === p[i])) { last.s = s.strokeStyle; last.w = s.lineWidth; }
    else f.lines.push({ p, s: s.strokeStyle, w: s.lineWidth, a: s.globalAlpha });
  });
  wrap('fillText', function (a, s, f) { f.labels.push({ text: a[0], x: r2(a[1]), y: r2(a[2]), font: s.font, fill: s.fillStyle, align: s.textAlign, base: s.textBaseline, a: s.globalAlpha }); });
  for (const name of ['strokeText','arc','arcTo','ellipse','rect','roundRect','fillRect','strokeRect','clearRect','bezierCurveTo','quadraticCurveTo','setTransform','transform','translate','scale','rotate','clip','drawImage','setLineDash'])
    wrap(name, function (a, s, f) { f.other.push([name, ...a.map(v => typeof v === 'object' ? JSON.stringify(v) : r2(v)), s.fillStyle, s.strokeStyle, s.globalAlpha]); });
  for (const name of ['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','globalAlpha','globalCompositeOperation','font','textAlign','textBaseline','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','filter','letterSpacing']) {
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d) continue;
    Object.defineProperty(proto, name, { get() { return d.get.call(this); }, set(value) {
      if (state.rec && mine(this)) {
        const s = styleOf(this); let shown = value;
        if (value && typeof value === 'object') shown = 'gradient#' + (state.gradients.get(value) ?? '?');
        if (name in s) s[name] = shown;
        else frame(this).other.push(['prop', name, shown]);
      }
      d.set.call(this, value);
    }, configurable: true });
  }
  for (const name of ['createLinearGradient','createRadialGradient']) {
    const make = proto[name];
    proto[name] = function (...args) {
      const g = make.apply(this, args);
      if (state.rec && mine(this)) { const id = state.nextGradient++; state.gradients.set(g, id); frame(this).other.push([name, id, ...args.map(r2)]); }
      return g;
    };
  }
  const addStop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (offset, color) {
    const id = state.gradients.get(this);
    if (state.rec && id && state.cur) state.cur.other.push(['stop', id, offset, color]);
    return addStop.call(this, offset, color);
  };
  const raf = window.requestAnimationFrame.bind(window);
  state.dom = [];
  const sampleDom = ts => {
    const panel = document.querySelector('[class*="activity-terrain_panel"]'), reset = document.querySelector('[class*="activity-terrain_reset"]'), plotEl = document.querySelector('[class*="activity-terrain_plot"]');
    if (!panel) return;
    state.dom.push({ t: ts, tr: panel.style.transform, show: panel.hasAttribute('data-show'), op: +getComputedStyle(panel).opacity, resetHidden: reset?.hasAttribute('data-hidden'), over: plotEl?.hasAttribute('data-over'), dragging: plotEl?.hasAttribute('data-dragging'), head: panel.firstElementChild?.textContent?.slice(0, 40) });
  };
  window.requestAnimationFrame = cb => raf(ts => {
    if (state.rec) state.cur = { t: ts, now: performance.now(), polys: [], labels: [], lines: [], other: [], raf: true, size: null };
    try { cb(ts); } finally {
      if (state.rec && state.cur) { if (state.cur.polys.length || state.cur.labels.length || state.cur.lines.length || state.cur.other.length) { state.frames.push(state.cur); sampleDom(ts); } state.cur = null; }
    }
  });
  const note = type => event => {
    if (!state.rec) return;
    state.events.push({ type, t: event.timeStamp, x: event.clientX, y: event.clientY, key: event.key, dy: event.deltaY, dx: event.deltaX, ctrl: event.ctrlKey || undefined, shift: event.shiftKey || undefined, id: event.pointerId, target: event.target?.className?.toString?.().slice(0, 60) });
  };
  for (const type of ['pointerdown','pointerup','pointermove','pointerleave','click','keydown','keyup','wheel','touchstart','touchmove']) addEventListener(type, note(type), true);
  state.mark = name => state.marks.push({ name, t: performance.now() });
})();`;

export async function startTrace(page) {
  await page.evaluate(() => { const s = window.__trace; s.frames = []; s.events = []; s.marks = []; s.dom = []; s.cur = null; s.rec = true; s.mark('start'); });
}
export async function stopTrace(page) {
  return page.evaluate(() => { const s = window.__trace; s.mark('stop'); s.rec = false; s.cur = null; return { frames: s.frames, events: s.events, marks: s.marks, dom: s.dom, origin: performance.timeOrigin }; });
}
