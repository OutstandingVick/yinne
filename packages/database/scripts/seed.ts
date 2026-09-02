import { config as loadDotEnv } from "dotenv";
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { hashPassword, permissionKeys, predefinedRolePermissions, roleKeys } from "@yinne/auth";
import {
  auditLogs,
  customers,
  checkoutLineItems,
  checkoutSessions,
  events,
  inventoryLevels,
  inventoryMovements,
  locations,
  merchants,
  organizationMembers,
  organizations,
  orderItems,
  orders,
  outboxMessages,
  paymentAttempts,
  paymentLinks,
  payments,
  permissions,
  products,
  providerAccounts,
  refunds,
  roleAssignments,
  rolePermissions,
  roles,
  seedVersions,
  storeListings,
  stores,
  transactions,
  users,
  variants,
} from "../src/schema";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
const password = process.env.YINNE_SEED_PASSWORD;
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL is required.");
if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_YINNE_MODE === "live") {
  throw new Error("The Acme seed is disabled in production/live mode.");
}

function fixtureId(sequence: number): string {
  return "0198f000-0000-7000-8000-" + sequence.toString().padStart(12, "0");
}

const client = postgres(migrationUrl, { max: 1, prepare: false });
const db = drizzle(client);
const organizationId = fixtureId(1);
const merchantId = fixtureId(2);
const eventId = fixtureId(3);
const passwordHash = await hashPassword(password);

const roleIdByKey = new Map(roleKeys.map((key, index) => [key, fixtureId(100 + index)]));
const permissionIdByKey = new Map(
  permissionKeys.map((key, index) => [key, fixtureId(200 + index)]),
);

const people = [
  ["owner", "owner@acme.test", "Ada Owner", "owner"],
  ["admin", "admin@acme.test", "Bola Admin", "admin"],
  ["finance", "finance@acme.test", "Chidi Finance", "finance"],
  ["manager", "manager@acme.test", "Dami Manager", "manager"],
  ["staff", "staff@acme.test", "Efe Staff", "staff"],
  ["analyst", "analyst@acme.test", "Fola Analyst", "analyst"],
  ["developer", "developer@acme.test", "Goke Developer", "developer"],
] as const;

