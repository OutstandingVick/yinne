import type { NextRequest } from "next/server";
import { assignEmployeeLocationSchema } from "@yinne/contracts";
import { assignEmployeeLocation, unassignEmployeeLocation } from "@yinne/operations";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => ({
      assignment: await assignEmployeeLocation(
        context,
        (await params).id,
        assignEmployeeLocationSchema.parse(await request.json()),
      ),
    }),
    { successStatus: 201 },
  );
}
export function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => {
    const locationId = request.nextUrl.searchParams.get("location_id");
    if (!locationId) throw new Error("location_id is required");
    return { assignment: await unassignEmployeeLocation(context, (await params).id, locationId) };
  });
}
