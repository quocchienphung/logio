// Live SVG viewports retain the photographed moulding and its real corner joints.
// Source: The Met Open Access, Cassetta frame (CC0); warm toning is applied in SVG.
const columns = [[32, 192, 0, 38], [224, 960, 38, 924], [1184, 198, 962, 38]];
const rows = [[94, 188, 0, 38], [282, 1313, 38, 724], [1595, 197, 762, 38]];

export function FrameCraft() {
  return <svg className="frame-craft" viewBox="0 0 1000 800" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <filter id="studio-gold-tone" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="table" tableValues=".12 .39 .67 .86 .97" />
          <feFuncG type="table" tableValues=".08 .25 .46 .68 .85" />
          <feFuncB type="table" tableValues=".035 .10 .22 .40 .64" />
        </feComponentTransfer>
      </filter>
      <mask id="studio-frame-reveal" maskUnits="userSpaceOnUse" x="-40" y="-40" width="1080" height="880">
        <path data-frame-stroke d="M500 19H941Q981 19 981 59V741Q981 781 941 781H59Q19 781 19 741V59Q19 19 59 19H500Z"
          stroke="white" strokeWidth="100" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4000" strokeDashoffset="4000" />
      </mask>
    </defs>
    <g mask="url(#studio-frame-reveal)" filter="url(#studio-gold-tone)">
      {rows.flatMap(([sy, sh, y, height], row) => columns.map(([sx, sw, x, width], col) => row === 1 && col === 1 ? null :
        <svg key={`${row}-${col}`} x={x} y={y} width={width} height={height} viewBox={`${sx} ${sy} ${sw} ${sh}`} preserveAspectRatio="none" overflow="hidden">
          <image href="/sites/guide-intro/cassetta-frame-met.jpg" width="1419" height="1828" />
        </svg>))}
    </g>
  </svg>;
}
