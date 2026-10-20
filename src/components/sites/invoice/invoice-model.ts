/** The editable invoice and everything derived from it. Money is kept in cents so totals never drift. */
export interface InvoiceLine { id: string; description: string; quantity: number; /** Unit rate in dollars. */ rate: number }
export interface InvoiceParty { name: string; address: string }
export interface InvoiceData {
  version: 1;
  number: string;
  /** ISO dates (YYYY-MM-DD). */
  issued: string;
  due: string;
  from: InvoiceParty;
  billTo: InvoiceParty;
  lines: InvoiceLine[];
  /** Percent, 0–100. */
  taxRate: number;
  note: string;
  /** Last line number handed out, so ids never repeat after a removal. */
  seq: number;
}

export const LIMITS = { quantity: { min: 1, max: 999 }, rate: { min: 0, max: 1_000_000 }, tax: { min: 0, max: 100 }, text: 120, address: 240, note: 400, lines: 200 };

const clip = (value: unknown, max: number, fallback = "") => typeof value === "string" ? value.slice(0, max) : fallback;
const isoDate = (value: unknown, fallback: string) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : fallback;
const finite = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
export const isoToday = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** Starter content with generic names; every field is editable. */
export function createDefaultInvoice(today = isoToday()): InvoiceData {
  return {
    version: 1, number: "0001", issued: today, due: addDays(today, 30),
    from: { name: "Your company", address: "Street address\nCity, State ZIP" },
    billTo: { name: "Client name", address: "Street address\nCity, State ZIP" },
    lines: [
      { id: "line-1", description: "Line item 1", quantity: 1, rate: 900 },
      { id: "line-2", description: "Line item 2", quantity: 2, rate: 650 },
      { id: "line-3", description: "Line item 3", quantity: 1, rate: 250 },
    ],
    taxRate: 8, note: "Thank you for your business. Payment is due within 30 days.", seq: 3,
  };
}

// Number fields: what is typed is used live (an empty box counts as zero) and tidied up when the field loses focus.
export function parseNumber(text: string) { const value = Number.parseFloat(text); return Number.isFinite(value) ? value : 0; }
/** Whole units from 1 to 999. */
export function clampQuantity(value: number) { return Math.min(LIMITS.quantity.max, Math.max(LIMITS.quantity.min, Math.floor(Number.isFinite(value) ? value : LIMITS.quantity.min))); }
/** Dollars from 0 to 1,000,000, rounded to cents. */
export function clampRate(value: number) { return Math.min(LIMITS.rate.max, Math.max(LIMITS.rate.min, Math.round((Number.isFinite(value) ? value : 0) * 100) / 100)); }
export function clampTax(value: number) { return Math.min(LIMITS.tax.max, Math.max(LIMITS.tax.min, Math.round((Number.isFinite(value) ? value : 0) * 100) / 100)); }
/** Quantity as counted while typing: never negative, whole, capped. Empty is zero. */
export const liveQuantity = (text: string) => Math.min(LIMITS.quantity.max, Math.max(0, Math.floor(parseNumber(text))));
export const liveRate = (text: string) => Math.min(LIMITS.rate.max, Math.max(0, Math.round(parseNumber(text) * 100) / 100));

export const toCents = (dollars: number) => Math.round(dollars * 100);
export const lineCents = (line: Pick<InvoiceLine, "quantity" | "rate">) => line.quantity * toCents(line.rate);
export function totals(invoice: Pick<InvoiceData, "lines" | "taxRate">) {
  const subtotal = invoice.lines.reduce((sum, line) => sum + lineCents(line), 0);
  const tax = Math.round(subtotal * invoice.taxRate / 100);
  return { subtotal, tax, total: subtotal + tax };
}
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatMoney = (cents: number) => money.format(cents / 100);
/** "2026-09-19" to "19 Sep 2026", independent of the viewer's time zone. */
export function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]} ${year}`;
}
export const formatRate = (value: number) => value.toFixed(2);

export const missingDescription = (invoice: Pick<InvoiceData, "lines">) => invoice.lines.findIndex(line => !line.description.trim());

export function newLine(invoice: InvoiceData): { invoice: InvoiceData; line: InvoiceLine } {
  const seq = invoice.seq + 1, line: InvoiceLine = { id: `line-${seq}`, description: "", quantity: 1, rate: 0 };
  return { invoice: { ...invoice, seq, lines: [...invoice.lines, line] }, line };
}

/** Validates data from storage, an import or a backend into a safe invoice, or null. */
export function normalizeInvoice(input: unknown): InvoiceData | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  if (source.version !== 1 || !Array.isArray(source.lines)) return null;
  const defaults = createDefaultInvoice();
  const party = (value: unknown, fallback: InvoiceParty): InvoiceParty => { const raw = value && typeof value === "object" ? value as Record<string, unknown> : {}; return { name: clip(raw.name, LIMITS.text, fallback.name), address: clip(raw.address, LIMITS.address, fallback.address) }; };
  const seen = new Set<string>(), lines: InvoiceLine[] = [];
  for (const entry of source.lines.slice(0, LIMITS.lines)) {
    const raw = entry && typeof entry === "object" ? entry as Record<string, unknown> : null;
    if (!raw || typeof raw.id !== "string" || !raw.id || seen.has(raw.id)) return null;
    seen.add(raw.id);
    lines.push({ id: raw.id.slice(0, 64), description: clip(raw.description, LIMITS.text), quantity: clampQuantity(finite(raw.quantity, 1)), rate: clampRate(finite(raw.rate, 0)) });
  }
  if (!lines.length) return null;
  let seq = Math.max(0, Math.floor(finite(source.seq, 0)));
  for (const line of lines) { const match = /^line-(\d+)$/.exec(line.id); if (match) seq = Math.max(seq, Number(match[1])); }
  return { version: 1, number: clip(source.number, 32, defaults.number), issued: isoDate(source.issued, defaults.issued), due: isoDate(source.due, defaults.due), from: party(source.from, defaults.from), billTo: party(source.billTo, defaults.billTo), lines, taxRate: clampTax(finite(source.taxRate, defaults.taxRate)), note: clip(source.note, LIMITS.note), seq };
}
