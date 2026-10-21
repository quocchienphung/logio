import type { CursorAgent } from "../affectui-agent-cursors/AgentCursor";

export const STUDIO_DURATION = 10000;
export const WORKSPACE_HREF = "/personalize?browse=1";
export const ARTWORK_SRC = "/sites/guide-intro/starry-night.jpg";
export const studioSteps = [
  { id: "paper", at: 0 }, { id: "color", at: 350 }, { id: "final", at: 8600 },
] as const;
export const phaseAt = (time: number) => studioSteps.findLast(step => time >= step.at) ?? studioSteps[0];

export const artistAgents: readonly CursorAgent[] = [
  { id: "sky", name: "Sky painter", mark: "openai", color: "#4985d6", role: "Swirls & sky" },
  { id: "colorist", name: "Colorist", mark: "claudecode", color: "#9874ce", role: "Stars & moonlight" },
  { id: "landscape", name: "Landscape", mark: "gemini", color: "#5b9f88", role: "Hills & village" },
  { id: "detail", name: "Detail artist", mark: "kimi", color: "#cd789e", role: "The finishing touches" },
  { id: "writer", name: "Writer", mark: "anthropic", color: "#cf805f", role: "The painting’s story" },
  { id: "researcher", name: "Researcher", mark: "codex", color: "#9874ce", role: "Art & brushwork" },
];
export function doingAt(id: string, phase: string) {
  if (id === "writer") return phase === "color" ? "Refining the story" : "Writing";
  if (id === "researcher") return phase === "color" ? "Revising" : "Researching";
  if (phase === "paper" || phase === "sketch") return "Sketching";
  if (phase === "blueprint") return "Composing";
  if (phase === "final") return "";
  return id === "sky" ? "Painting the sky" : id === "colorist" ? "Adding moonlight" : "Painting";
}
