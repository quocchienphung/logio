import type { AvatarMark, ToolMark } from "../affectui-agent-tree/tree-model.ts";
import { roleIds, roleOf } from "./roles.ts";
import type { Role } from "./roles.ts";

/**
 * The data a person edits on the Process page: a goal broken into tasks and sub-tasks, each with an AI block (or a
 * person) that does it. Pure rules only (no React, no storage): creation, immutable tree edits, and normalizing
 * untrusted data (a saved copy, a backend answer, an imported file) into a value the screen can safely show.
 */
export type Provider = "anthropic" | "claudecode" | "openai" | "codex" | "gemini" | "kimi" | "hermes" | "ollama" | "qwen" | "deepseek" | "mistral" | "human" | "custom";
export type Mode = "parallel" | "sequence";
export type CostUnit = "usd" | "credits" | "tokens" | "none";

/** The AI block of a task: which engine does it, with which model, told what. A person (`human`) needs no model. */
export interface AiBlock { provider: Provider; model: string; instructions: string }

/** Only the simulated engine reads these; a real engine ignores them. */
export interface Simulation { failOnce?: boolean; durationMs?: number; cost?: number }

export interface ProcessNode {
  id: string;
  name: string;
  /** What the block is for (planner, coder, fixer …). Picking one fills the instructions of a new block. */
  role: Role;
  task: string;
  ai: AiBlock;
  tools: ToolMark[];
  /** A person approves this task before it runs. */
  approval: boolean;
  /** What the approver is asked. A default question is used when empty. */
  askText: string;
  /** How its sub-tasks run: all at once, or one after another. */
  mode: Mode;
  /** The task stops (fails) when its own cost reaches this, in the process's cost unit. */
  limit?: number;
  sim?: Simulation;
  /** Where the person put the block on the map (its center, in map units). Without it the map places the block itself. */
  pos?: { x: number; y: number };
  children: ProcessNode[];
}

export interface ProcessDoc {
  id: string;
  name: string;
  goal: string;
  unit: CostUnit;
  createdAt: string;
  updatedAt: string;
  root: ProcessNode;
}

export interface ProcessLibrary { version: 1; activeId: string; processes: ProcessDoc[] }

export const LIMITS = { processes: 50, nodes: 200, depth: 8, name: 80, goal: 300, task: 600, instructions: 4000, model: 120, askText: 300, tools: 6 } as const;
export const providerIds: readonly Provider[] = ["anthropic", "claudecode", "openai", "codex", "gemini", "kimi", "hermes", "ollama", "qwen", "deepseek", "mistral", "human", "custom"];
export { roleIds };
export const toolIds: readonly ToolMark[] = ["notion", "github", "slack", "figma", "hubspot", "stripe"];
const costUnits: readonly CostUnit[] = ["usd", "credits", "tokens", "none"];

/** The mark an avatar shows for a provider; a person and a custom engine show initials. */
export const markOf = (provider: Provider): AvatarMark | undefined => provider === "human" || provider === "custom" ? undefined : provider;
export { roleOf };

