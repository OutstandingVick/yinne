import type { NextRequest } from "next/server";
import { z } from "zod";
import { updateVariantSchema } from "@yinne/contracts";
import { updateVariant } from "@yinne/commerce";
import { apiRoute } from "../../../../../../lib/api";
export function PATCH(
  request: NextRequest,
  route: { params: Promise<{ id: string; variantId: string }> },
) {
  return apiRoute(
    request,
    async (context) => {
      const params = await route.params;
      return {
        variant: await updateVariant(
          context,
          z.string().uuid().parse(params.id),
          z.string().uuid().parse(params.variantId),
          updateVariantSchema.parse(await request.json()),
        ),
      };
    },
    { authenticated: true, rateLimit: 40 },
  );
}
