"use client";

import { useEffect, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";

export const workspaceSections = ["Home", "Companies", "Contacts", "Deals", "Reports", "Run", "Settings", "New business", "Renewals", "Partnerships"] as const;
export type WorkspaceSection = (typeof workspaceSections)[number];

/** Hydrates after SSR and only writes after the matching key has been read. */
export function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      try { const saved = localStorage.getItem(key); setValue(saved ? JSON.parse(saved) as T : initial); }
      catch { setValue(initial); }
      setReadyKey(key);
    });
    return () => { disposed = true; };
    // The initial value is a fallback for this storage key, not a synchronization input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (readyKey !== key) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the UI usable if storage is full or disabled. */ }
  }, [key, readyKey, value]);
  return [value, setValue];
}

function subscribeRoute(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
function routeSnapshot(): WorkspaceSection {
  const section = new URLSearchParams(window.location.search).get("section");
  return workspaceSections.find(value => value.toLowerCase().replaceAll(" ", "-") === section) || "Companies";
}
export function useWorkspaceRoute() {
  const section = useSyncExternalStore(subscribeRoute, routeSnapshot, () => "Companies" as WorkspaceSection);
  function navigate(next: WorkspaceSection) {
    const url = new URL(window.location.href);
    if (next === "Companies") url.searchParams.delete("section");
    else url.searchParams.set("section", next.toLowerCase().replaceAll(" ", "-"));
    if (url.href !== window.location.href) {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }
  return { section, navigate };
}

export function downloadFile(name: string, content: string, mime = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCsv(rows: (string | number)[][]) {
  return rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
}
