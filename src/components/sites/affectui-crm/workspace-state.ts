"use client";

import { useSyncExternalStore } from "react";

export const workspaceSections = ["Home", "Companies", "Contacts", "Deals", "Reports", "New chat", "Files", "Run", "Mapping", "Invoice", "Settings", "New business", "Renewals", "Partnerships"] as const;
export type WorkspaceSection = (typeof workspaceSections)[number];

function subscribeRoute(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
function routeSnapshot(): WorkspaceSection {
  const section = new URLSearchParams(window.location.search).get("section");
  return workspaceSections.find(value => value.toLowerCase().replaceAll(" ", "-") === section) || "Companies";
}
function viewSnapshot() { return new URLSearchParams(window.location.search).get("crm-view"); }
export function useWorkspaceRoute() {
  const section = useSyncExternalStore(subscribeRoute, routeSnapshot, () => "Companies" as WorkspaceSection);
  const crmView = useSyncExternalStore(subscribeRoute, viewSnapshot, () => null);
  function navigate(next: WorkspaceSection, view?: string) {
    const url = new URL(window.location.href);
    url.searchParams.delete("panel");
    url.searchParams.delete("settings-tab");
    url.searchParams.delete("folder");
    if (view) url.searchParams.set("crm-view", view);
    else url.searchParams.delete("crm-view");
    if (next === "Companies") url.searchParams.delete("section");
    else url.searchParams.set("section", next.toLowerCase().replaceAll(" ", "-"));
    if (url.href !== window.location.href) {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }
  return { section, crmView, navigate };
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
