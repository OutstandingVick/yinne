import type { NextRequest } from "next/server";
import { archivePlan } from "@yinne/subscriptions";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    plan: await archivePlan(context, (await params).id),
  }));
}