let counter = 0;
export function uid(prefix = "n") {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createNode(partial: Partial<ProcessNode> = {}): ProcessNode {
  return {
    id: partial.id ?? uid(), name: "New block", role: "custom", task: "Describe what this task should get done", ai: { provider: "anthropic", model: "claude-sonnet-5-5", instructions: "" },
    tools: [], approval: false, askText: "", mode: "parallel", children: [], ...partial,
  };
}

export function createBlankProcess(name = "Untitled process", now = new Date()): ProcessDoc {
  const stamp = now.toISOString();
  return { id: uid("proc"), name, goal: "", unit: "usd", createdAt: stamp, updatedAt: stamp, root: createNode({ name: "Coordinator", role: "coordinator", task: "Describe the goal of this process" }) };
}

export const createLibrary = (docs: ProcessDoc[]): ProcessLibrary => ({ version: 1, activeId: docs[0]?.id ?? "", processes: docs });

/* ---------- immutable tree edits ---------- */
export function flattenNodes(root: ProcessNode): ProcessNode[] { return [root, ...root.children.flatMap(flattenNodes)]; }
export const findNode = (root: ProcessNode, id: string) => flattenNodes(root).find(node => node.id === id);
export const countNodes = (root: ProcessNode) => flattenNodes(root).length;

export function depthOfNode(root: ProcessNode, id: string, depth = 0): number {
  if (root.id === id) return depth;
  for (const child of root.children) { const found = depthOfNode(child, id, depth + 1); if (found >= 0) return found; }
  return -1;
}
export const heightOf = (node: ProcessNode): number => 1 + Math.max(0, ...node.children.map(heightOf));
export const parentNode = (root: ProcessNode, id: string) => flattenNodes(root).find(node => node.children.some(child => child.id === id));

/** Replaces one node (and keeps everything else as it was); an unchanged tree returns the same object. */
export function updateNode(root: ProcessNode, id: string, change: (node: ProcessNode) => ProcessNode): ProcessNode {
  if (root.id === id) return change(root);
  let changed = false;
  const children = root.children.map(child => { const next = updateNode(child, id, change); if (next !== child) changed = true; return next; });
  return changed ? { ...root, children } : root;
}

/** Pins a block where the person dropped it. */
export const setPosition = (root: ProcessNode, id: string, pos: { x: number; y: number }): ProcessNode => updateNode(root, id, node => node.pos?.x === pos.x && node.pos?.y === pos.y ? node : { ...node, pos: { x: pos.x, y: pos.y } });

/** Lets the map place every block again ("Tidy up"). */
export function clearPositions(root: ProcessNode): ProcessNode {
  const children = root.children.map(clearPositions);
  const same = !root.pos && children.every((child, index) => child === root.children[index]);
  if (same) return root;
  const { pos, ...rest } = root;
  void pos;
  return { ...rest, children };
}

/** Adds a sub-task; refused (same tree back) past the node and depth limits. */
export function addChild(root: ProcessNode, parentId: string, node: ProcessNode): ProcessNode {
  const depth = depthOfNode(root, parentId);
  if (depth < 0 || depth + heightOf(node) >= LIMITS.depth || countNodes(root) + countNodes(node) > LIMITS.nodes) return root;
  return updateNode(root, parentId, parent => ({ ...parent, children: [...parent.children, node] }));
}

/** Removes a task and everything under it. The root cannot be removed. */
export function removeNode(root: ProcessNode, id: string): ProcessNode {
  if (root.id === id) return root;
  const children = root.children.filter(child => child.id !== id).map(child => removeNode(child, id));
  const same = children.length === root.children.length && children.every((child, index) => child === root.children[index]);
  return same ? root : { ...root, children };
}

/** Moves a task one place among its siblings. */
export function moveNode(root: ProcessNode, id: string, delta: -1 | 1): ProcessNode {
  const parent = parentNode(root, id);
  if (!parent) return root;
  const index = parent.children.findIndex(child => child.id === id), target = index + delta;
  if (target < 0 || target >= parent.children.length) return root;
  return updateNode(root, parent.id, node => {
    const children = [...node.children];
    [children[index], children[target]] = [children[target], children[index]];
    return { ...node, children };
  });
}

/** Moves a task (with its sub-tasks) under another one. Not under itself, its own sub-tasks, or past the depth limit. */
export function reparentNode(root: ProcessNode, id: string, parentId: string): ProcessNode {
  const moving = findNode(root, id);
  if (!moving || root.id === id || parentNode(root, id)?.id === parentId) return root;
  if (flattenNodes(moving).some(node => node.id === parentId)) return root;
  const depth = depthOfNode(root, parentId);
  if (depth < 0 || depth + heightOf(moving) >= LIMITS.depth) return root;
  return addChild(removeNode(root, id), parentId, moving);
}

/** A deep copy with fresh ids, placed right after the original. */
export function duplicateNode(root: ProcessNode, id: string): { root: ProcessNode; copyId: string | null } {
  const original = findNode(root, id), parent = parentNode(root, id);
  if (!original || !parent || countNodes(root) + countNodes(original) > LIMITS.nodes) return { root, copyId: null };
  const copy = (node: ProcessNode): ProcessNode => ({ ...node, id: uid(), ai: { ...node.ai }, tools: [...node.tools], sim: node.sim ? { ...node.sim } : undefined, children: node.children.map(copy) });
  const clone = { ...copy(original), name: `${original.name} (copy)`.slice(0, LIMITS.name) };
  const next = updateNode(root, parent.id, node => {
    const children = [...node.children];
    children.splice(children.findIndex(child => child.id === id) + 1, 0, clone);
    return { ...node, children };
  });
  return { root: next, copyId: clone.id };
}

/** Tasks a person may move `id` under: everything except itself, its sub-tasks and (for the depth limit) too-deep places. */
export function validParents(root: ProcessNode, id: string): ProcessNode[] {
  const moving = findNode(root, id);
  if (!moving || root.id === id) return [];
  const blocked = new Set(flattenNodes(moving).map(node => node.id));
  return flattenNodes(root).filter(node => !blocked.has(node.id) && depthOfNode(root, node.id) + heightOf(moving) < LIMITS.depth);
}

export const touch = (doc: ProcessDoc, now = new Date()): ProcessDoc => ({ ...doc, updatedAt: now.toISOString() });

/* ---------- cost formatting ---------- */
export function costFormatter(unit: CostUnit): (amount: number) => string {
  if (unit === "credits") return amount => `${amount.toFixed(amount >= 10 ? 0 : 1)} cr`;
  if (unit === "tokens") return amount => amount >= 1000 ? `${(amount / 1000).toFixed(1)}K tok` : `${Math.round(amount)} tok`;
  return amount => `$${amount.toFixed(2)}`;
}
export const unitLabel: Record<CostUnit, string> = { usd: "Dollars", credits: "Credits", tokens: "Tokens", none: "No cost" };

/* ---------- normalizing untrusted data ---------- */
const text = (raw: unknown, max: number, fallback = "") => typeof raw === "string" ? raw.slice(0, max) : fallback;
const isRecord = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === "object" && !Array.isArray(raw);
const finite = (raw: unknown) => typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;

function normalizeNode(raw: unknown, depth: number, seen: Set<string>, budget: { left: number }): ProcessNode | null {
  if (!isRecord(raw) || depth >= LIMITS.depth || budget.left <= 0) return null;
  budget.left -= 1;
  let id = text(raw.id, 80);
  if (!id || seen.has(id)) id = uid();
  seen.add(id);
  const ai = isRecord(raw.ai) ? raw.ai : {};
  const provider = providerIds.includes(ai.provider as Provider) ? ai.provider as Provider : "anthropic";
  const sim = isRecord(raw.sim) ? { failOnce: raw.sim.failOnce === true || undefined, durationMs: finite(raw.sim.durationMs), cost: finite(raw.sim.cost) } : undefined;
  const limit = finite(raw.limit);
  const x = isRecord(raw.pos) ? finite(raw.pos.x) : undefined, y = isRecord(raw.pos) ? finite(raw.pos.y) : undefined;
  return {
    id, name: text(raw.name, LIMITS.name, "Task") || "Task", role: roleIds.includes(raw.role as Role) ? raw.role as Role : "custom", task: text(raw.task, LIMITS.task),
    ai: { provider, model: text(ai.model, LIMITS.model), instructions: text(ai.instructions, LIMITS.instructions) },
    tools: Array.isArray(raw.tools) ? [...new Set(raw.tools.filter((tool): tool is ToolMark => toolIds.includes(tool as ToolMark)))].slice(0, LIMITS.tools) : [],
    approval: raw.approval === true, askText: text(raw.askText, LIMITS.askText), mode: raw.mode === "sequence" ? "sequence" : "parallel",
    ...(limit !== undefined && limit > 0 ? { limit } : {}),
    ...(x !== undefined && y !== undefined ? { pos: { x: Math.max(-50_000, Math.min(50_000, Math.round(x))), y: Math.max(-50_000, Math.min(50_000, Math.round(y))) } } : {}),
    ...(sim && (sim.failOnce || sim.durationMs !== undefined || sim.cost !== undefined) ? { sim: { ...(sim.failOnce ? { failOnce: true } : {}), ...(sim.durationMs !== undefined ? { durationMs: Math.max(200, Math.min(600_000, sim.durationMs)) } : {}), ...(sim.cost !== undefined ? { cost: Math.max(0, sim.cost) } : {}) } } : {}),
    children: Array.isArray(raw.children) ? raw.children.map(child => normalizeNode(child, depth + 1, seen, budget)).filter((child): child is ProcessNode => !!child) : [],
  };
}

export function normalizeProcess(raw: unknown): ProcessDoc | null {
  if (!isRecord(raw)) return null;
  const root = normalizeNode(raw.root, 0, new Set(), { left: LIMITS.nodes });
  if (!root) return null;
  const id = text(raw.id, 80) || uid("proc");
  const stamp = new Date().toISOString();
  const dated = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : stamp;
  return { id, name: text(raw.name, LIMITS.name, "Untitled process") || "Untitled process", goal: text(raw.goal, LIMITS.goal), unit: costUnits.includes(raw.unit as CostUnit) ? raw.unit as CostUnit : "usd", createdAt: dated(raw.createdAt), updatedAt: dated(raw.updatedAt), root };
}

/** A saved library, or null when it is not one (the screen then shows its retry notice and keeps the stored copy). */
export function normalizeLibrary(raw: unknown): ProcessLibrary | null {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.processes) || raw.processes.length > LIMITS.processes) return null;
  const processes: ProcessDoc[] = [];
  const ids = new Set<string>();
  for (const item of raw.processes) {
    const doc = normalizeProcess(item);
    if (!doc) return null;
    if (ids.has(doc.id)) doc.id = uid("proc");
    ids.add(doc.id);
    processes.push(doc);
  }
  const activeId = typeof raw.activeId === "string" && ids.has(raw.activeId) ? raw.activeId : processes[0]?.id ?? "";
  return { version: 1, activeId, processes };
}

