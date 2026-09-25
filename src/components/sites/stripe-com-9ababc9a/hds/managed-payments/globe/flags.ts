// Country flags for the globe's "flags" UI variant. The reference lazy-loads one SVG component per
// country (chunk 38639 `eD`: AESvg, ARSvg, ...), and those chunks are not in the download mirror, so
// these are redrawn at the same 16px box. Canada and the UK reuse the reference's own 16x12 flag paths
// (managed-payments page bundle, balances graphic `eP` / `eR`); the palette is the reference flag
// palette used on this page (#E25950 red, #43458B blue, #F6F9FC white, #FCD669 yellow, #EAEEF3).
// Green, black, orange, light blue and gold are inferred. Flags are national marks shown like the
// homepage globe's wallet badges, so they keep their colours (docs/research/MONOCHROME_SYSTEM.md).
// Only the 26 countries the flags variant can pick (sellers + buyers in config.ts) are drawn.

const R = "#E25950";
const B = "#43458B";
const W = "#F6F9FC";
const Y = "#FCD669";
const G = "#2F9E62"; // inferred
const K = "#1A1F36"; // inferred
const O = "#F29A4A"; // inferred
const L = "#7FB4E6"; // inferred
const GOLD = "#E8B84A"; // inferred

const hBands = (colors: string[]) => {
  const h = 12 / colors.length;
  return colors.map((c, i) => `<rect y="${(i * h).toFixed(3)}" width="16" height="${h.toFixed(3)}" fill="${c}"/>`).join("");
};
const vBands = (colors: string[]) => {
  const w = 16 / colors.length;
  return colors.map((c, i) => `<rect x="${(i * w).toFixed(3)}" width="${w.toFixed(3)}" height="12" fill="${c}"/>`).join("");
};
const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
};
const unionCanton =
  `<rect width="8" height="6" fill="${B}"/>` +
  `<path d="M0 0L8 6M8 0L0 6" stroke="${W}" stroke-width="1.3"/><path d="M0 0L8 6M8 0L0 6" stroke="${R}" stroke-width=".45"/>` +
  `<path d="M4 0V6M0 3H8" stroke="${W}" stroke-width="2"/><path d="M4 0V6M0 3H8" stroke="${R}" stroke-width="1.1"/>`;

