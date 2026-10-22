# Repo, and what moved around it

Updated 2026-10-22. Route: `/personalize?section=repo`; sidebar entry directly under **Skilled**.

## Current state

- **Repo** shows one component: the Activity terrain ("The shape of your week"), moved from the bottom of Skilled. It reads the same recorded `skill-events` as before (`src/components/sites/repo/Repo.tsx`, terrain code in `src/components/sites/skilled/terrain/`, see `docs/research/uiarc-terrain/README.md`). Everything that an earlier iteration had put in Repo (repository manager, GitHub scan API, suggestions, home-server card) was deleted at the user's request.
- **Skilled** no longer has the terrain or the "Skill sources" cards. Its left column has a Metric card row (Ready skills, Skills added, Deliveries, Instruction data; 7D/30D/90D, odometer digits, sparkline) and a Timeline (grouped by day, expandable rows, setup stepper until all four steps are real). Every number comes from saved skills and recorded operations.
- **Home-server API** (`/api/workspace/*`, kept): the app serves the workspace REST contract from files, including `skill.transfer` into an agent skills folder. See "Built-in home-server API" in `docs/backend-api.md` and `.env.example`.

## UIArc components (clean-room)

Only the rendered public docs were inspected (`scripts/forensics/uiarc-repo-inspect.mjs`; text, screenshots and motion in `docs/research/uiarc-repo/`): Metric card, Sparkline, Timeline, Onboarding checklist, Animated counter. The implementation is independent code on this workspace's tokens (`src/components/sites/skilled/ui/`). No UIArc API, registry, CLI or Pro source was used.

## Limits

- The Skilled import still reads public GitHub archives through its own composer; the catalog of suggested sources no longer exists anywhere.
- Switching from browser storage to the home-server backend does not copy existing browser data. The API has no per-person accounts: access is a shared token or LAN-only. Nothing runs in the background.
- `scripts/qa/guide-navigation.mjs` already failed before this work (it expects two homepage links).

## Verification

`node scripts/qa/repo.mjs` (22 checks: sidebar order, terrain gone from Skilled and alone on Repo, metric cards/timeline, terrain controls, mobile overflow, file-store API incl. 304/412/CSRF/path tricks, `skill.transfer`, Skilled saving to the home-server backend), `npm test`, typecheck, lint. Screenshots `local-*.png`, results `qa-results.json`. No physical phone, real agent or token-authenticated browser flow was tested.