/* ---------- starting points ---------- */
const node = (id: string, name: string, task: string, ai: Partial<AiBlock> & Pick<AiBlock, "provider">, rest: Partial<ProcessNode> = {}): ProcessNode =>
  createNode({ id, name, task, ai: { model: "", instructions: "", ...ai }, ...rest });

/** A launch plan split across several AI blocks, with a person approving the copy and one task that fails once so Retry can be tried. */
export function createSampleProcess(now = new Date()): ProcessDoc {
  const stamp = now.toISOString();
  return {
    id: "proc-launch", name: "Launch the pricing page", goal: "Launch the new pricing page by Friday", unit: "usd", createdAt: stamp, updatedAt: stamp,
    root: node("launch", "Coordinator", "Launch the new pricing page by Friday", { provider: "anthropic", model: "claude-opus-5-5", instructions: roleOf("coordinator").instructions }, {
      role: "coordinator", tools: ["slack", "notion", "github"], sim: { durationMs: 7000 },
      children: [
        node("planner", "Planner", "Break the launch into steps and say who does each one", { provider: "anthropic", model: "claude-sonnet-5-5", instructions: roleOf("planner").instructions }, { role: "planner", tools: ["notion"], sim: { durationMs: 5000 } }),
        node("research", "Researcher", "Compare the pricing of five competitors", { provider: "kimi", model: "", instructions: roleOf("helper").instructions }, {
          role: "helper", tools: ["notion", "slack"], sim: { durationMs: 6000 },
          children: [
            node("scraper", "Scraper", "Read the pricing pages of Linear, Notion and three more", { provider: "gemini", model: "gemini", instructions: roleOf("processor").instructions }, { role: "processor", tools: ["notion"], sim: { durationMs: 5000 } }),
            node("analyst", "Analyst", "Summarize 120 G2 reviews that mention price", { provider: "deepseek", model: "", instructions: roleOf("processor").instructions }, { role: "processor", tools: ["hubspot", "notion"], sim: { durationMs: 7000 } }),
          ],
        }),
        node("writer", "Writer", "Write the copy for the three plans", { provider: "anthropic", model: "claude-sonnet-5-5", instructions: roleOf("instructor").instructions }, { role: "instructor", tools: ["notion", "figma"], approval: true, askText: "Formal or friendly for the plan names? Both drafts are in Notion.", sim: { durationMs: 8000 } }),
        node("coder", "Coder", "Build the page and wire up checkout", { provider: "codex", model: "gpt-6-1-sol", instructions: roleOf("coder").instructions }, {
          role: "coder", mode: "sequence", tools: ["github", "stripe", "figma"], sim: { durationMs: 9000 },
          children: [
            node("tester", "Tester", "Write and run the checkout tests", { provider: "openai", model: "gpt-6-luna", instructions: roleOf("helper").instructions }, { role: "helper", tools: ["github"], sim: { durationMs: 6000, failOnce: true } }),
            node("fixer", "Fixer", "Fix whatever the tests found", { provider: "claudecode", model: "claude-sonnet-5-5", instructions: roleOf("fixer").instructions }, { role: "fixer", tools: ["github"], sim: { durationMs: 5000 } }),
          ],
        }),
      ],
    }),
  };
}

