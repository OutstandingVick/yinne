import { paginate, type Page, type YinneClient } from "@yinne/sdk";
import { z } from "zod";
import { amountView, money } from "./output";
import type { ToolRegistry } from "./registry";

const limit = z.number().int().min(1).max(100).default(20);
const date = z.iso.datetime({ offset: true });
const period = z
  .object({
    from: date,
    to: date,
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
  })
  .refine((value) => value.from < value.to, "to must be later than from");
const listInput = z.object({ limit, search: z.string().optional() });
const idInput = z.object({ id: z.uuid() });

async function collect<T, P extends { after?: string }>(
  fetchPage: (params?: P) => Promise<Page<T>>,
  params: P,
  max: number,
  keep: (row: T) => boolean = () => true,
) {
  const data: T[] = [];
  let scanned = 0;
  let more = false;
  for await (const row of paginate(fetchPage, params)) {
    scanned++;
    if (keep(row)) {
      if (data.length === max) {
        more = true;
        break;
      }
      data.push(row);
    }
    if (scanned >= 2000) {
      more = true;
      break;
    }
  }
  return { data, has_more: more, scan_limited: scanned >= 2000 };
}

function inRange(value: string, from?: string, to?: string) {
  return (!from || value >= from) && (!to || value <= to);
}

function moneyMap(value: unknown) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([currency, amount]) =>
    typeof amount === "string" && /^-?\d+$/.test(amount)
      ? [{ currency, amount, formatted_amount: money(amount, currency) }]
      : [],
  );
}

