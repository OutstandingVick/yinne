import { cookies } from "next/headers";
import { auth } from "../auth";
import { env } from "@yinne/config";
import { ApiError } from "@yinne/contracts";
import type { RequestContext } from "@yinne/organizations/services";
import { listUserOrganizations } from "@yinne/organizations/identity";

export async function activeUserContext(requestId: string): Promise<RequestContext> {
  const session = await auth();
  if (!session?.user.id)
    throw new ApiError(
      401,
      "authentication_error",
      "authentication_required",
      "Authentication is required.",
    );
  const memberships = await listUserOrganizations(session.user.id);
  const selected = (await cookies()).get("yinne_active_organization")?.value;
  const membership =
    memberships.find((item) => item.organization_id === selected) ?? memberships[0];
  if (!membership)
    throw new ApiError(
      403,
      "authorization_error",
      "organization_membership_required",
      "An active organization membership is required.",
    );
  const environment = env().NEXT_PUBLIC_YINNE_MODE;
  return {
    tenant: { organizationId: membership.organization_id, environment },
    principal: {
      type: "user",
      userId: session.user.id,
      organizationId: membership.organization_id,
      memberId: membership.member_id,
      environment,
    },
    requestId,
  };
}
