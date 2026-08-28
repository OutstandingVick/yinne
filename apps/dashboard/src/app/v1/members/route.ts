import type { NextRequest } from "next/server";
import { inviteMemberSchema } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { inviteMember, listMembers } from "@yinne/organizations/services";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ members: await listMembers(context) }));
}

export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const input = inviteMemberSchema.parse(await request.json());
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
        member: await inviteMember(context, {
          email: input.email,
          role: input.role,
          scope: { type: input.scope.type, id: scopeId },
        }),
      };
    },
    { authenticated: true, rateLimit: 30, successStatus: 201 },
  );
}
