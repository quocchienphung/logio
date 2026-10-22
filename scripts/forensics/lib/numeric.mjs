// Small numeric helpers for the forensics scripts: homography, linear solve, Levenberg–Marquardt.
export function solveLinear(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map(row => row[n]);
}

/** Homography mapping src[i] -> dst[i] (4+ points), returns 3x3 as 9 numbers. */
export function homography(src, dst) {
  const A = [], b = [];
  src.forEach(([x, y], i) => {
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  });
  // normal equations for over-determined systems
  const n = 8, AtA = Array.from({ length: n }, () => new Array(n).fill(0)), Atb = new Array(n).fill(0);
  A.forEach((row, r) => { for (let i = 0; i < n; i++) { Atb[i] += row[i] * b[r]; for (let j = 0; j < n; j++) AtA[i][j] += row[i] * row[j]; } });
  const h = solveLinear(AtA, Atb);
  return [...h, 1];
}
export const applyH = (H, [x, y]) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
export function invertH(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** Levenberg–Marquardt with a numerical Jacobian. residual(params) -> number[]; returns { x, cost, iterations }. */
export function lm(residual, x0, { iterations = 200, lambda = 1e-2, step = 1e-5, tol = 1e-12 } = {}) {
  let x = x0.slice(), r = residual(x), cost = r.reduce((s, v) => s + v * v, 0), lam = lambda, it = 0;
  for (; it < iterations; it++) {
    const n = x.length, m = r.length, J = Array.from({ length: m }, () => new Array(n));
    for (let j = 0; j < n; j++) {
      const h = step * Math.max(1, Math.abs(x[j])), xp = x.slice(); xp[j] += h;
      const rp = residual(xp);
      for (let i = 0; i < m; i++) J[i][j] = (rp[i] - r[i]) / h;
    }
    const JtJ = Array.from({ length: n }, () => new Array(n).fill(0)), Jtr = new Array(n).fill(0);
    for (let i = 0; i < m; i++) for (let a = 0; a < n; a++) { Jtr[a] += J[i][a] * r[i]; for (let b = 0; b < n; b++) JtJ[a][b] += J[i][a] * J[i][b]; }
    let improved = false;
    for (let tries = 0; tries < 12; tries++) {
      const A = JtJ.map((row, a) => row.map((v, b) => v + (a === b ? lam * (JtJ[a][a] || 1) : 0)));
      const dx = solveLinear(A, Jtr.map(v => -v));
      const xn = x.map((v, i) => v + dx[i]);
      const rn = residual(xn), cn = rn.reduce((s, v) => s + v * v, 0);
      if (Number.isFinite(cn) && cn < cost) { const gain = cost - cn; x = xn; r = rn; cost = cn; lam = Math.max(1e-9, lam / 3); improved = true; if (gain < tol) return { x, cost, iterations: it }; break; }
      lam *= 4;
    }
    if (!improved) break;
  }
  return { x, cost, iterations: it };
}
