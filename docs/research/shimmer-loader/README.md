# Shimmer Loader → loading skeletons for every workspace page

Source: https://www.affectui.com/motion/shimmer-loader (public preview and public docs only; the gated Code tab, prompts, registry and CLI were not opened).

**Route map.** source `…/motion/shimmer-loader` → `src/components/sites/shimmer-loader/` → used by the workspace shell (`affectui-crm/Crm.tsx`), the lazy-loaded section placeholders, and the data-loading state of Process, Tracing, Mapping and Invoice.

## Evidence in this folder

`source-page.png`, `source-desktop.png`, `source-mobile.png`, `source-main.html`, `observed-rules.css`, `source-docs.txt`. Regenerate with `node scripts/forensics/notification-shimmer-inspect.mjs`.

## What was observed

- `Skeleton` (width, height, radius, circle): a block with a base fill (#ececec light, #2f2f33 dark) and a light band `linear-gradient(100deg, transparent 30%, glow 50%, transparent 70%)` that is **150vw wide, repeat-x and `background-attachment: fixed`**, swept by one animation (`-50vw → 100vw`, 2.2 s linear, infinite). Because the band is pinned to the viewport, every block on the page shows the same sweep traveling across them together.
- `ShimmerText`: real text in a muted ink with a 300% wide gradient clipped to the text (`background-clip: text`), 2 s linear.
- Skeletons are `aria-hidden`; the loading container carries `aria-busy="true"`. Reduced motion: static placeholders and plain text. Dark mode follows `.dark` / `data-theme="dark"`.
- Guidance (docs): use them while cards, lists or profiles load, shaped like what will arrive; **not** for waits under ~300 ms (a flash of skeletons feels slower than nothing) or for progress you can measure.

## What was built

| File | What |
|---|---|
| `Shimmer.tsx`, `shimmer-loader.css` | `Skeleton` and `ShimmerText` with the observed values (class names `shm`, `shm-text`) |
| `skeleton-kind.ts` (+tests) | Which skeleton a section gets (10 kinds), and the screen-reader label |
| `SectionSkeleton.tsx` | The page skeletons: home, table (Companies, Contacts, Deals, pipelines), reports, chat, files, run, canvas (Mapping, Process: a dotted canvas with floating controls and ghost blocks), trace (Tracing), invoice, settings |
| `WorkspaceShellSkeleton.tsx` | A sidebar + the page skeleton, for while the workspace's own code loads |

**Appear-after-a-delay.** A page skeleton fades in only after 140 ms (CSS animation delay, so it works in server HTML with no script): a fast load never flashes it. `data-immediate` removes the delay.

## The reload bug this fixes

Every reload used to show the **Companies** page first, whatever page the address named: the server (and the first client render, which must match it) only knew “Companies” as the route, and the seed data of the default workspace was shown until the saved data was read. Now:

1. The server reads `?section=` and `?crm-view=` (`app/personalize/page.tsx`) and passes them down; `useWorkspaceRoute` uses them for server rendering and hydration, so the first HTML is the right page's skeleton (checked with scripts disabled).
2. The workspace shows the page's skeleton until the workspace list, the active workspace, the profile and the preferences have been read once (`Crm.tsx`; the sidebar's name and the Companies count are skeletons too, and nothing is gated again after the first read).
3. Every lazy section placeholder (“Loading process…”) is that page's skeleton, as is the in-page data-loading state of Process, Tracing, Mapping and Invoice.
4. The store's hydration snapshot always says “loading”, like the server (it used to say “ready” in a browser that already had saved data, which made hydration disagree with the markup).

## Verification

`node scripts/qa/skeleton.mjs` (8 checks): the first HTML of 12 sections holds that section's skeleton and no Companies table; without any script the first paint is the skeleton; with every script delayed, no frame of a reload to Process, Tracing, Files or Mapping shows the Companies page, a skeleton shows, then the page replaces it; all blocks share one fixed sweep and the dark colors; reduced motion is static; the delay and the polite label; phone widths without horizontal scroll; every section then loads with no errors. Unit tests: `skeleton-kind.test.mjs`. Not covered: pages outside the workspace (the Stripe clone), and the guide (`?browse=1`) which has its own lazy placeholders.
