"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { BackendError, createSnapshotSource } from "@/lib/workspace-backend";
import { useWorkspaceBackend } from "@/lib/workspace-backend/react";
import { Invoice } from "./Invoice";
import { normalizeInvoice } from "./invoice-model";

const checked = (raw: unknown) => {
  const invoice = normalizeInvoice(raw);
  if (!invoice) throw new BackendError("invalid", "The stored invoice is not in a format this version understands.");
  return invoice;
};

/**
 * The invoice backed by the workspace backend (this browser by default, the REST API when one is configured).
 * The invoice itself stays independent: it only knows the `dataSource` interface in invoice-data-source.ts.
 */
export function BackendInvoice(props: Omit<ComponentProps<typeof Invoice>, "dataSource">) {
  const backend = useWorkspaceBackend();
  const dataSource = useMemo(() => createSnapshotSource(backend, { name: "invoice", workspaceId: props.workspaceId }, checked), [backend, props.workspaceId]);
  return <Invoice {...props} dataSource={dataSource} />;
}
