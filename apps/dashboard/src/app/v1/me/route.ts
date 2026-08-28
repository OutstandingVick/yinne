import type { NextRequest } from "next/server";
import { listUserOrganizations } from "@yinne/organizations/identity";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => {
    if (context.principal.type === "api_key") {
      return {
        principal: {
          type: "api_key",
          id: context.principal.apiKeyId,
          scopes: context.principal.scopes,
        },
        organization_id: context.tenant.organizationId,
        environment: context.tenant.environment,
      };
    }
    if (context.principal.type === "system")
      return {
        principal: { type: "system" },
        organization_id: context.tenant.organizationId,
        environment: context.tenant.environment,
      };
    const memberships = await listUserOrganizations(context.principal.userId);
    return {
      principal: {
        type: "user",
        id: context.principal.userId,
        member_id: context.principal.memberId,
      },
      organization_id: context.tenant.organizationId,
      environment: context.tenant.environment,
      organizations: memberships,
    };
  });
}
