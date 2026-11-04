"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { WorkspaceDialog } from "../../affectui-crm/WorkspaceDialog";
import type { CollateralSimulation } from "../useCollateralSimulation";
import type { RepairPreview, RepairProgress } from "../simulation/collateral-simulation";
import "./auto-repair.css";

const STAGE: Record<RepairProgress["stage"], string> = {
  evidence_index: "Mô phỏng lập chỉ mục", candidate_generation: "Mô phỏng gợi ý", validation: "Mô phỏng kiểm tra",
  patch: "Mô phỏng sửa ô", package_verification: "Mô phỏng đối chiếu", download: "Hoàn tất bản xem trước",
};

/** Timed dialog playback; edits only affect sample cells in memory. */
export function AutoRepairAction({ engine }: { engine: CollateralSimulation }) {
  const [open, setOpen] = useState(false), [running, setRunning] = useState(false);
  const [result, setResult] = useState<RepairPreview | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const p = engine.repairProgress;
  async function run() {
    setOpen(true); setRunning(true); setResult(null); setDownloaded(false);
    const made = await engine.autoRepair();
    setRunning(false); setResult(made?.report ?? null);
  }
  const close = () => { if (running) engine.cancelRepair(); else setOpen(false); };
  return <>
    <button type="button" className="ui-button cr-auto-trigger" data-variant="secondary" data-size="sm" disabled={engine.busy || engine.phase !== "ready"} onClick={() => void run()} title="Chạy hoạt ảnh trên dữ liệu mẫu"><Wand2 size={14} /><span className="ui-button__label">Tự động sửa Excel</span></button>
    <WorkspaceDialog open={open} title="Tự động sửa Excel · Mô phỏng" onClose={close}>
      <div className="cr-auto-result" aria-busy={running}>
        <p>Chỉ mô phỏng giao diện trên dữ liệu mẫu. Không đọc, sửa hay xuất tệp thật.</p>
        {running && <div role="status" aria-live="polite">
          <p>{p ? STAGE[p.stage] : "Bắt đầu mô phỏng"}</p>
          {p && <><progress max={p.totalRows} value={p.processedRows} aria-label="Tiến độ mô phỏng" /><p>{p.processedRows} / {p.totalRows} dòng mẫu · {p.applied} ô mẫu · {(p.elapsedMs / 1000).toFixed(1)} s mô phỏng</p></>}
          <button type="button" className="ui-button" data-size="sm" onClick={close}><span className="ui-button__label">Hủy</span></button>
        </div>}
        {result && <>
          <p role="status">{result.status === "cancelled" ? "Đã hủy mô phỏng." : "Đã hoàn tất mô phỏng."}</p>
          <dl><div><dt>Ô mẫu thay đổi</dt><dd>{result.changed}</dd></div><div><dt>Ô mẫu cần xem lại</dt><dd>{result.unresolved}</dd></div><div><dt>Trang tính mẫu</dt><dd>1</dd></div></dl>
          <div className="ui-sb-actions"><button type="button" className="ui-button" data-variant="primary" data-size="sm" onClick={() => setDownloaded(true)}><span className="ui-button__label">Xem thử tải xuống</span></button><button type="button" className="ui-button" data-size="sm" onClick={() => setOpen(false)}><span className="ui-button__label">Đóng</span></button></div>
          {downloaded && <p role="status">Mô phỏng tải xuống · không tạo tệp.</p>}
        </>}
      </div>
    </WorkspaceDialog>
  </>;
}