export function addReadTools(registry: ToolRegistry, client: YinneClient) {
  registry.add(
    "get_overview",
    "Sales overview for a date range; values are minor units by currency.",
    period,
    async (args) => {
      const params = {
        from: args.from,
        to: args.to,
        ...(args.currency ? { currency: args.currency } : {}),
        granularity: "day" as const,
      };
      const [overview, sales] = await Promise.all([
        client.analytics.overview(params),
        client.analytics.sales(params),
      ]);
      const metrics = overview.metrics as Record<string, unknown> | undefined;
      const unpaid: Record<string, bigint> = {};
      let scanned = 0;
      let complete = true;
      for await (const order of paginate(client.orders.list, {
        limit: 100,
        financial_status: "unpaid",
      })) {
        scanned++;
        if (scanned > 2000) {
          complete = false;
          break;
        }
        if (
          inRange(order.created_at, args.from, args.to) &&
          (!args.currency || order.currency === args.currency)
        ) {
          unpaid[order.currency] = (unpaid[order.currency] ?? 0n) + BigInt(order.total_amount);
        }
      }
      return {
        summary: complete
          ? "Collected, refunded, and unpaid-order totals returned."
          : "Collected and refunded totals returned; unpaid orders exceeded the safe scan limit.",
        from: args.from,
        to: args.to,
        collected: moneyMap(metrics?.net_collected),
        refunded: moneyMap(sales.refunds),
        unpaid: complete
          ? moneyMap(
              Object.fromEntries(
                Object.entries(unpaid).map(([currency, amount]) => [currency, amount.toString()]),
              ),
            )
          : null,
        unpaid_definition:
          "Sum of unpaid orders created in the requested date range; not a native analytics metric.",
        unavailable_reason: complete
          ? undefined
          : "More than 2,000 unpaid orders; an exact total cannot be safely derived.",
      };
    },
  );

  registry.add(
    "list_orders",
    "List orders with optional customer, status, and creation-date filters.",
    listInput.extend({
      customer_id: z.string().optional(),
      financial_status: z.enum(["unpaid", "paid", "partially_refunded", "refunded"]).optional(),
      from: date.optional(),
      to: date.optional(),
    }),
    async ({ limit: max, search, from, to, customer_id, financial_status }) => {
      const page = await collect(
        client.orders.list,
        {
          limit: 100,
          ...(search ? { search } : {}),
          ...(customer_id ? { customer_id } : {}),
          ...(financial_status ? { financial_status } : {}),
        },
        max,
        (row) => inRange(row.created_at, from, to),
      );
      return {
        summary: `${page.data.length} orders returned${page.has_more ? "; more may exist" : ""}.`,
        orders: page.data.map((row) => ({
          id: row.id,
          number: row.number,
          customer_id: row.customer_id,
          financial_status: row.financial_status,
          fulfilment_status: row.fulfilment_status,
          ...amountView(row.total_amount, row.currency),
          created_at: row.created_at,
        })),
        has_more: page.has_more,
        scan_limited: page.scan_limited,
      };
    },
  );

  registry.add("get_order", "Retrieve an order by ID.", idInput, async ({ id }) => {
    const row = await client.orders.retrieve(id);
    return {
      summary: `Order ${row.number}: ${row.financial_status}.`,
      order: {
        id: row.id,
        number: row.number,
        customer_id: row.customer_id,
        financial_status: row.financial_status,
        fulfilment_status: row.fulfilment_status,
        ...amountView(row.total_amount, row.currency),
        items: row.items.map((item) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          ...amountView(item.total_amount, item.currency),
        })),
      },
    };
  });

  registry.add("list_customers", "List customers.", listInput, async ({ limit: max, search }) => {
    const page = await collect(
      client.customers.list,
      { limit: 100, ...(search ? { search } : {}) },
      max,
    );
    return {
      summary: `${page.data.length} customers returned${page.has_more ? "; more may exist" : ""}.`,
      customers: page.data.map(({ id, name, email, phone, pii_redacted }) => ({
        id,
        name,
        email,
        phone,
        pii_redacted,
      })),
      has_more: page.has_more,
    };
  });

  registry.add("get_customer", "Retrieve a customer by ID.", idInput, async ({ id }) => {
    const { name, email, phone, pii_redacted } = await client.customers.retrieve(id);
    return {
      summary: `Customer ${id} returned.`,
      customer: { id, name, email, phone, pii_redacted },
    };
  });

  registry.add(
    "list_products",
    "List products and their variants.",
    listInput.extend({ status: z.enum(["draft", "active", "archived"]).optional() }),
    async ({ limit: max, search, status }) => {
      const page = await collect(
        client.products.list,
        { limit: 100, ...(search ? { search } : {}), ...(status ? { status } : {}) },
        max,
      );
      return {
        summary: `${page.data.length} products returned${page.has_more ? "; more may exist" : ""}.`,
        products: page.data.map(({ id, name, status, variants }) => ({
          id,
          name,
          status,
          variants: variants.map(({ id, sku, title, unit_amount, currency }) => ({
            id,
            sku,
            title,
            ...amountView(unit_amount, currency),
          })),
        })),
        has_more: page.has_more,
      };
    },
  );

  registry.add(
    "get_inventory",
    "List inventory and flag levels at or below the threshold.",
    listInput.extend({
      threshold: z.number().int().min(0).default(5),
      location_id: z.string().optional(),
    }),
    async ({ limit: max, threshold, location_id }) => {
      const page = await collect(
        client.inventory.list,
        { limit: 100, ...(location_id ? { location_id } : {}) },
        max,
      );
      return {
        summary: `${page.data.length} inventory levels returned; low stock is on_hand <= ${threshold}.`,
        inventory: page.data.map((row) => ({
          id: row.id,
          variant_id: row.variant_id,
          location_id: row.location_id,
          sku: row.sku,
          product_name: row.product_name,
          on_hand: row.on_hand,
          low_stock: BigInt(row.on_hand) <= BigInt(threshold),
        })),
        has_more: page.has_more,
      };
    },
  );

  registry.add(
    "list_payments",
    "List payments with optional status and customer filters.",
    listInput.extend({
      status: z
        .enum([
          "created",
          "pending",
          "succeeded",
          "failed",
          "cancelled",
          "partially_refunded",
          "refunded",
        ])
        .optional(),
      customer_id: z.string().optional(),
    }),
    async ({ limit: max, search, status, customer_id }) => {
      const page = await collect(
        client.payments.list,
        {
          limit: 100,
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(customer_id ? { customer_id } : {}),
        },
        max,
      );
      return {
        summary: `${page.data.length} payments returned${page.has_more ? "; more may exist" : ""}.`,
        payments: page.data.map((row) => ({
          id: row.id,
          order_id: row.order_id,
          customer_id: row.customer_id,
          status: row.status,
          ...amountView(row.amount, row.currency),
          refunded: amountView(row.refunded_amount, row.currency),
          created_at: row.created_at,
        })),
        has_more: page.has_more,
      };
    },
  );

  registry.add(
    "list_invoices",
    "List invoices; unpaid means issued/open and overdue means past due.",
    z.object({
      limit,
      filter: z.enum(["all", "unpaid", "overdue"]).default("all"),
      customer_id: z.string().optional(),
    }),
    async ({ limit: max, filter, customer_id }) => {
      const page = await client.invoices.list({
        limit: 100,
        ...(customer_id ? { customer_id } : {}),
      });
      const now = new Date().toISOString();
      const filtered = page.data.filter(
        (row) =>
          filter === "all" ||
          (row.status === "open" &&
            (filter === "unpaid" || (row.due_at !== null && row.due_at < now))),
      );
      const rows = filtered.slice(0, max);
      const hasMore = page.has_more || filtered.length > max;
      return {
        summary: `${rows.length} invoices returned${hasMore ? "; more may exist" : ""}.`,
        invoices: rows.map((row) => ({
          id: row.id,
          invoice_number: row.invoice_number,
          customer_id: row.customer_id,
          status: row.status,
          display_status: row.display_status,
          due_at: row.due_at,
          ...amountView(row.total_amount, row.currency),
          invoice_url: row.invoice_url,
        })),
        has_more: hasMore,
        note:
          page.has_more && filter !== "all"
            ? "Filter applied to the first API page only."
            : undefined,
      };
    },
  );

  registry.add(
    "list_subscriptions",
    "List subscriptions.",
    z.object({
      limit,
      status: z.enum(["trialing", "active", "past_due", "paused", "cancelled", "ended"]).optional(),
      customer_id: z.string().optional(),
    }),
    async ({ limit: max, status, customer_id }) => {
      const page = await client.subscriptions.list({
        limit: max,
        ...(status ? { status } : {}),
        ...(customer_id ? { customer_id } : {}),
      });
      return {
        summary: `${page.data.length} subscriptions returned${page.has_more ? "; more may exist" : ""}.`,
        subscriptions: page.data.map((row) => ({
          id: row.id,
          customer_id: row.customer_id,
          plan_id: row.plan_id,
          status: row.status,
          ...amountView(row.unit_amount, row.currency),
          interval: row.interval,
          next_billing_at: row.next_billing_at,
        })),
        has_more: page.has_more,
      };
    },
  );

  registry.add("get_sales_report", "Sales analytics by day and currency.", period, async (args) => {
    const report = await client.analytics.sales({
      from: args.from,
      to: args.to,
      ...(args.currency ? { currency: args.currency } : {}),
      granularity: "day",
    });
    return {
      summary: `Sales report from ${args.from} to ${args.to}; the API provides currency aggregates, not daily buckets.`,
      from: args.from,
      to: args.to,
      currency: args.currency ?? null,
      gmv: moneyMap(report.gmv),
      net_collected: moneyMap(report.net_collected),
      refunded: moneyMap(report.refunds),
      paid_order_count: report.paid_order_count,
      channels: Array.isArray(report.channels)
        ? report.channels.map((channel) => {
            if (!channel || typeof channel !== "object") return null;
            const fields = channel as Record<string, unknown>;
            return {
              channel: fields.channel,
              paid_order_count: fields.paid_order_count,
              paid_order_volume: moneyMap(fields.paid_order_volume),
            };
          })
        : [],
      daily_breakdown: null,
    };
  });
}