const US_STARS = [
  [1.2, 1],
  [3.5, 1],
  [5.8, 1],
  [2.35, 2.2],
  [4.65, 2.2],
  [1.2, 3.4],
  [3.5, 3.4],
  [5.8, 3.4],
  [2.35, 4.6],
  [4.65, 4.6],
  [1.2, 5.8],
  [3.5, 5.8],
  [5.8, 5.8],
]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".42" fill="${W}"/>`)
  .join("");

const FLAGS: Record<string, string> = {
  US:
    `<rect width="16" height="12" fill="${W}"/>` +
    Array.from({ length: 7 }, (_, i) => `<rect y="${(i * 1.846).toFixed(3)}" width="16" height=".923" fill="${R}"/>`).join("") +
    `<rect width="7" height="6.46" fill="${B}"/>` +
    US_STARS,
  // Reference path (balances graphic `eP`).
  CA:
    `<path fill="${W}" d="M5 0H11V12H5V0Z"/><path fill="${R}" fill-opacity="0.1" d="M11 12H5V11H11V12ZM11 1H5V0H11V1Z"/>` +
    `<path fill="${R}" d="M5 12H2C.89543 12 0 11.1046 0 10V2C0 .89543.89543 0 2 0H5V12ZM14 0C15.1046 0 16 .89543 16 2V10C16 11.1046 15.1046 12 14 12H11V0H14Z"/>` +
    `<path fill="${R}" fill-rule="evenodd" clip-rule="evenodd" d="M7.67286 7.28257 6.67357 7.27686 6.8 6.69186 5.5 6.494l.46214-.855-.41428-1.13214L6.68571 4.95971 7.02214 3.66114 7.52071 3.91543 7.99786 2.999 8.54071 3.90186 8.98429 3.69757 9.19786 4.95257 10.4643 4.55471 10.075 5.60471 10.5 6.48686 9.24286 6.69186 9.35786 7.27114 8.32786 7.26114 8.33357 8.679 7.675 8.69257 7.67286 7.28257Z"/>`,
  // Reference path (balances graphic `eR`).
  GB:
    `<path fill="${B}" d="M16 10C16 11.1046 15.1046 12 14 12H2C.895431 12 0 11.1046 0 10V2C0 .895431.895431 0 2 0H14C15.1046 0 16 .895431 16 2V10Z"/>` +
    `<path fill="${W}" d="M13.5 0 14 0C15.1046 0 16 .895431 16 2L13.5 4H16V8H13.5L16 9.5V10C16 11.1046 15.1046 12 14 12H13L10 9.5V12H6V9.5L2.5 12H2C.895431 12 0 11.1046 0 10L2.5 8H0V4H2.5L0 2C0 .895431.895431 0 2 0H2.5L6 2.5V0L10 0V2.5L13.5 0Z"/>` +
    `<path fill="#EAEEF3" d="M1 5H0V4H1V5ZM16 5H15V4H16V5ZM3.90039 1H2C1.44772 1 1 1.44772 1 2V2.7998L0 2C.00000015 .89543.895431 0 2 0H2.5L3.90039 1ZM14 0C15.1046 0 16 .89543 16 2L15 2.7998V2C15 1.44772 14.5523 1 14 1H12.0996L13.5 0H14ZM10 1H6V0H10V1Z"/>` +
    `<path fill="${R}" d="M9 5H16V7H9V12H7V7H0V5H7V0H9V5ZM1.20508 11.8359C.806767 11.6632.475423 11.3644.261719 10.9902L4 8H6L1.20508 11.8359ZM15.7383 10.9902C15.5246 11.3644 15.1932 11.6632 14.7949 11.8359L10 8H12L15.7383 10.9902ZM6 4H4L.261719 1.00977C.475423.635551.806767.336759 1.20508.164062L6 4ZM14.7939.164062C15.1926.336713 15.5245.635336 15.7383 1.00977L12 4H10L14.7939.164062Z"/>`,
  MX: vBands([G, W, R]) + `<circle cx="8" cy="6" r="1.35" fill="#B8863B"/>`,
  BR: `<rect width="16" height="12" fill="${G}"/><path d="M8 1.5L14.5 6L8 10.5L1.5 6Z" fill="${Y}"/><circle cx="8" cy="6" r="2.6" fill="${B}"/><path d="M5.6 5.3C7.2 4.8 9 5.1 10.5 6.3" stroke="${W}" stroke-width=".5"/>`,
  AR: hBands([L, W, L]) + `<circle cx="8" cy="6" r="1.15" fill="${Y}"/>`,
  CO: `<rect width="16" height="6" fill="${Y}"/><rect y="6" width="16" height="3" fill="${B}"/><rect y="9" width="16" height="3" fill="${R}"/>`,
  FR: vBands([B, W, R]),
  DE: hBands([K, R, Y]),
  ES: `<rect width="16" height="12" fill="${R}"/><rect y="3" width="16" height="6" fill="${Y}"/>`,
  NL: hBands([R, W, B]),
  IE: vBands([G, W, O]),
  PT: `<rect width="16" height="12" fill="${R}"/><rect width="6.4" height="12" fill="${G}"/><circle cx="6.4" cy="6" r="2" fill="${Y}"/><circle cx="6.4" cy="6" r="1" fill="${W}"/>`,
  NG: vBands([G, W, G]),
  KE:
    `<rect width="16" height="12" fill="${W}"/><rect width="16" height="3.6" fill="${K}"/><rect y="4.2" width="16" height="3.6" fill="${R}"/><rect y="8.4" width="16" height="3.6" fill="${G}"/>` +
    `<ellipse cx="8" cy="6" rx="1.5" ry="3.1" fill="${R}" stroke="${K}" stroke-width=".4"/>`,
  EG: hBands([R, W, K]) + `<rect x="7.3" y="4.9" width="1.4" height="2.2" rx=".4" fill="${GOLD}"/>`,
  ZA:
    `<rect width="16" height="6" fill="${R}"/><rect y="6" width="16" height="6" fill="${B}"/>` +
    `<path d="M0 0L6.5 6L0 12M6.5 6H16" stroke="${W}" stroke-width="3.6"/><path d="M0 0L6.5 6L0 12M6.5 6H16" stroke="${G}" stroke-width="2.2"/>` +
    `<path d="M0 1.9L4.6 6L0 10.1Z" fill="${Y}"/><path d="M0 2.8L3.6 6L0 9.2Z" fill="${K}"/>`,
  SN: vBands([G, Y, R]) + star(8, 6, 1.7, G),
  JP: `<rect width="16" height="12" fill="${W}"/><circle cx="8" cy="6" r="3.1" fill="${R}"/>`,
  IN: hBands([O, W, G]) + `<circle cx="8" cy="6" r="1.4" stroke="${B}" stroke-width=".5"/>`,
  KR:
    `<rect width="16" height="12" fill="${W}"/><path d="M5.3 6A2.7 2.7 0 0 1 10.7 6Z" fill="${R}"/><path d="M5.3 6A2.7 2.7 0 0 0 10.7 6Z" fill="${B}"/>` +
    `<g stroke="${K}" stroke-width=".45"><path d="M1.6 3.4L3.2 1.6M2.2 3.9L3.8 2.1"/><path d="M12.8 1.6L14.4 3.4M12.2 2.1L13.8 3.9"/><path d="M1.6 8.6L3.2 10.4M2.2 8.1L3.8 9.9"/><path d="M12.8 10.4L14.4 8.6M12.2 9.9L13.8 8.1"/></g>`,
  TH: `<rect width="16" height="12" fill="${R}"/><rect y="2" width="16" height="8" fill="${W}"/><rect y="4" width="16" height="4" fill="${B}"/>`,
  AE: hBands([G, W, K]) + `<rect width="4" height="12" fill="${R}"/>`,
  PH: `<rect width="16" height="6" fill="${B}"/><rect y="6" width="16" height="6" fill="${R}"/><path d="M0 0L7.2 6L0 12Z" fill="${W}"/><circle cx="2.5" cy="6" r="1.1" fill="${Y}"/>`,
  AU:
    `<rect width="16" height="12" fill="${B}"/>` +
    unionCanton +
    star(4, 9.2, 1.3, W) +
    [
      [12, 2.4],
      [10.2, 5.6],
      [13.9, 5],
      [12, 9.8],
    ]
      .map(([x, y]) => star(x, y, 0.75, W))
      .join(""),
  NZ:
    `<rect width="16" height="12" fill="${B}"/>` +
    unionCanton +
    [
      [12, 2.4],
      [10.2, 5.6],
      [13.9, 5],
      [12, 9.8],
    ]
      .map(([x, y]) => star(x, y, 0.95, W) + star(x, y, 0.6, R))
      .join(""),
};

let uid = 0;

/** SVG markup for a country flag (16x12 inside the overlay's 16px box), or null if not drawn. */
export function flagSvg(code: string): string | null {
  const body = FLAGS[code];
  if (!body) return null;
  uid += 1;
  const id = `mp-globe-flag-${uid}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">` +
    `<defs><clipPath id="${id}"><rect width="16" height="12" rx="2"/></clipPath></defs>` +
    `<g clip-path="url(#${id})">${body}</g></svg>`
  );
}
