import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  adjustInventory,
  createCustomer,
  createOrder,
  createProduct,
  updateProduct,
  type RequestContext,
} from "@yinne/commerce";
import {
  inventoryLevels,
  inventoryMovements,
  paymentAttempts,
  payments,
  providerEvents,
  transactions,
  webhookDeliveries,
  webhookEndpoints,
  webhookSubscriptions,
} from "@yinne/database";
import { createId } from "@yinne/core";
import { buildMockWebhook } from "./provider";
import { createPayment, createRefund, ingestMockProviderWebhook } from "./services";

const adminUrl = process.env.MIGRATION_DATABASE_URL;
const run = adminUrl ? describe : describe.skip;
const organizationId = "0198f000-0000-7000-8000-000000000001";
const accountId = "0198f000-0000-7000-8000-000000001800";
const context: RequestContext = {
  tenant: { organizationId, environment: "test" },
  principal: {
    type: "user",
    userId: "0198f000-0000-7000-8000-000000000020",
    memberId: "0198f000-0000-7000-8000-000000000040",
    organizationId,
    environment: "test",
  },
  requestId: "req_phase3_integration",
};

async function payableOrder(suffix: string) {
  const customer = await createCustomer(context, {
    name: "Payment Customer",
    external_ref: `PAY-${suffix}`,
  });
  const product = await createProduct(context, {
    name: `Payment Beans ${suffix}`,
    slug: `payment-beans-${suffix}`,
    variants: [
      {
        sku: `PAY-SKU-${suffix}`,
        title: "Bag",
        unit_amount: "250001",
        currency: "NGN",
        track_inventory: true,
      },
    ],
  });
  const active = await updateProduct(context, product.id, { status: "active" });
  const level = await adjustInventory(context, {
    variant_id: active.variants[0]!.id,
    location_id: "0198f000-0000-7000-8000-000000000010",
    delta: "5",
    reason: "Payment test stock",
  });
  const order = await createOrder(
    context,
    {
      merchant_id: "0198f000-0000-7000-8000-000000000002",
      location_id: "0198f000-0000-7000-8000-000000000010",
      customer_id: customer.id,
      currency: "NGN",
      items: [{ variant_id: active.variants[0]!.id, quantity: 2 }],
    },
    `order-payment-${suffix}`,
  );
  return { order, level };
}

run("Payments Core PostgreSQL lifecycle", () => {
  const client = postgres(adminUrl!, { max: 1, prepare: false });
  const admin = drizzle(client);
  afterAll(() => client.end());
  it("executes once, decrements stock, records immutable evidence, and supports partial/full refunds", async () => {
    const suffix = Date.now().toString();
    const { order, level } = await payableOrder(suffix);
    const input = { order_id: order.id, confirmation: { mock_scenario: "success" as const } };
    const paid = (await createPayment(context, input, `payment-${suffix}-stable`)) as {
      id: string;
      status: string;
      transactions: unknown[];
    };
    const replay = (await createPayment(context, input, `payment-${suffix}-stable`)) as {
      id: string;
    };
    expect(replay.id).toBe(paid.id);
    expect(paid.status).toBe("succeeded");
    expect(paid.transactions).toHaveLength(1);
    const [stock] = await admin
      .select()
      .from(inventoryLevels)
      .where(eq(inventoryLevels.id, level.id));
    expect(stock?.onHand).toBe(3n);
    const movements = await admin
      .select()
      .from(inventoryMovements)
      .where(
        and(eq(inventoryMovements.orderId, order.id), eq(inventoryMovements.reason, "order_paid")),
      );
    expect(movements).toHaveLength(1);
    const partial = (await createRefund(
      context,
      {
        payment_id: paid.id,
        amount: "100000",
        reason: "partial",
        confirmation: { mock_scenario: "refund_success" },
      },
      `refund-${suffix}-partial`,
    )) as { status: string };
    expect(partial.status).toBe("succeeded");
    const full = (await createRefund(
      context,
      {
        payment_id: paid.id,
        reason: "remainder",
        confirmation: { mock_scenario: "refund_success" },
      },
      `refund-${suffix}-remainder`,
    )) as { amount: string };
    expect(full.amount).toBe("400002");
    const evidence = await admin
      .select()
      .from(transactions)
      .where(eq(transactions.paymentId, paid.id));
    expect(evidence).toHaveLength(3);
    await expect(
      admin.update(transactions).set({ amount: 1n }).where(eq(transactions.id, evidence[0]!.id)),
    ).rejects.toThrow();
    await expect(
      createRefund(
        context,
        {
          payment_id: paid.id,
          amount: "1",
          reason: "over",
          confirmation: { mock_scenario: "refund_success" },
        },
        `refund-${suffix}-over`,
      ),
    ).rejects.toMatchObject({ code: "payment_not_refundable" });
  });
  it("resolves pending through a signed webhook and deduplicates replay", async () => {
    const suffix = `${Date.now()}-pending`;
    const { order } = await payableOrder(suffix);
    const endpointId = createId();
    await admin.insert(webhookEndpoints).values({
      id: endpointId,
      organizationId,
      environment: "test",
      url: `https://example.test/yinne/${suffix}`,
      secretCiphertext: "encrypted-test-fixture",
      status: "enabled",
    });
    await admin
      .insert(webhookSubscriptions)
      .values({ organizationId, endpointId, eventPattern: "payment.*" });
    const pending = (await createPayment(
      context,
      { order_id: order.id, confirmation: { mock_scenario: "pending:then_success" } },
      `payment-${suffix}-stable`,
    )) as { id: string; status: string };
    expect(pending.status).toBe("pending");
    const [attempt] = await admin
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentId, pending.id));
    const signed = buildMockWebhook("payment.succeeded", attempt!.providerReference!);
    const first = await ingestMockProviderWebhook({
      organizationId,
      accountId,
      rawBody: signed.rawBody,
      signature: signed.signature,
      timestamp: signed.timestamp,
      requestId: `req-${suffix}`,
    });
    const duplicate = await ingestMockProviderWebhook({
      organizationId,
      accountId,
      rawBody: signed.rawBody,
      signature: signed.signature,
      timestamp: signed.timestamp,
      requestId: `req-${suffix}-2`,
    });
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    const [updated] = await admin.select().from(payments).where(eq(payments.id, pending.id));
    expect(updated?.status).toBe("succeeded");
    const eventPayload = JSON.parse(signed.rawBody) as { id: string };
    expect(
      await admin.select().from(transactions).where(eq(transactions.paymentId, pending.id)),
    ).toHaveLength(1);
    expect(
      await admin
        .select()
        .from(webhookDeliveries)
        .where(
          and(
            eq(webhookDeliveries.endpointId, endpointId),
            eq(webhookDeliveries.eventId, first.provider_event_id),
          ),
        ),
    ).toHaveLength(0);
    const queued = await admin
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId));
    expect(queued.some((delivery) => delivery.status === "queued")).toBe(true);
    expect(
      await admin
        .select()
        .from(providerEvents)
        .where(eq(providerEvents.externalId, eventPayload.id)),
    ).toHaveLength(1);
  });
});
