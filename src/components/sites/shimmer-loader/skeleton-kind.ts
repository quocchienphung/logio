/**
 * Which skeleton a page gets while it loads: the one shaped like the page that will arrive. Pure, so the choice can be tested and the
 * server (which knows the section from the URL) draws the same skeleton as the browser.
 */
export type SkeletonKind = "home" | "table" | "reports" | "chat" | "files" | "run" | "canvas" | "trace" | "invoice" | "settings";

const kinds: Record<string, SkeletonKind> = {
  Home: "home", Companies: "table", Contacts: "table", Deals: "table", "New business": "table", Renewals: "table", Partnerships: "table",
  Reports: "reports", "New chat": "chat", Files: "files", Run: "run", Mapping: "canvas", Process: "canvas", Tracing: "trace", Invoice: "invoice", Settings: "settings",
};
export const skeletonKindOf = (section: string): SkeletonKind => kinds[section] ?? "table";

/** What a screen reader hears while the page loads. */
export const loadingLabel = (section: string) => `Loading ${section === "New chat" ? "chat" : section.toLowerCase()}…`;
