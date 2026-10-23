"use client";

import { useSyncSummary } from "./react";
import type { BackendError } from "./types.ts";
import "./sync-status.css";

/**
 * Says what the connection to the backend is doing. It stays out of the way: nothing is shown while the
 * workspace is idle or while data only lives in this browser.
 */
export function SyncStatus() {
  const { summary, retryAll } = useSyncSummary();
  if (!summary.loading && !summary.saving && !summary.errors) return null;
  const failed = summary.errors > 0;
  return <div className="wb-sync" data-state={failed ? "error" : "busy"} role="status" aria-live="polite">
    <span className="wb-sync__dot" aria-hidden="true" />
    <span className="wb-sync__text">{failed ? (summary.message ?? "Couldn’t sync with the server.") : summary.saving ? "Saving…" : "Loading your data…"}</span>
    {failed && <button type="button" className="wb-sync__retry" onClick={retryAll}>Retry</button>}
  </div>;
}

/**
 * Tells what happened to a read model (see useQuery): nothing while the data is the screen's own, a loading
 * line while the server answers, and the reason plus a retry when the sample is shown because the server failed.
 */
export function QueryNotice({ query, what }: { query: { phase: "loading" | "ready"; error: BackendError | null; retry: () => void }; what: string }) {
  if (query.phase === "loading") return <div className="wb-notice" role="status"><span className="wb-sync__dot" aria-hidden="true" />Loading {what}…</div>;
  if (!query.error) return null;
  return <div className="wb-notice" data-state="error" role="alert"><span className="wb-sync__dot" aria-hidden="true" /><span className="wb-sync__text">{query.error.message} The sample {what} is shown instead.</span><button type="button" className="wb-sync__retry" onClick={query.retry}>Retry</button></div>;
}