/** A small pipeline for a local model: Hermes Agent coordinates, an Ollama model drafts, a person approves before anything is sent. */
export function createLocalProcess(now = new Date()): ProcessDoc {
  const stamp = now.toISOString();
  return {
    id: "proc-local", name: "Reply to a customer (local model)", goal: "Draft a reply to the customer's question without sending it anywhere", unit: "tokens", createdAt: stamp, updatedAt: stamp,
    root: node("reply", "Coordinator", "Read the question, ask for a draft and hand it over for approval", { provider: "hermes", model: "", instructions: `${roleOf("coordinator").instructions} Keep the customer's data on this machine. Do not call any hosted model.` }, {
      role: "coordinator", mode: "sequence", tools: ["slack"], sim: { durationMs: 4000 },
      children: [
        node("draft", "Drafter", "Draft a short, friendly reply that answers the question", { provider: "ollama", model: "", instructions: "Answer in the customer's language. Under 120 words." }, { role: "helper", sim: { durationMs: 7000 } }),
        node("review", "Reviewer", "Check the draft against the refund policy", { provider: "ollama", model: "", instructions: roleOf("fixer").instructions }, { role: "fixer", sim: { durationMs: 5000 } }),
        node("send", "Approver", "Approve the reply before it is sent", { provider: "human", model: "", instructions: "" }, { role: "custom", approval: true, askText: "Send this reply to the customer?", tools: ["slack"], sim: { durationMs: 2000 } }),
      ],
    }),
  };
}

export const templates = [
  { id: "launch", label: "Pricing page launch", description: "Several AI blocks, one approval, one task that fails once", create: createSampleProcess },
  { id: "local", label: "Local model reply", description: "Hermes Agent and Ollama on this machine, a person approves", create: createLocalProcess },
] as const;

/** A copy of a template as a new process (fresh ids, so it can sit next to the original). */
export function instantiate(doc: ProcessDoc, now = new Date()): ProcessDoc {
  const fresh = (item: ProcessNode): ProcessNode => ({ ...item, id: uid(), children: item.children.map(fresh) });
  const stamp = now.toISOString();
  return { ...doc, id: uid("proc"), createdAt: stamp, updatedAt: stamp, root: fresh(doc.root) };
}
