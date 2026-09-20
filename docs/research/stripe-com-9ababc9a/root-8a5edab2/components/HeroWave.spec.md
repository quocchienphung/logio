# HeroWave specification

Target: src/components/sites/stripe-com-9ababc9a/root-8a5edab2/HeroWave.tsx and motion/ renderer modules.

Reference: reference-hero-1440.png and reference-hero-390.png in the page screenshot namespace. Shader/config evidence is in hero-renderer/README.md and decoded files beside it.

Interaction: time driven noise displacement. No pointer tilt. Initial effective shader time 35000. Frame interval 2; ramp elapsed .016 per rendered frame to 1. Pause offscreen, on document hidden and reduced motion. Static official responsive image fallback on renderer failure and reduced motion.

DOM: .hero-wave-animation > .hero-wave-animation__layout > .hero-wave-animation__contents > canvas and fallback picture. Wrapper fills hero background including navbar. At >=1264: contents left 250px, width 110%; else left 0,width 100%. Fallback centered width 1392/1248/624px desktop/tablet/mobile, height 975px. Canvas 100% dimensions.

Rendered at 1440: canvas box x329.4,y0,width1392.6,height828.8. Main hero layout includes 680px content area and 72.8px logo strip after 76px navbar.

Breakpoints: mobile <=639; tablet640..1263; desktop>=1264. Camera, mesh, palette and all uniform settings measured in the decoded public renderer. Preserve exact settings in configs.json. Use Three.js 0.178.0. Do not approximate folded shape with CSS.

Assets: public local asset mapping in local-assets.json. Hero palette is original palette.png, not issuing-palette.png. Background uses official wave-fallback-desktop/tablet/mobile URLs observed in frozen DOM.

Typography, links and content: N/A decorative renderer, aria-hidden. No shadow/padding/radius on canvas. Hero text implemented separately by root.
