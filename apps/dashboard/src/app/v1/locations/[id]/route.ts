import type { NextRequest } from "next/server";
import { updateLocationSchema } from "@yinne/contracts";
import { getLocation, updateLocation } from "@yinne/operations";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    location: await getLocation(context, (await params).id),
  }));
}
export function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    location: await updateLocation(
      context,
      (await params).id,
      updateLocationSchema.parse(await request.json()),
    ),
  }));
}
