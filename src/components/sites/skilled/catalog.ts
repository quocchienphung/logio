/** Public instruction files checked directly on 2026-10-22. Recommendations are sources, never pre-installed skills. */
export const skillSources = [
  { name: "Web app testing", owner: "anthropics/skills", path: "skills/webapp-testing", category: "Verification", description: "Browser checks, screenshots and evidence for local web apps." },
  { name: "React best practices", owner: "vercel-labs/agent-skills", path: "skills/react-best-practices", category: "Performance", description: "React and Next.js performance guidance from Vercel Engineering." },
  { name: "Web design guidelines", owner: "vercel-labs/agent-skills", path: "skills/web-design-guidelines", category: "Accessibility", description: "Review an interface against web design and accessibility guidelines." },
  { name: "Playwright", owner: "openai/skills", path: "skills/.curated/playwright", category: "Browser automation", description: "Drive a real browser and inspect actual rendered behavior." },
  { name: "Skill creator", owner: "anthropics/skills", path: "skills/skill-creator", category: "Evaluation", description: "Create, refine and evaluate skills for your own workflows." },
  { name: "Frontend design", owner: "anthropics/skills", path: "skills/frontend-design", category: "Interface design", description: "Guidance for building intentional, distinctive interfaces." },
] as const;

export const sourceUrl = (source: (typeof skillSources)[number]) => `https://github.com/${source.owner}/blob/main/${source.path}/SKILL.md`;
