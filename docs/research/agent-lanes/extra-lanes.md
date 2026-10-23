# Agent Lanes (CRM frame): two extra lanes, Hermes Agent and Ollama

Added 2026-10-20 on top of the Agent Lanes work in [README.md](README.md). That README describes the reference lanes and stays as written; this file only covers what was added after it, and where the two meet.

## What changed

The CRM frame of `/personalize?browse=1` showed a compact 279px card centered in a 401px frame, leaving about 63px of blank space above and below. Two lanes were duplicated below the reference's four (Researcher, Writer, Reviewer, Ops) so the card fills the frame:

| Lane | Avatar | Tasks (illustrative demo content, like the reference lanes) |
| --- | --- | --- |
| 5 · Hermes (`Hermes Agent`) | Hermes Agent mark | Triage inbox (done), Draft replies (running) |
| 6 · Local (`Ollama`) | Ollama mark | Index docs (done), Local eval (running) |

The blocks reuse the reference's own block, tool-logo, tooltip and timeline behavior (same component, same clock), so a new block opens the same dark tooltip with its summary. No new "Needs you" task was added: the header reads `4 running · 1 need you`. No handoff curves were added.

## Where the logos come from

- **Hermes Agent** and **Ollama** are the published marks from the `@lobehub/icons-static-svg` package, pinned to 1.95.1 (MIT, `https://github.com/lobehub/lobe-icons`): `icons/hermesagent.svg` and `icons/ollama.svg`. `scripts/forensics/agent-lanes-extra-marks.mjs` downloads them and writes `extra-marks.generated.ts` (do not edit by hand). The script only accepts `<path>` elements and refuses scripting, links and styles. No mark is drawn by hand.
- The attached `hermesagent-color.svg` contained only the text `404: Not Found`, so it could not be used; the package has no `-color` variant of Hermes Agent, only the single-color `hermesagent.svg`. The attached `ollama-seeklogo.svg` was not on disk, so the same package's `ollama.svg` was used instead of retyping about 8KB of path data by hand. Both are single-color and follow the lane's strong text color (white in dark mode). To use the attached Ollama file instead, replace the `ollama` entry in `extra-marks.generated.ts` (or change the script's file list).
- The model labels are `Hermes Agent` and `Ollama` (no version numbers were invented). The names are hidden at the frame's width (the container rule of the reference), so only the marks show; they appear in `title` and the accessible label.

## How it fits (responsive)

A lane row is a fixed 48px and a card is `87px + 48px × lanes`, with the card centered. Scaling the card would shift the approval popover (it measures with `getBoundingClientRect`), so the number of lanes follows the **frame height** instead (`FittedLanes`, a `ResizeObserver` read through `useSyncExternalStore`):

`lanes = min(6, floor((frame height − 87) / 48))`, never fewer than the reference's 4.

When trimming the card's own padding buys one more lane (only frames of about 361-374px, i.e. 390/393px phones), the `agl--tight` class (`extra-lanes.css`) removes 14px of padding (header 3px above and below, time axis 4px above and 4px below) and the formula uses 73 instead of 87. The lanes keep their 48px rows. Measured by `scripts/qa/agent-lanes-extra.mjs` (frame = `.crm-lanes`, CSS px):

| Viewport | Frame | Lanes | Card | Blank above / below |
| --- | --- | --- | --- | --- |
| 320×640 phone | 281×296 | 4 | 279 | 8.7 / 8.7 |
| 360×740 phone | 320×337 | 5 | 327 | 5.2 / 5.3 |
| 375×667 phone | 334×353 | 5 | 327 | 13 / 13 |
| **390×844 phone** | 349×368 | **6 (tight)** | 361 | 3.7 / 3.7 |
| 430×932 phone | 388×410 | 6 | 375 | 17.3 / 17.3 |
| 844×390 landscape | 320×338 | 5 | 327 | 5.3 / 5.3 |
| 768×1024 tablet | 418×441 | 6 | 375 | 33.2 / 33.2 |
| 1024×768 | 366×386 | 6 | 375 | 5.7 / 5.7 |
| 1440×900 and 1920×1080 | 384×405 | 6 | 375 | 15.1 / 15.1 |

So both new logos show from 390px phones up; 360/375px phones show Hermes only and 320px phones keep the reference's four lanes, because a 48px lane row cannot be shrunk without changing `AgentLanes`. The server and the first client render use the reference's four lanes, so hydration never disagrees; the extra lanes appear after the first layout. `?lanes=base` shows only the reference's four.

## Files

| File | Role |
| --- | --- |
| `src/components/sites/affectui-agent-lanes/extra-lanes.tsx` | Extra agents/tasks, tool and mark rendering, `FittedLanes`. |
| `extra-marks.generated.ts` | Generated marks (see above). |
| `scripts/forensics/agent-lanes-extra-marks.mjs` | Generator. |
| `extra-lanes.css` | The `agl--tight` padding trim. |
| `scripts/qa/agent-lanes-extra.mjs` | QA for the additions: 19 checks (marks, tasks, tooltips, approval dialog, 10 frame sizes, `lanes=base`, native taps in Chromium and WebKit, zero external requests). |
| `CrmAgentLanes.tsx` | **Two lines changed**: it imports `FittedLanes` and renders it where it rendered `AgentLanes`. Data, clock and the rest are untouched. |

`AgentLanes.tsx`, `agent-lanes.css`, `icons.json`, `lanes-model.ts` and the README were not modified by this work.

## Coordination note

Another agent maintains the Agent Lanes files, so this work is additive. The only edits to files that were not created here:

- `CrmAgentLanes.tsx`: two lines (the import and the element it renders).
- `scripts/qa/agent-lanes.mjs` and `scripts/forensics/agent-lanes-compare.mjs`: one line each, adding `&lanes=base` to the page URL. Their assertions assume exactly the reference's four lanes (4 avatars, 6 blocks, `2 running`) and the comparison needs a card of the source's height, so they now run against `?lanes=base` and are otherwise unchanged. The comparison script was not re-run (it needs the live public preview and would overwrite that agent's evidence images).

If the extra lanes should be the default for those scripts too, drop `&lanes=base` and update the counts (6 avatars, 10 blocks, `4 running` at laptop size).
