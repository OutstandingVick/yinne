export const permissionKeys = [
  "organization:read",
  "organization:write",
  "members:read",
  "members:invite",
  "members:update_role",
  "api_keys:read",
  "api_keys:create",
  "api_keys:revoke",
  "providers:read",
  "providers:write",
  "payments:read",
  "payments:refund",
  "payouts:read",
  "products:read",
  "products:write",
  "products:publish",
  "inventory:read",
  "inventory:adjust",
  "orders:read",
  "orders:write",
  "orders:fulfil",
  "customers:read",
  "customers:write",
  "customers:pii_read",
  "subscriptions:read",
  "subscriptions:write",
  "analytics:read",
  "locations:read",
  "locations:write",
  "capital:read",
  "webhooks:read",
  "webhooks:write",
  "webhooks:replay",
  "events:read",
  "developer_logs:read",
  "audit_logs:read",
  "checkout:read",
  "checkout:write",
  "payment_links:read",
  "payment_links:write",
  "storefront:read",
  "storefront:write",
  "storefront:publish",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];
export const roleKeys = [
  "owner",
  "admin",
  "finance",
  "manager",
  "staff",
  "analyst",
  "developer",
] as const;
export type RoleKey = (typeof roleKeys)[number];

const all = [...permissionKeys];

export const predefinedRolePermissions: Record<RoleKey, readonly PermissionKey[]> = {
  owner: all,
  admin: all.filter((permission) => permission !== "capital:read"),
  finance: [
    "organization:read",
    "providers:read",
    "providers:write",
    "payments:read",
    "payments:refund",
    "checkout:read",
    "checkout:write",
    "payment_links:read",
    "payment_links:write",
    "storefront:read",
    "payouts:read",
    "orders:read",
    "customers:read",
    "customers:pii_read",
    "subscriptions:read",
    "subscriptions:write",
    "analytics:read",
    "capital:read",
  ],
  manager: [
    "organization:read",
    "members:read",
    "members:invite",
    "payments:read",
    "payments:refund",
    "checkout:read",
    "checkout:write",
    "payment_links:read",
    "payment_links:write",
    "products:read",
    "products:write",
    "products:publish",
    "inventory:read",
    "inventory:adjust",
    "orders:read",
    "orders:write",
    "orders:fulfil",
    "customers:read",
    "customers:write",
    "customers:pii_read",
    "analytics:read",
    "locations:read",
    "locations:write",
    "storefront:read",
    "storefront:write",
    "storefront:publish",
  ],
  staff: [
    "organization:read",
    "payments:read",
    "checkout:read",
    "checkout:write",
    "payment_links:read",
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:adjust",
    "orders:read",
    "orders:write",
    "orders:fulfil",
    "customers:read",
    "customers:write",
    "locations:read",
    "storefront:read",
  ],
  analyst: [
    "organization:read",
    "payments:read",
    "checkout:read",
    "payment_links:read",
    "payouts:read",
    "subscriptions:read",
    "analytics:read",
    "capital:read",
    "developer_logs:read",
    "storefront:read",
  ],
  developer: [
    "organization:read",
    "api_keys:read",
    "api_keys:create",
    "api_keys:revoke",
    "providers:read",
    "providers:write",
    "payments:read",
    "checkout:read",
    "checkout:write",
    "payment_links:read",
    "payment_links:write",
    "analytics:read",
    "webhooks:read",
    "webhooks:write",
    "webhooks:replay",
    "events:read",
    "developer_logs:read",
    "storefront:read",
  ],
};

export interface PermissionAssignment {
  role: RoleKey;
  scope: { type: "organization" | "merchant" | "location"; id: string };
}

export interface AuthorizationContext {
  organizationId: string;
  merchantId?: string;
  locationId?: string;
}

function scopeMatches(assignment: PermissionAssignment, context: AuthorizationContext): boolean {
  if (assignment.scope.type === "organization")
    return assignment.scope.id === context.organizationId;
  if (assignment.scope.type === "merchant") return assignment.scope.id === context.merchantId;
  return assignment.scope.id === context.locationId;
}

export function can(
  assignments: readonly PermissionAssignment[],
  permission: PermissionKey,
  context: AuthorizationContext,
): boolean {
  return assignments.some(
    (assignment) =>
      predefinedRolePermissions[assignment.role].includes(permission) &&
      scopeMatches(assignment, context),
  );
}
