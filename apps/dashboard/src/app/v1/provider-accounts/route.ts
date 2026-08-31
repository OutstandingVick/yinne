import type { NextRequest } from "next/server";
import { providerAccountListQuerySchema } from "@yinne/contracts";
import { listProviderAccounts } from "@yinne/payments";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listProviderAccounts(
      context,
      providerAccountListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