try {
  await db.transaction(async (tx) => {
    for (const key of roleKeys) {
      await tx
        .insert(roles)
        .values({
          id: roleIdByKey.get(key),
          key,
          name: key[0]!.toUpperCase() + key.slice(1),
          description: "Predefined " + key + " role.",
        })
        .onConflictDoUpdate({
          target: roles.key,
          set: { name: key[0]!.toUpperCase() + key.slice(1) },
        });
    }

    for (const key of permissionKeys) {
      await tx
        .insert(permissions)
        .values({
          id: permissionIdByKey.get(key),
          key,
          description: "Allows " + key.replaceAll(":", " "),
        })
        .onConflictDoNothing({ target: permissions.key });
    }

    for (const roleKey of roleKeys) {
      const roleId = roleIdByKey.get(roleKey)!;
      for (const permissionKey of predefinedRolePermissions[roleKey]) {
        await tx
          .insert(rolePermissions)
          .values({
            roleId,
            permissionId: permissionIdByKey.get(permissionKey)!,
          })
          .onConflictDoNothing();
      }
    }

    await tx
      .insert(organizations)
      .values({
        id: organizationId,
        name: "Acme Coffee",
        slug: "acme-coffee",
        defaultCurrency: "NGN",
        timezone: "Africa/Lagos",
      })
      .onConflictDoUpdate({ target: organizations.slug, set: { name: "Acme Coffee" } });

    await tx
      .insert(providerAccounts)
      .values({
        id: fixtureId(1800),
        organizationId,
        provider: "mock",
        label: "Acme deterministic mock",
        environment: "test",
        capabilities: ["payment.create", "payment.retrieve", "payment.refund", "webhook.verify"],
        supportedCurrencies: ["NGN", "USD", "EUR", "GBP"],
        configuration: { default_scenario: "success", simulated: true },
        status: "enabled",
        isDefault: true,
      })
      .onConflictDoUpdate({
        target: providerAccounts.id,
        set: { status: "enabled", isDefault: true, updatedAt: new Date() },
      });

    await tx
      .insert(merchants)
      .values({
        id: merchantId,
        organizationId,
        legalName: "Acme Coffee Limited",
        displayName: "Acme Coffee",
        slug: "acme",
      })
      .onConflictDoNothing();

    const locationNames = [
      ["Ikeja Flagship", "store"],
      ["Lekki Café", "store"],
      ["Yaba Kiosk", "pop_up"],
      ["Surulere Warehouse", "warehouse"],
    ] as const;
    for (const [index, [name, type]] of locationNames.entries()) {
      await tx
        .insert(locations)
        .values({
          id: fixtureId(10 + index),
          organizationId,
          merchantId,
          name,
          type,
          timezone: "Africa/Lagos",
        })
        .onConflictDoNothing();
    }

    await tx
      .insert(stores)
      .values({
        id: fixtureId(2300),
        organizationId,
        merchantId,
        environment: "test",
        publicName: "Acme Coffee",
        slug: "acme-coffee",
        description: "Freshly roasted coffee and café favourites from Lagos.",
        status: "active",
        currency: "NGN",
        defaultLocationId: fixtureId(10),
        contactEmail: "hello@acme.test",
        appearance: {
          primary_color: "#1f6f50",
          background_color: "#fffdf7",
          text_color: "#17211d",
          type_scale: "comfortable",
          radius: "medium",
        },
      })
      .onConflictDoUpdate({
        target: [stores.organizationId, stores.merchantId, stores.environment],
        set: { status: "active", publicName: "Acme Coffee", updatedAt: new Date() },
      });

    const checkoutFixtures = [
      {
        id: fixtureId(1900),
        token: Buffer.alloc(32, 11).toString("base64url"),
        status: "open",
        expiresAt: new Date(Date.now() + 1_800_000),
      },
      {
        id: fixtureId(1901),
        token: Buffer.alloc(32, 12).toString("base64url"),
        status: "processing",
        expiresAt: new Date(Date.now() + 1_800_000),
      },
      {
        id: fixtureId(1902),
        token: Buffer.alloc(32, 13).toString("base64url"),
        status: "completed",
        expiresAt: new Date(Date.now() - 86_400_000),
        completedAt: new Date(),
      },
      {
        id: fixtureId(1903),
        token: Buffer.alloc(32, 14).toString("base64url"),
        status: "expired",
        expiresAt: new Date(Date.now() - 86_400_000),
      },
    ] as const;
    const linkFixtures = [
      {
        id: fixtureId(1950),
        token: Buffer.alloc(32, 21).toString("base64url"),
        name: "Acme tasting event",
        status: "active",
        usageLimit: null,
        used: 0,
      },
      {
        id: fixtureId(1951),
        token: Buffer.alloc(32, 22).toString("base64url"),
        name: "Paused collection",
        status: "inactive",
        usageLimit: null,
        used: 0,
      },
      {
        id: fixtureId(1952),
        token: Buffer.alloc(32, 23).toString("base64url"),
        name: "Sold-out workshop",
        status: "active",
        usageLimit: 1,
        used: 1,
      },
    ] as const;
    for (const link of linkFixtures)
      await tx
        .insert(paymentLinks)
        .values({
          id: link.id,
          organizationId,
          environment: "test",
          merchantId,
          locationId: fixtureId(10),
          publicTokenDigest: createHash("sha256").update(link.token).digest("hex"),
          publicTokenPrefix: link.token.slice(0, 8),
          name: link.name,
          description: "Seeded fixed-amount Payment Link",
          kind: "fixed",
          status: link.status,
          fixedAmount: 250000n,
          currency: "NGN",
          usageLimit: link.usageLimit,
          completedUsageCount: link.used,
          customerCapture: { name: true, email: true, phone: false },
          metadata: { seeded: true },
        })
        .onConflictDoNothing();
    for (const session of checkoutFixtures) {
      await tx
        .insert(checkoutSessions)
        .values({
          id: session.id,
          organizationId,
          environment: "test",
          merchantId,
          locationId: fixtureId(10),
          publicTokenDigest: createHash("sha256").update(session.token).digest("hex"),
          publicTokenPrefix: session.token.slice(0, 8),
          status: session.status,
          amount: 250000n,
          currency: "NGN",
          customerCapture: { name: true, email: true, phone: false },
          expiresAt: session.expiresAt,
          completedAt: "completedAt" in session ? session.completedAt : null,
          metadata: { seeded: true },
        })
        .onConflictDoNothing();
      await tx
        .insert(checkoutLineItems)
        .values({
          id: fixtureId(1960 + checkoutFixtures.indexOf(session)),
          organizationId,
          checkoutSessionId: session.id,
          description: "Acme tasting event",
          variantTitle: "Collection",
          sku: `SEED-CHECKOUT-${checkoutFixtures.indexOf(session)}`,
          unitAmount: 250000n,
          currency: "NGN",
          quantity: 1,
          totalAmount: 250000n,
        })
        .onConflictDoNothing();
    }

    for (const [index, [, email, name, roleKey]] of people.entries()) {
      const userId = fixtureId(20 + index);
      const memberId = fixtureId(40 + index);
      await tx
        .insert(users)
        .values({
          id: userId,
          email,
          normalizedEmail: email,
          name,
          passwordHash,
          status: "active",
        })
        .onConflictDoUpdate({ target: users.normalizedEmail, set: { name, passwordHash } });
      await tx
        .insert(organizationMembers)
        .values({
          id: memberId,
          organizationId,
          userId,
          status: "active",
          joinedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [organizationMembers.organizationId, organizationMembers.userId],
          set: { status: "active" },
        });

      const scopeType = roleKey === "manager" || roleKey === "staff" ? "location" : "organization";
      const scopeId = scopeType === "location" ? fixtureId(10) : organizationId;
      await tx
        .insert(roleAssignments)
        .values({
          id: fixtureId(60 + index),
          organizationId,
          memberId,
          roleId: roleIdByKey.get(roleKey)!,
          scopeType,
          scopeId,
        })
        .onConflictDoNothing();
    }

    await tx
      .insert(auditLogs)
      .values({
        id: fixtureId(80),
        organizationId,
        actorType: "system",
        actorId: "seed",
        action: "organization.created",
        targetType: "organization",
        targetId: organizationId,
        requestId: "req_seed_phase_1",
        metadata: { dataset: "acme-foundation", version: 1 },
      })
      .onConflictDoNothing();

    await tx
      .insert(events)
      .values({
        id: eventId,
        organizationId,
        type: "organization.created",
        version: 1,
        apiVersion: "2026-08-27",
        environment: "test",
        aggregateType: "organization",
        aggregateId: organizationId,
        aggregateVersion: 1,
        actorType: "system",
        actorId: "seed",
        requestId: "req_seed_phase_1",
        payload: { organization_id: organizationId, name: "Acme Coffee" },
        occurredAt: new Date("2026-08-27T12:00:00Z"),
      })
      .onConflictDoNothing();

    await tx
      .insert(outboxMessages)
      .values({
        id: fixtureId(81),
        organizationId,
        eventId,
        topic: "domain.organization",
        state: "processed",
        processedAt: new Date("2026-08-27T12:00:01Z"),
      })
      .onConflictDoUpdate({
        target: outboxMessages.id,
        set: { state: "processed", processedAt: new Date("2026-08-27T12:00:01Z") },
      });

    const customerNames = [
      "Amina Bello",
      "Tunde Adeyemi",
      "Chioma Okafor",
      "Seyi Balogun",
      "Kemi Johnson",
      "Emeka Nwosu",
      "Zainab Musa",
      "Femi Adebayo",
      "Ifeoma Eze",
      "Kunle Martins",
      "Nneka Obi",
      "David Etim",
      "Maryam Lawal",
      "Yemi Cole",
      "Blessing Udo",
      "Ibrahim Garba",
      "Tolani George",
      "Adaeze Ibe",
      "Chinedu Umeh",
      "Moyo Bankole",
    ];
    for (const [index, name] of customerNames.entries()) {
      await tx
        .insert(customers)
        .values({
          id: fixtureId(1000 + index),
          organizationId,
          name,
          email: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`,
          phone: `+234800000${index.toString().padStart(4, "0")}`,
          externalRef: `ACME-CUST-${(index + 1).toString().padStart(3, "0")}`,
          metadata: { segment: index % 3 === 0 ? "regular" : "walk_in" },
          createdAt: new Date(Date.UTC(2026, 7, 1 + index, 9)),
          updatedAt: new Date(Date.UTC(2026, 7, 1 + index, 9)),
        })
        .onConflictDoUpdate({ target: customers.id, set: { name } });
    }

    const catalogue = [
      ["House Espresso", "house-espresso", "ESP-250", "250 g", 650000n],
      ["Lagos Morning Blend", "lagos-morning-blend", "LMB-250", "250 g", 720000n],
      ["Cold Brew Bottle", "cold-brew-bottle", "CB-330", "330 ml", 280000n],
      ["Vanilla Latte", "vanilla-latte", "VL-12", "12 oz", 350000n],
      ["Cappuccino", "cappuccino", "CAP-12", "12 oz", 320000n],
      ["Butter Croissant", "butter-croissant", "CRO-01", "Single", 220000n],
      ["Banana Bread", "banana-bread", "BB-01", "Slice", 180000n],
      ["Acme Tumbler", "acme-tumbler", "TUM-01", "500 ml", 850000n],
      ["Pour-over Kit", "pour-over-kit", "POK-01", "Starter kit", 2400000n],
      ["Decaf Roast", "decaf-roast", "DCF-250", "250 g", 760000n],
      ["Seasonal Sample", "seasonal-sample", "SEA-100", "100 g", 300000n],
      ["Legacy Mug", "legacy-mug", "MUG-OLD", "Single", 450000n],
    ] as const;
    for (const [index, [name, slug, sku, title, amount]] of catalogue.entries()) {
      const productId = fixtureId(1100 + index);
      const status = index === 10 ? "draft" : index === 11 ? "archived" : "active";
      await tx
        .insert(products)
        .values({
          id: productId,
          organizationId,
          name,
          slug,
          description: `Acme Coffee ${name}.`,
          status,
          metadata: { seeded: true },
          createdAt: new Date(Date.UTC(2026, 6, 1 + index)),
          updatedAt: new Date(Date.UTC(2026, 6, 1 + index)),
          archivedAt: status === "archived" ? new Date("2026-08-01T00:00:00Z") : null,
        })
        .onConflictDoUpdate({ target: products.id, set: { name, status } });
      await tx
        .insert(variants)
        .values({
          id: fixtureId(1200 + index),
          organizationId,
          productId,
          sku,
          title,
          unitAmount: amount,
          currency: "NGN",
          trackInventory: true,
          status: status === "archived" ? "archived" : "active",
          createdAt: new Date(Date.UTC(2026, 6, 1 + index)),
          updatedAt: new Date(Date.UTC(2026, 6, 1 + index)),
          archivedAt: status === "archived" ? new Date("2026-08-01T00:00:00Z") : null,
        })
        .onConflictDoUpdate({ target: variants.id, set: { title, unitAmount: amount } });
      for (let locationIndex = 0; locationIndex < 4; locationIndex += 1) {
        const levelIndex = index * 4 + locationIndex;
        const levelId = fixtureId(1300 + levelIndex);
        const onHand = BigInt(20 + ((index * 7 + locationIndex * 11) % 81));
        await tx
          .insert(inventoryLevels)
          .values({
            id: levelId,
            organizationId,
            variantId: fixtureId(1200 + index),
            locationId: fixtureId(10 + locationIndex),
            onHand,
            createdAt: new Date("2026-08-01T08:00:00Z"),
            updatedAt: new Date("2026-08-01T08:00:00Z"),
          })
          .onConflictDoUpdate({ target: inventoryLevels.id, set: { onHand } });
        await tx
          .insert(inventoryMovements)
          .values({
            id: fixtureId(1400 + levelIndex),
            organizationId,
            inventoryLevelId: levelId,
            delta: onHand,
            resultingOnHand: onHand,
            reason: "Phase 2 opening stock",
            actorType: "system",
            actorId: "seed",
            createdAt: new Date("2026-08-01T08:00:00Z"),
          })
          .onConflictDoNothing();
      }
    }

    for (let index = 0; index < 9; index += 1) {
      await tx
        .insert(storeListings)
        .values({
          id: fixtureId(2310 + index),
          organizationId,
          storeId: fixtureId(2300),
          productId: fixtureId(1100 + index),
          status: "published",
          featured: index < 3,
          displayOrder: index,
          imageAlt: `${catalogue[index]![0]} from Acme Coffee`,
        })
        .onConflictDoUpdate({
          target: [storeListings.storeId, storeListings.productId],
          set: { status: "published", featured: index < 3, displayOrder: index },
        });
    }

    for (let index = 0; index < 15; index += 1) {
      const orderId = fixtureId(1600 + index);
      const variantIndex = index % 10;
      const quantity = (index % 3) + 1;
      const unitAmount = catalogue[variantIndex]![4];
      const totalAmount = unitAmount * BigInt(quantity);
      const cancelled = index === 3 || index === 11;
      await tx
        .insert(orders)
        .values({
          id: orderId,
          organizationId,
          merchantId,
          locationId: fixtureId(10 + (index % 4)),
          customerId: fixtureId(1000 + index),
          number: `ORD-SEED-${(index + 1).toString().padStart(4, "0")}`,
          financialStatus: "unpaid",
          fulfilmentStatus: cancelled ? "cancelled" : "unfulfilled",
          currency: "NGN",
          subtotalAmount: totalAmount,
          totalAmount,
          metadata: { channel: "dashboard", seeded: true },
          createdAt: new Date(Date.UTC(2026, 7, 10 + index, 10)),
          updatedAt: new Date(Date.UTC(2026, 7, 10 + index, 10)),
          cancelledAt: cancelled ? new Date(Date.UTC(2026, 7, 10 + index, 11)) : null,
        })
        .onConflictDoUpdate({
          target: orders.id,
          set: { fulfilmentStatus: cancelled ? "cancelled" : "unfulfilled" },
        });
      await tx
        .insert(orderItems)
        .values({
          id: fixtureId(1700 + index),
          organizationId,
          orderId,
          variantId: fixtureId(1200 + variantIndex),
          productName: catalogue[variantIndex]![0],
          variantTitle: catalogue[variantIndex]![3],
          sku: catalogue[variantIndex]![2],
          unitAmount,
          currency: "NGN",
          quantity,
          totalAmount,
          createdAt: new Date(Date.UTC(2026, 7, 10 + index, 10)),
        })
        .onConflictDoNothing();
    }

    const paymentFixtures = [
      { orderIndex: 0, status: "succeeded", refund: "none" },
      { orderIndex: 1, status: "failed", refund: "none" },
      { orderIndex: 2, status: "pending", refund: "none" },
      { orderIndex: 4, status: "refunded", refund: "full" },
      { orderIndex: 5, status: "partially_refunded", refund: "partial" },
    ] as const;
    for (const [fixtureIndex, fixture] of paymentFixtures.entries()) {
      const orderIndex = fixture.orderIndex;
      const paymentId = fixtureId(1801 + fixtureIndex);
      const attemptId = fixtureId(1901 + fixtureIndex);
      const orderId = fixtureId(1600 + orderIndex);
      const variantIndex = orderIndex % 10;
      const quantity = (orderIndex % 3) + 1;
      const amount = catalogue[variantIndex]![4] * BigInt(quantity);
      const providerReference = `mock_pay_${attemptId.replaceAll("-", "")}`;
      const financiallyFinal = ["succeeded", "refunded", "partially_refunded"].includes(
        fixture.status,
      );
      const refundAmount =
        fixture.refund === "full" ? amount : fixture.refund === "partial" ? 10000n : 0n;
      await tx
        .insert(payments)
        .values({
          id: paymentId,
          organizationId,
          environment: "test",
          orderId,
          customerId: fixtureId(1000 + orderIndex),
          amount,
          currency: "NGN",
          status: fixture.status,
          providerAccountId: fixtureId(1800),
          latestAttemptId: attemptId,
          refundedAmount: refundAmount,
          metadata: { seeded: true, scenario: fixture.status },
          succeededAt: financiallyFinal ? new Date(Date.UTC(2026, 7, 20 + fixtureIndex, 12)) : null,
        })
        .onConflictDoUpdate({
          target: payments.id,
          set: { status: fixture.status, refundedAmount: refundAmount, latestAttemptId: attemptId },
        });
      await tx
        .insert(paymentAttempts)
        .values({
          id: attemptId,
          organizationId,
          environment: "test",
          paymentId,
          providerAccountId: fixtureId(1800),
          provider: "mock",
          status:
            fixture.status === "partially_refunded" || fixture.status === "refunded"
              ? "succeeded"
              : fixture.status,
          providerReference,
          failureCode: fixture.status === "failed" ? "declined" : null,
          failureMessage: fixture.status === "failed" ? "Seeded deterministic decline." : null,
          requestMetadata: {
            mock_scenario:
              fixture.status === "failed"
                ? "failure:declined"
                : fixture.status === "pending"
                  ? "pending:then_success"
                  : "success",
          },
          responseMetadata: { simulated: true },
          startedAt: new Date(Date.UTC(2026, 7, 20 + fixtureIndex, 12)),
          completedAt:
            fixture.status === "pending"
              ? null
              : new Date(Date.UTC(2026, 7, 20 + fixtureIndex, 12, 0, 1)),
        })
        .onConflictDoUpdate({
          target: paymentAttempts.id,
          set: {
            status:
              fixture.status === "partially_refunded" || fixture.status === "refunded"
                ? "succeeded"
                : fixture.status,
          },
        });
      if (financiallyFinal) {
        await tx
          .insert(transactions)
          .values({
            id: fixtureId(2001 + fixtureIndex),
            organizationId,
            environment: "test",
            paymentId,
            kind: "charge",
            amount,
            currency: "NGN",
            providerReference,
            occurredAt: new Date(Date.UTC(2026, 7, 20 + fixtureIndex, 12)),
          })
          .onConflictDoNothing();
        await tx
          .update(orders)
          .set({ financialStatus: fixture.status === "succeeded" ? "paid" : fixture.status })
          .where(eq(orders.id, orderId));
        const levelIndex = variantIndex * 4 + (orderIndex % 4);
        const opening = BigInt(20 + ((variantIndex * 7 + (orderIndex % 4) * 11) % 81));
        const resulting = opening - BigInt(quantity);
        await tx
          .update(inventoryLevels)
          .set({ onHand: resulting })
          .where(eq(inventoryLevels.id, fixtureId(1300 + levelIndex)));
        await tx
          .insert(inventoryMovements)
          .values({
            id: fixtureId(2201 + fixtureIndex),
            organizationId,
            inventoryLevelId: fixtureId(1300 + levelIndex),
            delta: -BigInt(quantity),
            resultingOnHand: resulting,
            reason: "order_paid",
            orderId,
            actorType: "system",
            actorId: "seed",
            createdAt: new Date(Date.UTC(2026, 7, 20 + fixtureIndex, 12)),
          })
          .onConflictDoNothing();
      }
      if (fixture.refund !== "none") {
        const refundId = fixtureId(2101 + fixtureIndex);
        const refundReference = `mock_refund_${refundId.replaceAll("-", "")}`;
        await tx
          .insert(refunds)
          .values({
            id: refundId,
            organizationId,
            environment: "test",
            paymentId,
            amount: refundAmount,
            currency: "NGN",
            status: "succeeded",
            reason: fixture.refund === "full" ? "customer_request" : "partial_adjustment",
            providerReference: refundReference,
            metadata: { seeded: true },
            completedAt: new Date(Date.UTC(2026, 7, 21 + fixtureIndex, 12)),
          })
          .onConflictDoUpdate({ target: refunds.id, set: { status: "succeeded" } });
        await tx
          .insert(transactions)
          .values({
            id: fixtureId(2051 + fixtureIndex),
            organizationId,
            environment: "test",
            paymentId,
            refundId,
            kind: "refund",
            amount: refundAmount,
            currency: "NGN",
            providerReference: refundReference,
            occurredAt: new Date(Date.UTC(2026, 7, 21 + fixtureIndex, 12)),
          })
          .onConflictDoNothing();
      }
    }

    await tx
      .insert(seedVersions)
      .values({ key: "acme-foundation", version: 3 })
      .onConflictDoUpdate({ target: seedVersions.key, set: { version: 3, appliedAt: new Date() } });
  });

  const [seed] = await db
    .select()
    .from(seedVersions)
    .where(eq(seedVersions.key, "acme-foundation"));
  if (!seed) throw new Error("Seed verification failed.");
  console.log(
    "Seeded Acme Coffee Phase 4 checkout, commerce, and deterministic Mock Provider dataset.",
  );
  console.log("Login: owner@acme.test (password from YINNE_SEED_PASSWORD)");
} finally {
  await client.end();
}
