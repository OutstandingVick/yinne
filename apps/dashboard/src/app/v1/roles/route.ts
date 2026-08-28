import type { NextRequest } from "next/server";
import { listRoles } from "@yinne/organizations/services";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ roles: await listRoles(context) }));
}
