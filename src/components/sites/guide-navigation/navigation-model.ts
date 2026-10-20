import type { WorkspaceSection } from "../affectui-crm/workspace-state";

/**
 * The groups of the selector, in on-screen order, and the workspace pages each one owns. `href` is the page
 * a group opens on; its `sections` are the only pages its sidebar lists, `pipelines` a second titled list.
 * `image` is the frame shown in the selector; null draws a neutral frame until a picture is supplied.
 */
export const guideGroups = [
  { id: "sales", name: "Sales", number: "01", href: "/personalize?section=invoice", image: "/sites/guide-navigation/sales.jpg", sections: ["Invoice"], pipelines: [] },
  { id: "agent-chat", name: "Agent Chat", number: "02", href: "/personalize?section=run", image: "/sites/guide-navigation/agent-chat.jpg", sections: ["Run", "Settings"], pipelines: [] },
  { id: "crm", name: "CRM", number: "03", href: "/personalize?section=home", image: "/sites/guide-navigation/crm.jpg", sections: ["Home", "Companies", "Contacts", "Deals", "Reports"], pipelines: ["New business", "Renewals", "Partnerships"] },
  { id: "project-management", name: "Project Management", number: "04", href: "/personalize?section=mapping", image: null, sections: ["Mapping"], pipelines: [] },
] as const satisfies readonly { id: string; name: string; number: string; href: string; image: string | null; sections: readonly WorkspaceSection[]; pipelines: readonly WorkspaceSection[] }[];

export type GuideGroup = (typeof guideGroups)[number];
export type GuideGroupId = GuideGroup["id"];

/** The reference clip starts with its second item selected. */
export const defaultGuideIndex = 1;

/** Which group owns a workspace page. Every page belongs to exactly one group. */
export function groupOfSection(section: WorkspaceSection): GuideGroup {
  return guideGroups.find(group => (group.sections as readonly string[]).includes(section) || (group.pipelines as readonly string[]).includes(section)) ?? guideGroups[2];
}

export function subscribeLocation(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

/** Keep native link behaviors (new tab, copy link) while navigating the workspace locally. */
export function navigateWorkspaceHref(href: string) {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
