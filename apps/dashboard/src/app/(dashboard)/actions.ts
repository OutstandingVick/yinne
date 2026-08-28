"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createRequestId } from "@yinne/core";
import { env } from "@yinne/config";
import {
  createApiKey,
  inviteMember,
  revokeApiKey,
  updateOrganization,
} from "@yinne/organizations/services";
import { activeUserContext } from "../../lib/context";
import { auth } from "../../auth";
import { listUserOrganizations } from "@yinne/organizations/identity";
import {
  adjustInventorySchema,
  createCustomerSchema,
  createOrderSchema,
  createProductSchema,
} from "@yinne/contracts";
import {
  adjustInventory,
  archiveProduct,
  cancelOrder,
  createCustomer,
  createOrder,
  createProduct,
  updateProduct,
} from "@yinne/commerce";

export type ActionState = { ok: boolean; message?: string; secret?: string };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user.id) redirect("/sign-in");
  const organizationId = formString(formData, "organization_id");
  const memberships = await listUserOrganizations(session.user.id);
  if (!memberships.some((membership) => membership.organization_id === organizationId)) {
    throw new Error("The selected organization is not available to this user.");
  }
  (await cookies()).set("yinne_active_organization", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}

export async function updateOrganizationAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  await updateOrganization(context, {
    name: formString(formData, "name"),
    defaultCurrency: formString(formData, "default_currency"),
    timezone: formString(formData, "timezone"),
  });
  revalidatePath("/settings/organization");
}

export async function inviteMemberAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const context = await activeUserContext(createRequestId());
    await inviteMember(context, {
      email: formString(formData, "email"),
      role: formString(formData, "role") as
        | "admin"
        | "finance"
        | "manager"
        | "staff"
        | "analyst"
        | "developer",
      scope: { type: "organization", id: context.tenant.organizationId },
    });
    revalidatePath("/settings/team");
    return { ok: true, message: "Member invited." };
  } catch {
    return {
      ok: false,
      message: "The invitation could not be completed. Check your permission and input.",
    };
  }
}

export async function createApiKeyAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const context = await activeUserContext(createRequestId());
    const scopes = formData.getAll("scopes").map(String);
    const key = await createApiKey(
      context,
      {
        name: formString(formData, "name"),
        environment: context.tenant.environment,
        scopes,
      },
      env().API_KEY_PEPPER,
    );
    revalidatePath("/developer/api-keys");
    return {
      ok: true,
      message: "Copy this secret now. It will not be shown again.",
      secret: key.secret,
    };
  } catch {
    return {
      ok: false,
      message: "The key could not be created. Requested scopes cannot exceed your permissions.",
    };
  }
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  await revokeApiKey(context, formString(formData, "id"));
  revalidatePath("/developer/api-keys");
}

export async function createCustomerAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  const email = formString(formData, "email");
  const phone = formString(formData, "phone");
  await createCustomer(
    context,
    createCustomerSchema.parse({
      name: formString(formData, "name"),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    }),
  );
  revalidatePath("/commerce/customers");
  revalidatePath("/");
}

export async function createProductAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  await createProduct(
    context,
    createProductSchema.parse({
      name: formString(formData, "name"),
      slug: formString(formData, "slug"),
      variants: [
        {
          sku: formString(formData, "sku"),
          title: formString(formData, "variant_title"),
          unit_amount: formString(formData, "unit_amount"),
          currency: formString(formData, "currency"),
          track_inventory: true,
        },
      ],
    }),
  );
  revalidatePath("/commerce/products");
  revalidatePath("/");
}

export async function adjustInventoryAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  await adjustInventory(
    context,
    adjustInventorySchema.parse({
      variant_id: formString(formData, "variant_id"),
      location_id: formString(formData, "location_id"),
      delta: formString(formData, "delta"),
      reason: formString(formData, "reason"),
    }),
  );
  revalidatePath("/commerce/inventory");
}

export async function createOrderAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  const customerId = formString(formData, "customer_id");
  const [locationId, merchantId] = formString(formData, "fulfilment").split(":");
  if (!locationId || !merchantId) throw new Error("A fulfilment location is required.");
  await createOrder(
    context,
    createOrderSchema.parse({
      merchant_id: merchantId,
      location_id: locationId,
      ...(customerId ? { customer_id: customerId } : {}),
      currency: formString(formData, "currency"),
      items: [
        {
          variant_id: formString(formData, "variant_id"),
          quantity: Number(formString(formData, "quantity")),
        },
      ],
    }),
    `dashboard-${createRequestId()}`,
  );
  revalidatePath("/commerce/orders");
  revalidatePath("/");
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  await cancelOrder(context, formString(formData, "order_id"));
  revalidatePath("/commerce/orders");
}

export async function activateProductAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  const id = formString(formData, "product_id");
  await updateProduct(context, id, { status: "active" });
  revalidatePath(`/commerce/products/${id}`);
  revalidatePath("/commerce/products");
}

export async function archiveProductAction(formData: FormData): Promise<void> {
  const context = await activeUserContext(createRequestId());
  const id = formString(formData, "product_id");
  await archiveProduct(context, id);
  revalidatePath(`/commerce/products/${id}`);
  revalidatePath("/commerce/products");
}
