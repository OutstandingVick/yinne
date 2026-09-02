import { ApiError } from "@yinne/contracts";
export type InvoiceStatus = "draft" | "open" | "paid" | "void";
export function displayInvoiceStatus(status: InvoiceStatus, dueAt: Date | null, now = new Date()) {
  return status === "open" && dueAt && dueAt < now ? "overdue" : status;
}
export function assertInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus) {
  const allowed: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ["open", "void"],
    open: ["paid", "void"],
    paid: [],
    void: [],
  };
  if (!allowed[from].includes(to))
    throw new ApiError(
      409,
      "conflict",
      "invalid_invoice_transition",
      `Invoice cannot transition from ${from} to ${to}.`,
    );
}
export function invoiceTotal(items: { unit_amount: string; quantity: number }[]) {
  const total = items.reduce(
    (sum, item) => sum + BigInt(item.unit_amount) * BigInt(item.quantity),
    0n,
  );
  if (total <= 0n || total > 9_223_372_036_854_775_807n)
    throw new ApiError(
      400,
      "invalid_request",
      "invoice_amount_invalid",
      "Invoice total is outside the supported range.",
    );
  return total;
}
