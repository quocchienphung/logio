"use client";

import { useEffect, useReducer, useState } from "react";
import seed from "./seed.json";

export interface Company {
  id: string;
  company: string;
  category: string;
  domain: string;
  owner: string;
  value: number;
  stage: string;
  lastContact: string;
}

export const columns = [
  { key: "company", label: "Company", type: "text" },
  { key: "category", label: "Category", type: "tag" },
  { key: "domain", label: "Domain", type: "url" },
  { key: "owner", label: "Owner", type: "text" },
  { key: "value", label: "Value", type: "number" },
  { key: "stage", label: "Stage", type: "tag" },
  { key: "lastContact", label: "Last contact", type: "text" },
] as const;
export type ColumnKey = (typeof columns)[number]["key"];
export const stages = ["New", "Qualified", "Proposal", "Negotiation", "Won"];
export const tones: Record<string, string> = {
  Productivity: "gray", Planning: "blue", Design: "pink", Payments: "violet",
  "E-commerce": "amber", "Developer Tools": "gray", CRM: "blue", New: "gray",
  Qualified: "blue", Proposal: "violet", Negotiation: "amber", Won: "green", Lost: "pink",
};
export const initialCompanies: Company[] = seed;
export const numberFormat = new Intl.NumberFormat("en-US");
export function emptyCompany(): Company {
  return { id: crypto.randomUUID(), company: "", category: "Productivity", domain: "", owner: "", value: 0, stage: "New", lastContact: "Today" };
}
export function setCell(row: Company, key: ColumnKey, value: string): Company {
  if (key === "value") {
    const numeric = Number(value.replaceAll(",", "").replaceAll("$", ""));
    return { ...row, value: Number.isFinite(numeric) ? numeric : row.value };
  }
  return { ...row, [key]: value };
}

interface History { rows: Company[]; past: Company[][]; future: Company[][] }
type Action = { type: "change" | "hydrate"; rows: Company[] } | { type: "undo" | "redo" };
function reducer(state: History, action: Action): History {
  if (action.type === "hydrate") return { rows: action.rows, past: [], future: [] };
  if (action.type === "change") {
    if (JSON.stringify(state.rows) === JSON.stringify(action.rows)) return state;
    return { rows: action.rows, past: [...state.past.slice(-99), state.rows], future: [] };
  }
  if (action.type === "undo" && state.past.length) {
    return { rows: state.past.at(-1)!, past: state.past.slice(0, -1), future: [state.rows, ...state.future] };
  }
  if (action.type === "redo" && state.future.length) {
    return { rows: state.future[0], past: [...state.past, state.rows], future: state.future.slice(1) };
  }
  return state;
}
export function useCrmEngine(workspaceId = "acme") {
  const [state, dispatch] = useReducer(reducer, { rows: initialCompanies, past: [], future: [] });
  const [ready, setReady] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      let rows = workspaceId === "acme" ? initialCompanies : [];
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(`affectui:${workspaceId}:companies`) || "null");
        if (Array.isArray(saved) && saved.every((row: unknown) => {
          if (!row || typeof row !== "object") return false;
          const candidate = row as Record<string, unknown>;
          return typeof candidate.id === "string" && typeof candidate.value === "number" && ["company", "category", "domain", "owner", "stage", "lastContact"].every(key => typeof candidate[key] === "string");
        })) rows = saved as Company[];
      } catch { /* Use the original demo when storage is unavailable. */ }
      dispatch({ type: "hydrate", rows });
      setReady(workspaceId);
    });
    return () => { disposed = true; };
  }, [workspaceId]);
  useEffect(() => {
    if (ready !== workspaceId) return;
    try { localStorage.setItem(`affectui:${workspaceId}:companies`, JSON.stringify(state.rows)); } catch { /* Session editing still works. */ }
  }, [ready, state.rows, workspaceId]);
  return {
    rows: state.rows,
    change: (rows: Company[]) => dispatch({ type: "change", rows }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
export type CrmEngine = ReturnType<typeof useCrmEngine>;
