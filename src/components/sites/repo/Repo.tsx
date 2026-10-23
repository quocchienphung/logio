"use client";

import { CircleAlert } from "lucide-react";
import { SectionSkeleton } from "../shimmer-loader/SectionSkeleton";
import { ActivityTerrain } from "../skilled/terrain/ActivityTerrain";
import { skillEventsResource } from "../skilled/skill-model";
import { useResource } from "@/lib/workspace-backend/react";
import "../skilled/skilled.css";

/** The Repo page: the Activity terrain, drawn from the same measured skill operations Skilled records. */
export function Repo({ workspaceId }: { workspaceId: string }) {
  const [events, , sync] = useResource(skillEventsResource, workspaceId, []);
  if (sync.phase !== "ready") return <SectionSkeleton section="Repo" />;
  return <div className="sk-workspace" role="region" aria-label="Repo workspace">
    <div className="sk-content">
      <ActivityTerrain events={events} />
      {sync.error && <div className="sk-error" role="alert"><CircleAlert size={16} /><span>{sync.error.message}</span><button onClick={sync.retry}>Retry activity save</button></div>}
    </div>
  </div>;
}
