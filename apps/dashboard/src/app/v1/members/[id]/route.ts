import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, updateMemberRoleSchema } from "@yinne/contracts";
import { updateMemberRole } from "@yinne/organizations/services";
import { apiRoute } from "../../../../lib/api";

export function PATCH(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => {
      const { id } = await route.params;
      const memberId = z.string().uuid().parse(id);
      const input = updateMemberRoleSchema.parse(await request.json());
      const scopeId =
        input.scope.type === "organization" ? context.tenant.organizationId : input.scope.id;
      if (!scopeId)
        throw new ApiError(
          400,
          "invalid_request",
          "scope_id_required",
          "A merchant or location scope ID is required.",
          "scope.id",
        );
      return {
        member: await updateMemberRole(context, memberId, {
          role: input.role,
          scope: { type: input.scope.type, id: scopeId },
        }),
      };
    },
    { authenticated: true, rateLimit: 30 },
  );
}
