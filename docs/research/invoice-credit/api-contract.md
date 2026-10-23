# Invoice v2 API contract

This front end defines a REST contract; it does not assume that an existing service implements it. It uses `WorkspaceBackend` and the same `NEXT_PUBLIC_WORKSPACE_API_URL` / `window.__workspaceBackendConfig` configuration, authentication headers and credentials as the rest of Guide me. See `docs/backend-api.md`.

## Endpoints

- `GET {base}/workspaces/{workspaceId}/invoice` → `{ "data": InvoiceLibrary, "version": "opaque-revision" }`. 204/404 means no saved library. Other failures produce Retry loading and never pretend to load a successful sample.
- `PUT` to the same URL, body `{ "data": InvoiceLibrary, "baseVersion"?: "revision", "commands": [{ "type": "invoice.save" | "invoice.credit.issue" | "invoice.delete", "operationId": "uuid", "invoiceId"?: "uuid" }] }`. `If-Match` carries the known revision. Respond 200/204, optionally `{ "version": "new-revision" }` or ETag.
- 409/412 stops further saving until the person exports their edits/reloads the stored copy. No automatic merge/overwrite of another writer's invoice is performed by this screen. Load/save failures retain in-memory edits; an issue is shown as issued only after a successful PUT.

`InvoiceLibrary = { version: 2, activeId: string, documents: InvoiceData[] }` (maximum 200). `activeId` identifies the current document. Empty libraries have an empty activeId. Documents and lines have stable ids; array order is meaningful. A v1 singleton is accepted on GET and migrated without discarding the entered invoice fields.

The authoritative TypeScript shapes and parsers are in `src/components/sites/invoice/invoice-model.ts`:

```ts
interface InvoiceData {
  version: 2;
  id: string;
  number: string;
  creditNumber: string;
  issued: string; // YYYY-MM-DD
  due: string;
  period: string;
  currency: "USD" | "EUR" | "GBP";
  seller: { name: string; address: string; email: string; taxId: string };
  buyer: { name: string; address: string; email: string; taxId: string };
  lines: { id: string; name: string; qty: number; rate: number; tax: number; group: string }[];
  note: string;
  paymentUrl: string; // empty or HTTPS
  credit: {
    date: string;
    issued: boolean;
    lines: { lineId: string; selected: boolean; cents: number }[];
  };
}
```

Rates are currency units, credit amounts are integer cents before tax. Totals are derived and not persisted. Net line cents = round-half-up(qty × rate × 100); line tax cents = round-half-up(net cents × tax / 100). Credit tax uses the original line's tax percentage. Never trust totals or issue flags from the client: validate ownership/roles, invoice number uniqueness, valid dates, line ids, amounts, per-line limits and aggregate credits on the server and recompute there. Limits: 200 lines/document, quantity 0–1,000,000 (three decimals), rate 0–100,000 (two decimals), tax 0–100 (two decimals).

The optional command metadata makes it possible for a backend to distinguish saving a draft from recording a credit note. These PUTs are document persistence operations. They do not invoke a processor, email service or legal invoicing system. When integrating real issuance/refunds, add an authenticated domain endpoint, server-generated immutable numbering, audit trail and idempotency policy; replace the issue callback's storage operation with that API's acknowledged result. The current Edit credit note behavior follows the public interactive demo and must be adapted if the server treats issued documents as immutable.

PDF uses the browser's print/Save as PDF; CSV/JSON are generated from the visible invoice locally. No export is uploaded. Payment links are supplied by the user/provider and opened as HTTPS outbound links.

The mock browser test `scripts/qa/invoice-credit-backend.mjs` verifies the contract, including authentication, revisions and rejection paths. It is not evidence of a deployed server.
