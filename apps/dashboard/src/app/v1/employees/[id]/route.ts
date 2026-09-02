import type { NextRequest } from "next/server";
import { getEmployee } from "@yinne/operations";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    employee: await getEmployee(context, (await params).id),
  }));
}
