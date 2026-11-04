"use client";

import { Check } from "lucide-react";
import { useCollateral } from "../CollateralProvider";
import { useWorkspaceI18n } from "../../i18n/WorkspaceI18n";
import { WorkspaceLink } from "../../guide-navigation/WorkspaceLink";
import { useQueueCopy } from "./queue-copy";

export function ArchiveNotice() {
  const { archive, saveToQueue, engine, isSimulation } = useCollateral();
  const { locale } = useWorkspaceI18n();
  const copy = useQueueCopy();
  if (!isSimulation) return <div className="cr-archive" role="status">Local only · No upload</div>;
  return <div className="cr-archive" role="status">
    {archive && <Check size={13} />}<span>{archive ? copy("saved") : locale === "vi" ? "Dữ liệu mẫu · chỉ trong phiên xem" : "Sample data · this preview session only"}</span>
    {!archive && engine.phase === "ready" && <button type="button" onClick={saveToQueue}>{locale === "vi" ? "Thêm vào Queue mô phỏng" : "Add to demo Queue"}</button>}
    <WorkspaceLink href="/personalize?section=queue">{copy("viewQueue")}</WorkspaceLink>
  </div>;
}
