import { describe, expect, it } from "vitest";
import { assertInvoiceTransition, displayInvoiceStatus, invoiceTotal } from "./state";

describe("invoice lifecycle", () => {
  it.each([
    ["draft", "open"],
    ["draft", "void"],
    ["open", "paid"],
    ["open", "void"],
  ] as const)("allows %s to become %s", (from, to) => {
    expect(() => assertInvoiceTransition(from, to)).not.toThrow();
  });

  it("makes paid and void invoices terminal", () => {
    expect(() => assertInvoiceTransition("paid", "void")).toThrow();
    expect(() => assertInvoiceTransition("void", "open")).toThrow();
  });

  it("derives overdue without mutating the canonical status", () => {
    expect(displayInvoiceStatus("open", new Date("2026-01-01"), new Date("2026-02-01"))).toBe(
      "overdue",
    );
    expect(displayInvoiceStatus("paid", new Date("2026-01-01"), new Date("2026-02-01"))).toBe(
      "paid",
    );
  });

  it("calculates totals using integer minor units", () => {
    expect(invoiceTotal([{ unit_amount: "2500", quantity: 3 }])).toBe(7500n);
    expect(() => invoiceTotal([{ unit_amount: "0", quantity: 1 }])).toThrow();
  });
});
