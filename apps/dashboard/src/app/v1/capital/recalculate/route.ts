import type { NextRequest } from "next/server";
import { requestCapitalRecalculation } from "@yinne/capital";
import { capitalRecalculateSchema } from "@yinne/contracts";
import { apiRoute } from "../../../../lib/api";

export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const input = capitalRecalculateSchema.parse(await request.json());
      return requestCapitalRecalculation(
        context,
        input.as_of ? new Date(input.as_of) : new Date(),
        input.currency,
      );
    },
    { rateLimit: 4, successStatus: 202 },
  );
}
