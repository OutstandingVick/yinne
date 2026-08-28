import type { NextRequest } from "next/server";
import { updateOrganizationSchema } from "@yinne/contracts";
import { getOrganization, updateOrganization } from "@yinne/organizations/services";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ organization: await getOrganization(context) }));
}

export function PATCH(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const input = updateOrganizationSchema.parse(await request.json());
      const organization = await updateOrganization(context, {
        ...(input.name ? { name: input.name } : {}),
        ...(input.default_currency ? { defaultCurrency: input.default_currency } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      });
      return { organization };
    },
    { authenticated: true, rateLimit: 60 },
  );
}
