import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ApiError, CreateOrderInput } from "@yinne/contracts";
import { inventoryLevels, inventoryMovements, orders } from "@yinne/database";
import {
  adjustInventory,
  cancelOrder,
  createCustomer,
  createOrder,
  createProduct,
  updateProduct,
  type RequestContext,
} from "./index";
const adminUrl = process.env.MIGRATION_DATABASE_URL;
const run = adminUrl ? describe : describe.skip;
const organizationId = "0198f000-0000-7000-8000-000000000001";
const context: RequestContext = {
  tenant: { organizationId, environment: "test" },
  principal: {
    type: "user",
    userId: "0198f000-0000-7000-8000-000000000020",
    memberId: "0198f000-0000-7000-8000-000000000040",
    organizationId,
    environment: "test",
  },
  requestId: "req_phase2_integration",
};

run("Core commerce transactions", () => {
  const adminClient = postgres(adminUrl!, { max: 1, prepare: false });
  const admin = drizzle(adminClient);
  afterAll(async () => {
    await adminClient.end();
  });
  it("derives immutable order snapshots, preserves stock at creation, replays idempotently, and cancels", async () => {
    const suffix = Date.now().toString();
    const customer = await createCustomer(context, {
      name: "Integration Customer",
      email: `commerce-${suffix}@example.test`,
      external_ref: `INT-${suffix}`,
    });
    const product = await createProduct(context, {
      name: `Integration Beans ${suffix}`,
      slug: `integration-beans-${suffix}`,
      variants: [
        {
          sku: `INT-SKU-${suffix}`,
          title: "Bag",
          unit_amount: "125099",
          currency: "NGN",
          track_inventory: true,
        },
      ],
    });
    const active = await updateProduct(context, product.id, { status: "active" });
    const variant = active.variants[0]!;
    const level = await adjustInventory(context, {
      variant_id: variant.id,
      location_id: "0198f000-0000-7000-8000-000000000010",
      delta: "8",
      reason: "Integration opening stock",
    });
    const input: CreateOrderInput = {
      merchant_id: "0198f000-0000-7000-8000-000000000002",
      location_id: "0198f000-0000-7000-8000-000000000010",
      customer_id: customer.id,
      currency: "NGN",
      items: [{ variant_id: variant.id, quantity: 3 }],
    };
    const first = await createOrder(context, input, `integration-${suffix}-stable`);
    const replay = await createOrder(context, input, `integration-${suffix}-stable`);
    expect(replay.id).toBe(first.id);
    expect(first.total_amount).toBe("375297");
    expect(first.financial_status).toBe("unpaid");
    expect(first.fulfilment_status).toBe("unfulfilled");
    expect(first.items[0]).toMatchObject({
      product_name: `Integration Beans ${suffix}`,
      sku: `INT-SKU-${suffix}`,
      unit_amount: "125099",
      quantity: 3,
      total_amount: "375297",
    });
    const [stockAfterOrder] = await admin
      .select()
      .from(inventoryLevels)
      .where(eq(inventoryLevels.id, level.id));
    expect(stockAfterOrder?.onHand).toBe(8n);
    await expect(
      createOrder(
        context,
        { ...input, items: [{ variant_id: variant.id, quantity: 4 }] },
        `integration-${suffix}-stable`,
      ),
    ).rejects.toMatchObject({ code: "idempotency_key_reused" } satisfies Partial<ApiError>);
    const cancelled = await cancelOrder(context, first.id);
    expect(cancelled.fulfilment_status).toBe("cancelled");
    await expect(cancelOrder(context, first.id)).rejects.toMatchObject({
      code: "order_cannot_be_cancelled",
    } satisfies Partial<ApiError>);
  });
  it("rejects negative stock and makes movements database-immutable", async () => {
    const movement = await admin.select().from(inventoryMovements).limit(1);
    expect(movement[0]).toBeDefined();
    await expect(
      admin
        .update(inventoryMovements)
        .set({ reason: "tampered" })
        .where(eq(inventoryMovements.id, movement[0]!.id)),
    ).rejects.toThrow();
    await expect(
      adjustInventory(context, {
        variant_id: "0198f000-0000-7000-8000-000000001200",
        location_id: "0198f000-0000-7000-8000-000000000010",
        delta: "-999999",
        reason: "Impossible shrinkage",
      }),
    ).rejects.toMatchObject({ code: "insufficient_stock" } satisfies Partial<ApiError>);
    const paidMutationSurface = Object.keys(await import("./index"));
    expect(paidMutationSurface).not.toContain("markOrderPaid");
    expect(paidMutationSurface).not.toContain("fulfilOrder");
    expect(orders.financialStatus).toBeDefined();
  });
});
