import { describe, expect, it } from "vitest";
import { can, type PermissionAssignment } from "./rbac";

const org = "0198f000-0000-7000-8000-000000000001";
const ikeja = "0198f000-0000-7000-8000-000000000002";
const lekki = "0198f000-0000-7000-8000-000000000003";

describe("central RBAC", () => {
  it("allows an owner at organization scope", () => {
    const assignments: PermissionAssignment[] = [
      { role: "owner", scope: { type: "organization", id: org } },
    ];
    expect(can(assignments, "api_keys:create", { organizationId: org })).toBe(true);
  });

  it("keeps a manager inside the assigned location", () => {
    const assignments: PermissionAssignment[] = [
      { role: "manager", scope: { type: "location", id: ikeja } },
    ];
    expect(can(assignments, "orders:write", { organizationId: org, locationId: ikeja })).toBe(true);
    expect(can(assignments, "orders:write", { organizationId: org, locationId: lekki })).toBe(
      false,
    );
    expect(can(assignments, "api_keys:create", { organizationId: org, locationId: ikeja })).toBe(
      false,
    );
  });

  it("does not give staff product publishing or PII access", () => {
    const assignments: PermissionAssignment[] = [
      { role: "staff", scope: { type: "organization", id: org } },
    ];
    expect(can(assignments, "products:write", { organizationId: org })).toBe(true);
    expect(can(assignments, "products:publish", { organizationId: org })).toBe(false);
    expect(can(assignments, "customers:pii_read", { organizationId: org })).toBe(false);
  });

  it("grants analysts organization analytics without write access", () => {
    const assignments: PermissionAssignment[] = [
      { role: "analyst", scope: { type: "organization", id: org } },
    ];
    expect(can(assignments, "analytics:read", { organizationId: org })).toBe(true);
    expect(can(assignments, "orders:write", { organizationId: org })).toBe(false);
  });

  it("constrains manager analytics to the assigned location", () => {
    const assignments: PermissionAssignment[] = [
      { role: "manager", scope: { type: "location", id: ikeja } },
    ];
    expect(can(assignments, "analytics:read", { organizationId: org, locationId: ikeja })).toBe(
      true,
    );
    expect(can(assignments, "analytics:read", { organizationId: org, locationId: lekki })).toBe(
      false,
    );
  });
});
