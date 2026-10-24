import type { YinneClient } from "@yinne/sdk";
import { z } from "zod";
import type { AgentMode } from "./config";
import { amountView } from "./output";
import type { ToolRegistry } from "./registry";
import type { WriteGuard } from "./safety";

const id = z.string().uuid();
const currency = z.string().regex(/^[A-Z]{3}$/);
const minor = z.string().regex(/^[1-9]\d*$/, "Use a positive minor-unit amount string");

export function addWriteTools(
  registry: ToolRegistry,
  client: YinneClient,
  mode: AgentMode,
  guard: WriteGuard,
) {
  if (mode === "read") return;

  registry.add(
    "draft_payment_link",
    "Create a fixed-amount payment link and return its URL. The link is never sent to anyone.",
    z.object({
      merchant_id: id,
      location_id: id,
      name: z.string().min(1).max(160),
      description: z.string().max(2000).optional(),
      amount: minor,
      currency,
    }),
    async (args) => {
      guard.checkAmount(args.amount);
      guard.checkWrite();
      const link = await client.paymentLinks.create(
        {
          ...args,
          kind: "fixed",
          customer_capture: { name: true, email: true, phone: false },
        },
        { idempotencyKey: guard.idempotencyKey("draft_payment_link", args) },
      );
      return {
        summary: `Payment link ${link.id} created; URL returned but not sent.`,
        payment_link: {
          id: link.id,
          status: link.status,
          payment_url: link.payment_url ?? null,
          ...amountView(args.amount, args.currency),
        },
      };
    },
  );

  registry.add(
    "draft_invoice",
    "Create an invoice in draft status only; it is not issued or sent.",
    z.object({
      merchant_id: id,
      customer_id: id,
      location_id: id.optional(),
      currency,
      due_at: z.iso.datetime({ offset: true }).optional(),
      items: z
        .array(
          z.object({
            description: z.string().min(1).max(500),
            quantity: z.number().int().min(1).max(10_000),
            unit_amount: minor,
          }),
        )
        .min(1)
        .max(100),
    }),
    async (args) => {
      const total = args.items.reduce(
        (sum, item) => sum + BigInt(item.unit_amount) * BigInt(item.quantity),
        0n,
      );
      guard.checkAmount(total.toString(), "invoice total");
      guard.checkWrite();
      const invoice = await client.invoices.create(args, {
        idempotencyKey: guard.idempotencyKey("draft_invoice", args),
      });
      if (invoice.status !== "draft") {
        throw new Error(
          `Invoice ${invoice.id} was created with unexpected status ${invoice.status}`,
        );
      }
      return {
        summary: `Draft invoice ${invoice.id} created but not issued.`,
        invoice: {
          id: invoice.id,
          status: invoice.status,
          customer_id: invoice.customer_id,
          ...amountView(invoice.total_amount, invoice.currency),
        },
      };
    },
  );

  registry.add(
    "suggest_reorders",
    "Suggest reorder quantities from existing low-stock levels; does not modify inventory.",
    z.object({
      threshold: z.number().int().min(0).default(5),
      target: z.number().int().min(1).default(20),
      limit: z.number().int().min(1).max(100).default(20),
      location_id: id.optional(),
    }),
    async ({ threshold, target, limit, location_id }) => {
      const page = await client.inventory.list({
        limit: 100,
        ...(location_id ? { location_id } : {}),
      });
      const rows = page.data
        .filter((row) => BigInt(row.on_hand) <= BigInt(threshold))
        .slice(0, limit);
      return {
        summary: `${rows.length} reorder suggestions; inventory was not changed.`,
        suggestions: rows.map((row) => ({
          variant_id: row.variant_id,
          location_id: row.location_id,
          sku: row.sku,
          on_hand: row.on_hand,
          suggested_quantity: (BigInt(target) > BigInt(row.on_hand)
            ? BigInt(target) - BigInt(row.on_hand)
            : 0n
          ).toString(),
        })),
        has_more:
          page.has_more ||
          page.data.filter((row) => BigInt(row.on_hand) <= BigInt(threshold)).length > limit,
      };
    },
  );

  if (mode !== "act") return;

  registry.add(
    "issue_invoice",
    "Issue an existing draft invoice after verifying its status and amount cap.",
    z.object({ invoice_id: id }),
    async ({ invoice_id }) => {
      const current = await client.invoices.retrieve(invoice_id);
      if (current.status === "open") {
        return {
          summary: `Invoice ${current.id} is already issued.`,
          invoice: {
            id: current.id,
            status: current.status,
            invoice_url: current.invoice_url ?? null,
            ...amountView(current.total_amount, current.currency),
          },
        };
      }
      if (current.status !== "draft") throw new Error("Only draft invoices can be issued");
      guard.checkAmount(current.total_amount, "invoice total");
      guard.checkWrite();
      const invoice = await client.invoices.issue(invoice_id, {
        idempotencyKey: guard.idempotencyKey("issue_invoice", { invoice_id }),
      });
      return {
        summary: `Invoice ${invoice.id} issued.`,
        invoice: {
          id: invoice.id,
          status: invoice.status,
          invoice_url: invoice.invoice_url ?? null,
          ...amountView(invoice.total_amount, invoice.currency),
        },
      };
    },
  );
}
