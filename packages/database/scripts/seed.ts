import { config as loadDotEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { hashPassword, permissionKeys, predefinedRolePermissions, roleKeys } from "@yinne/auth";
import {
  auditLogs,
  customers,
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
  permissions,
  products,
  roleAssignments,
  rolePermissions,
  roles,
  seedVersions,
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

    await tx
      .insert(seedVersions)
      .values({ key: "acme-foundation", version: 2 })
      .onConflictDoUpdate({ target: seedVersions.key, set: { version: 2, appliedAt: new Date() } });
  });

  const [seed] = await db
    .select()
    .from(seedVersions)
    .where(eq(seedVersions.key, "acme-foundation"));
  if (!seed) throw new Error("Seed verification failed.");
  console.log("Seeded Acme Coffee Phase 2 core commerce dataset.");
  console.log("Login: owner@acme.test (password from YINNE_SEED_PASSWORD)");
} finally {
  await client.end();
}
