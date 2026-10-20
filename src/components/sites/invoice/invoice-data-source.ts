import { normalizeInvoice } from "./invoice-model.ts";
import type { InvoiceData } from "./invoice-model.ts";

/**
 * The only place the invoice talks to storage. Pass your own implementation as `dataSource` to back it with
 * an API; nothing in the component knows where the draft lives. The default keeps it in this browser.
 *
 * - `load` resolves the saved draft, or null to start from the default invoice.
 * - `save` receives the whole invoice when the person presses "Save draft" and every line is described.
 *   It is awaited: a rejection shows a save error and keeps the edits on screen. Totals are recomputed here
 *   from the lines, so a backend should recompute them too and treat what it receives as a draft.
 *
 * Pass untrusted responses through `normalizeInvoice` before returning them from `load`.
 */
export interface InvoiceDataSource {
  load(signal?: AbortSignal): Promise<InvoiceData | null>;
  save(invoice: InvoiceData): Promise<void>;
}

export function createLocalInvoiceSource(key: string): InvoiceDataSource {
  return {
    async load() { try { const saved = localStorage.getItem(key); return saved ? normalizeInvoice(JSON.parse(saved)) : null; } catch { return null; } },
    async save(invoice) { localStorage.setItem(key, JSON.stringify(invoice)); },
  };
}
