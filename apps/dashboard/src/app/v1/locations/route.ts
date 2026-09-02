import type { NextRequest } from "next/server";
import { createLocationSchema, locationListQuerySchema } from "@yinne/contracts";
import { createLocation, listLocations } from "@yinne/operations";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, async (context) =>
    listLocations(
      context,
      locationListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      location: await createLocation(context, createLocationSchema.parse(await request.json())),
    }),
    { successStatus: 201 },
  );
}
