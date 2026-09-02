import type { NextRequest } from "next/server";
import { employeeListQuerySchema } from "@yinne/contracts";
import { listEmployees } from "@yinne/operations";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => {
    const query = employeeListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return { data: await listEmployees(context, query.location_id) };
  });
}
