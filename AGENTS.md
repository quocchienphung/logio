<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Website Reverse-Engineer Template

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — just run `/clone-website <url1> [<url2> ...]`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Base UI primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **Deployment:** Vercel

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utilities or scoped CSS; avoid inline styles unless behavior needs dynamic values
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/
  app/              # Next.js routes
  components/       # React components
    ui/             # shadcn/ui primitives
    sites/<site>/   # Source-specific components, including extracted SVGs
  lib/
    utils.ts        # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/
  sites/<site>/     # Source-specific images, fonts, video, and other assets
docs/
  research/<site>/  # Page brief, asset map, and inspection evidence
  design-references/ # Screenshots and visual references
scripts/            # Asset download scripts
.agents/
  skills/
    clone-website/  # Canonical cross-agent cloning workflow
.claude/
  commands/
    clone-website.md # Thin Claude Code invocation bridge
```

## Agent Workflow
- Edit `.agents/skills/clone-website/` for cloning-workflow changes. It is the canonical skill used by Codex, Cursor, and OpenCode.
- Keep `.claude/commands/clone-website.md` as a thin Claude Code bridge to the canonical skill; do not duplicate the workflow there.

## This Repository: Stripe Clone
This checkout already holds a stripe.com reconstruction. Read `docs/stripe-handoff.md`, `docs/stripe-component-status.md`, and `docs/stripe-forensics.md` before changing it.
- Homepage: `src/app/page.tsx` + `src/components/stripe/`; product pages: `src/app/(v1)/` and `src/app/(hds)/` + `src/components/sites/stripe-com-*/`.
- Styles in `src/styles/stripe/generated/` and `src/styles/stripe/products/hds-*.css` are generated — put fixes in the matching `*-overrides.css`.
- Assets: `public/stripe/` and `public/sites/`; frozen reference captures: `docs/research/`.
- Visual/QA tooling (Playwright + pixelmatch): `scripts/forensics/`.
- The Sessions slot is an iPhone Duo (three.js + CSS3D) showing the affectUI usage meter as live DOM: `src/components/stripe/Sessions/iphoneDuo/`, `src/components/sites/affectui-usage-meter/`; assets via `scripts/iphone-duo/README.md`.

## affectUI CRM / Guide me
- Read `docs/affectui-handoff.md` before extending affectUI. The public library inventory and shared UI namespace map are in `docs/research/affectui-library/README.md` and `engine-map.json` (109 documented items).
- Guide me links to `/personalize`, implemented by `src/components/sites/affectui-crm/`. The source reference is `https://www.affectui.com/screens/crm/full`.
- `reference.css`, `icons.json` and `seed.json` in that folder are generated from observed public preview evidence; put CSS fixes in `crm-overrides.css`.
- QA: `node scripts/qa/affectui-crm.mjs`; visual comparisons: `node scripts/forensics/affectui-compare.mjs`. Evidence lives in `docs/research/affectui-crm/`.
- The library inventory covers public docs and initial Clean previews. Only CRM is locally rebuilt here; gated Pro source and unobserved states are not part of the capture.
