# Monochrome visual system

The site UI renders in black / grey / white. Colour is created with luminance, transparency, shadow and
gradient instead of hue. **Third-party brand logos are exempt and keep their official colours**: the hero
logo strip, Google "G", partner/platform marks in the Developers section, payment-network and
payment-method marks (Visa, Affirm, Klarna, Cash App, PayPay, FamilyMart), wallet badges on the globe,
case-study covers and testimonial/enterprise logos. Stripe's own marks (Stripe, Link, Atlas), fictional
demo merchants (Daybreak Yoga…), generic card/bank icons and all UI icons are monochrome. Logo colours
are never reused as UI accents, and no container holding a logo carries a colour filter.

There is no page-level `filter: grayscale()`. Every layer is remapped at its source:

| Layer | Where | Notes |
| --- | --- | --- |
| Design tokens | `src/styles/stripe/mono.css` (top) | `--mono-*` ramp, then every `--hds-color-core-*` hue family mapped to a luminance role (brand → near-black actions, orange → silver, magenta → mid grey, ruby → medium-dark, lemon → light). Links `#333 → #000`, secondary buttons white / `#cfcfcf` border. |
| Component CSS the reference hard-codes | `mono.css` (component blocks, grouped by source file) | Gradients keep their stops; status badges keep meaning through text/border. Charts use three luminance steps (`#1a1a1a / #6a6a6a / #b4b4b4`). |
| Section rhythm | `mono-band--050/075` classes on Solutions and CTA sections | `#f7f7f7` / `#f2f2f2` bands, colour only. |
| Hero ribbon (WebGL) | `Hero/wave/shaders.ts` → `MONO_KEYS_LIT` / `MONO_KEYS_DEEP` / `MONO_KEYS_DARK` | The palette texture is unchanged; the shader maps each hue band to a designed grey. Two key sets for the light theme: `DEEP` (black-anchored, the ribbon's default) and `LIT` (the original lighter mapping) blended per fragment by `u_monoDeep`/`u_monoLit`. `u_monoGamma` (2.15 on the hero) deepens mids while leaving specular highlights at 1.0. The light shader `sqrt`-compensates the `src*src` blending. `u_monoRange` compresses the issuing card into charcoal → silver. |
| Hero type legibility | `WaveRenderer.updateMonoLit()`, `HeroWave.tsx` (`litSelector`) | The headline is composited over the ribbon with a multiplying hard-light blend, so the secondary copy is **always ≈0.5 × the luminance behind it** — darkening the ribbon sinks the type one-for-one. The renderer measures the `h1` box against the canvas each resize and keeps that patch on the `LIT` mapping (soft `u_monoLitFeather` falloff, 0.15/0.15), so glyph contrast stays at the pre-darkening baseline (p5 ≈ 1.2, median ≈ 3.1) while the rest of the ribbon runs to near-black. Widen the feather and the ribbon washes out; narrow it and the last words sink. |
| Issuing card | `graphics/issuing/*`, `public/stripe/issuing_card_fg-mono.webp` | Foreground texture desaturated (neutral shadow/border) with the Visa logo pixels byte-identical. |
| Stablecoin globe | `graphics/globe/GlobeRenderer.ts`, `globe/config.ts` | Dots `#1c1c1c → #6a6a6a → #b0b0b0` + depth fade; arcs charcoal/mid/faint; markers black core / mid ring / light halo. Wallet badge SVGs (Phantom, MetaMask…) are untouched brand marks. |
| Stats dataviz | `Stats/dataviz/core.ts` | Line palettes run near-black (top) → white (bottom) over the luminance time-of-day gradients in `mono.css`. |
| Agentic particles | `graphics/agentic/shaders.ts` | Mid grey → charcoal vertical ramp. |
| Inline SVG demos | `Developers.tsx`, `ConnectGraphic.tsx`, `PaymentsGraphic.tsx`, `Business/*.tsx` | Non-logo fills (connectors, radios, fictional merchant marks, generic card/bank icons, Stripe/Link/Atlas marks) mapped with the hue → luminance curve and hand-tuned. Brand logo SVGs keep their original fills (`Hero/logos.tsx` fallbacks are the official values). |
| Raster assets | `scripts/mono-assets.py` → `public/stripe/*-mono.*` | Ribbon-style visuals use the hue → luminance curve; photos use luminance; WebGL fallbacks on black use the lifted curve. Brand artwork listed in `BRAND` (case-study covers) is skipped and served as the original. Re-run the script after adding assets; it rewrites `src` / `srcSet` references. |

## Known environment quirk

The developers-section wave uses the reference shader's `clamp(0.0, 1.0, v_clipPosition.z * 6.0)`
(arguments in the reference order). SwiftShader (headless Chromium) resolves it to a full fade, so the
wave is invisible in headless screenshots; real GPUs render it. Left as in the reference on purpose.
