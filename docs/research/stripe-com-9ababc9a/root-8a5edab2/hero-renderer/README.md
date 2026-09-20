# Frozen hero renderer findings

Sources: frozen-dom.html, its observed stylesheet and script URLs. No application source was edited.

## Exact files

- CSS source: https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/e5be0f41b7fa7f3f.css
- Hero JS: https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/chunks/68654-0ccff603146a8ff7.js
- Homepage config selection: https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/chunks/pages/index-598fe7b339d40ae3.js
- Palette: https://images.stripeassets.com/fzn2n1nzq965/5DrmXrFYpKk43Kj0I1MXQr/287b3c2a13ae8d4d7d0bf8305037de4e/palette.png?fm=webp&q=95
- All observed script URLs: ../script-urls.json; downloaded originals in ../scripts.
- Relevant decoded modules: ../scripts/modules. Renderer=4014, mesh/geometry/material=82401, configs=89224, React lifecycle/fallback=96173, Issuing renderer=51310, Three.js=95145.
- Decoded shaders here: wave.vert, wave-light.frag, wave-dark.frag, post.vert, post.frag. wave-alternate.vert is NOT the homepage shader; it is a distinct later config.
- Exact JSON configurations here: configs.json. Homepage uses gj/P1/y7 exports: desktop/tablet/mobile.

## Practical reconstruction

The live canvas identifies Three.js r178. The original is a deformed folded plane with UV palette colouring, not a gradient background image or a moving gradient stop. A small Three.js ShaderMaterial renderer is the simplest faithful dynamic reconstruction, if introducing Three.js fits the repository.

Geometry: PlaneGeometry(400,400,128,256). For each vertex, let p = 4 - 2 * pow(4*uv.y*(1-uv.y),9.5). If x < -16 add p to z; if -16 <= x < 16 set z=cos(map(x,-16,16,0,PI))*p and x=cos(map(x,-16,16,-PI/2,PI/2))*p-16; else subtract p from z and negate x. Then add 100 to x; rotate about X by -PI/2, then Y by -PI/2. Recompute vertex normals. The original optionally constructs this in a worker, but the geometry is created once and shared.

The vertex shader applies simplex-noise displacement in Y using the geometry X/Z coordinates, then three static UV-dependent twist matrices. Only u_time drives continuous motion; no CSS camera/pointer tilt is used in the hero. Exact mesh transforms and uniform values are in configs.json. Default desktop speed=0.00004, offset=17500, position=(380,-301.7,-11.1), scale=(9,8,5), rotation=(-0.44959265,-0.11759265,1.87440735).

CRITICAL: renderer.update sets waveMesh.time = config.timeOffset + elapsed; the mesh time setter adds its own timeOffset AGAIN. Effective initial u_time is 35000. The animation intro ramps elapsed by introTimeRamp; introTimeRamp grows .016 each rendered frame, capped at 1. First frame returns before increment. Render loop frameInterval=2 (~30fps at 60Hz), pauses out of viewport, pauses for reduced motion/dialog/menu, and subtracts paused elapsed time on resume.

Renderer alpha=true, antialias=false for light theme, DPR=min(devicePixelRatio,2), transparent black clear. Orthographic camera frustum is +/- half canvas CSS size, near=1, far=10000, position=(100, ~0,5000), lookAt(0,0,0), zoom=1. Double-sided ShaderMaterial with custom blending and depth writes/tests. Palette repeat wraps both axes. Fragment colour uses palette UVs, derivative-based pale glow, static fine simplex bands, then contrast/saturation/hue constants.

Desktop non-touch uses render target and postprocess: 6 angular blur samples, blurAmount=.02, grainAmount=1.1, diffuseBlur=0. Coarse touch devices skip this pass. Shaders here include resolved helpers and can be read directly rather than guessed.

## Responsive placement

.hero-wave-animation is absolute inset:0, flex centered. __layout is relative 100% width/height, max-width token hds-canary-layout-content-maxWidth-borders. __contents is absolute top:0,left:0,width:100%,height:100%. At min-width:1264px only: left:250px;width:110%. Canvas remains relative width/height 100%.

Breakpoints: <=639 mobile; 640-1263 tablet; >=1264 desktop. Tablet overrides desktop mesh positionX=525, rotationX=-.64, rotationZ=1.68. Mobile overrides positionX=320, positionY=-315, rotationX=-.5, rotationZ=1.64. Other fields remain desktop values.

Fallback is centered at 50%/50%, transform translate(-50%,-50%), fixed 975px image height. Widths: desktop 1392, tablet1248, mobile624. Fallback fades opacity in .25s linear after first WebGL draw. Exact fallback URLs are in module 96173 and frozen DOM.

Hero background starts at negative navigation height. Heading is drawn twice: original background heading then foreground clone with hard-light mix blend, allowing ribbon interaction with text. Foreground title main colour #2d2564; the heading other copy foreground rgba(0,14,255,.5). Without this layered blending, colour changes over the ribbon will not match.

Hero title CSS uses max(min(6lvh,var(--hero-font-lang-large)),var(--hero-font-lang-min)) in English, max-width:32ch, line-height:1.15 desktop or 1.03 <=639. Body copy inside H1 is display:none only at <=639px. Grid is 12 columns, shared gaps, content starts at column2 and ends column12 at >=940; otherwise columns1-12. See ../hero-css-extracted.txt for remaining selectors, but its simple extraction drops media-query closing braces; ../hero-styles-source.css preserves all exact scope.
