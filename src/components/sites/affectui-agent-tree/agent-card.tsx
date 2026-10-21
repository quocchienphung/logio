"use client";

import type { ReactNode } from "react";
import { branchCost, branchLive, busyMs, durationLabel, statusLabel, type TreeAgent } from "./tree-model";
import { Mark, markNames, StatusGlyph } from "./tree-marks";

export interface AgentCardBodyProps {
  agent: TreeAgent;
  now: number;
  formatCost: (amount: number) => string;
  showCost: boolean;
  /** Controls on the bottom row, before `fold` (for example "Add sub-task"). */
  actions?: ReactNode;
  /** The fold button of a card that has sub-agents. */
  fold?: ReactNode;
}

/**
 * What is inside one agent's card: the avatar, name and model, the status, the task with its tool marks, and the bottom
 * row with the role, cost and time. The tree and the map each draw the card around it (position, selection, connectors).
 */
export function AgentCardBody({ agent, now, formatCost, showCost, actions, fold }: AgentCardBodyProps) {
  const kids = agent.children ?? [];
  const cost = kids.length ? branchCost(agent) : agent.cost ?? 0;
  const busy = busyMs(agent, now);
  return <>
    <div className="agt__top">
      <span className="agt__avatar" data-logo={agent.mark ? "" : undefined} title={agent.mark ? markNames[agent.mark] : undefined}>{agent.mark ? <Mark id={agent.mark} /> : (agent.initials ?? agent.name.slice(0, 2)).toUpperCase()}</span>
      <span className="agt__who"><span className="agt__name">{agent.name}</span>{agent.model && <span className="agt__model">{agent.model}</span>}</span>
      <span className="agt__status" data-status={agent.status}><StatusGlyph status={agent.status} />{statusLabel[agent.status]}</span>
    </div>
    <p className="agt__task">
      {!!agent.tools?.length && <span className="agt__tools">{agent.tools.map(tool => <span className="agt__tool" key={tool} title={markNames[tool]}><Mark id={tool} /></span>)}</span>}
      {agent.task}
    </p>
    <div className="agt__meta">
      {agent.badge && <span className="agt__badge" style={agent.badge.color ? { "--agt-badge": agent.badge.color } as React.CSSProperties : undefined}>{agent.badge.label}</span>}
      <span className="agt__cost">
        {showCost && agent.status !== "idle" && <><span className="agt__amount" data-live={branchLive(agent) ? "" : undefined}>{formatCost(cost)}</span>{busy !== undefined && " · "}</>}
        {busy !== undefined && <span className="agt__time">{durationLabel(busy)}</span>}
      </span>
      {actions && <span className="agt__actions" data-no-select="">{actions}</span>}
      {fold}
    </div>
  </>;
}
