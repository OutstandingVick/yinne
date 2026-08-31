import type { NextRequest } from "next/server";
import { transactionListQuerySchema } from "@yinne/contracts";
import { listTransactions } from "@yinne/payments";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listTransactions(
      context,
      transactionListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
