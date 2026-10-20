import test from "node:test";
import assert from "node:assert/strict";
import { addDays, clampQuantity, clampRate, clampTax, createDefaultInvoice, formatDate, formatMoney, lineCents, liveQuantity, liveRate, missingDescription, newLine, normalizeInvoice, totals } from "./invoice-model.ts";

const base = () => createDefaultInvoice("2026-09-19");

test("default invoice is generic and totals match the lines", () => {
  const invoice = base();
  assert.deepEqual([invoice.lines.length, invoice.taxRate, invoice.issued, invoice.due], [3, 8, "2026-09-19", "2026-10-19"]);
  assert.doesNotMatch(JSON.stringify(invoice), /Northstar|Acme|Hudson|Discovery/);
  assert.deepEqual(totals(invoice), { subtotal: 245000, tax: 19600, total: 264600 });
  assert.equal(formatMoney(264600), "$2,646.00");
  assert.equal(formatMoney(0), "$0.00");
  assert.equal(formatMoney(100000000), "$1,000,000.00");
});

test("money is computed in cents so rounding never drifts", () => {
  const lines = [{ id: "a", description: "x", quantity: 3, rate: 0.1 }, { id: "b", description: "y", quantity: 1, rate: 19.99 }];
  assert.equal(lineCents(lines[0]), 30);
  assert.deepEqual(totals({ lines, taxRate: 8 }), { subtotal: 2029, tax: 162, total: 2191 });
  assert.equal(totals({ lines: [{ id: "a", description: "", quantity: 1, rate: 0.01 }], taxRate: 50 }).tax, 1, "half a cent rounds up");
  assert.deepEqual(totals({ lines: [], taxRate: 8 }), { subtotal: 0, tax: 0, total: 0 });
});

test("number fields: live typing counts, blur tidies", () => {
  assert.deepEqual(["", "abc", "5", "5000", "-3", "2.7"].map(liveQuantity), [0, 0, 5, 999, 0, 2]);
  assert.deepEqual([0, 5000, -3, 2.7, NaN, 7].map(clampQuantity), [1, 999, 1, 2, 1, 7]);
  assert.deepEqual(["", "1234.5", "12.3456", "-5", "99999999"].map(liveRate), [0, 1234.5, 12.35, 0, 1000000]);
  assert.deepEqual([12.3456, -5, 99999999, NaN, 0.005].map(clampRate), [12.35, 0, 1000000, 0, 0.01]);
  assert.deepEqual([-1, 8, 100, 250, NaN].map(clampTax), [0, 8, 100, 100, 0]);
});

test("dates read the same in every time zone", () => {
  assert.equal(formatDate("2026-09-19"), "19 Sep 2026");
  assert.equal(formatDate("2027-01-05"), "5 Jan 2027");
  assert.equal(addDays("2026-09-19", 30), "2026-10-19");
  assert.equal(addDays("2026-12-15", 30), "2027-01-14");
});

test("new lines get fresh ids and start empty; blank descriptions are found", () => {
  let invoice = base();
  const first = newLine(invoice); invoice = first.invoice;
  assert.deepEqual([first.line.id, first.line.description, first.line.quantity, first.line.rate], ["line-4", "", 1, 0]);
  assert.equal(missingDescription(invoice), 3);
  const removed = { ...invoice, lines: invoice.lines.filter(line => line.id !== "line-2") };
  assert.equal(newLine(removed).line.id, "line-5", "ids never come back after a removal");
  assert.equal(missingDescription(base()), -1);
  assert.equal(missingDescription({ lines: [{ id: "a", description: "   ", quantity: 1, rate: 0 }] }), 0);
});

test("stored or imported data is validated into a safe invoice", () => {
  assert.equal(normalizeInvoice(null), null);
  assert.equal(normalizeInvoice({ version: 2, lines: [] }), null);
  assert.equal(normalizeInvoice({ version: 1, lines: [] }), null, "at least one line");
  assert.equal(normalizeInvoice({ version: 1, lines: [{ id: "a" }, { id: "a" }] }), null, "duplicate ids");
  const invoice = normalizeInvoice(JSON.parse(JSON.stringify(base())));
  assert.deepEqual(invoice, base());
  const messy = normalizeInvoice({ version: 1, number: 7, issued: "yesterday", due: "2026-02-30x", from: { name: "A".repeat(500) }, lines: [{ id: "line-9", description: "Work", quantity: 5000, rate: -4 }], taxRate: 900, seq: 1 });
  assert.deepEqual([messy.number, messy.from.name.length, messy.lines[0].quantity, messy.lines[0].rate, messy.taxRate, messy.seq], ["0001", 120, 999, 0, 100, 9]);
  assert.match(messy.issued, /^\d{4}-\d{2}-\d{2}$/);
});
