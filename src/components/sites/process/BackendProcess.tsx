"use client";

import { useMemo } from "react";
import { BackendError, createSnapshotSource } from "@/lib/workspace-backend";
import { useWorkspaceBackend } from "@/lib/workspace-backend/react";
import { Process } from "./ProcessPage";
import { normalizeLibrary } from "./process-model";
import { normalizeRunStore } from "./run-model";

/** Connects the Process page to the workspace backend: the `process` resource holds the plans, `process-run` the simulated engine's runs. */
export function BackendProcess({ workspaceId }: { workspaceId: string }) {
  const backend = useWorkspaceBackend();
  const dataSource = useMemo(() => {
    const ref = { name: "process" as const, workspaceId };
    const snapshot = createSnapshotSource(backend, ref, raw => {
      const library = normalizeLibrary(raw);
      if (!library) throw new BackendError("invalid", "The saved processes are invalid. Your stored copy has been kept.");
      return library;
    });
    return { ...snapshot, async save(...args: Parameters<typeof snapshot.save>) {
      await snapshot.save(...args);
      // The shared local backend tolerates full storage. Process must not report a successful save in that case.
      if (!backend.remote && backend.peek && JSON.stringify(backend.peek(ref)?.value) !== JSON.stringify(args[0])) throw new BackendError("network", "Browser storage is unavailable or full. Export your process before leaving this page.");
    } };
  }, [backend, workspaceId]);
  const runSource = useMemo(() => createSnapshotSource(backend, { name: "process-run" as const, workspaceId }, raw => {
    const store = normalizeRunStore(raw);
    if (!store) throw new BackendError("invalid", "The saved runs are invalid.");
    return store;
  }), [backend, workspaceId]);
  return <Process workspaceId={workspaceId} dataSource={dataSource} runSource={runSource} remote={backend.remote} />;
}
