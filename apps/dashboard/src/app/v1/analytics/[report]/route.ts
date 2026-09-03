import type { NextRequest } from "next/server";
import {
  customersReport,
  invoicesReport,
  locationsReport,
  overviewReport,
  paymentsReport,
  productsReport,
  salesReport,
  subscriptionsReport,
} from "@yinne/analytics";
import { analyticsQuerySchema, analyticsReportSchema } from "@yinne/contracts";
import { apiRoute } from "../../../../lib/api";

const reports = {
  overview: overviewReport,
  sales: salesReport,
  payments: paymentsReport,
  customers: customersReport,
  subscriptions: subscriptionsReport,
  invoices: invoicesReport,
  locations: locationsReport,
  products: productsReport,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ report: string }> },
) {
  return apiRoute(request, async (context) => {
    const report = analyticsReportSchema.parse((await params).report);
    const query = analyticsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return reports[report](context, query);
  });
}
