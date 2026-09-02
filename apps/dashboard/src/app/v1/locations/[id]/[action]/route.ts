import type { NextRequest } from "next/server";
import { ApiError } from "@yinne/contracts";
import { transitionLocation } from "@yinne/operations";
import { apiRoute } from "../../../../../lib/api";
export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  return apiRoute(request, async (context) => {
    const { id, action } = await params;
    const status =
      action === "activate"
        ? "active"
        : action === "deactivate"
          ? "inactive"
          : action === "archive"
            ? "archived"
            : null;
    if (!status)
      throw new ApiError(404, "invalid_request", "resource_not_found", "Action does not exist.");
    return { location: await transitionLocation(context, id, status) };
  });
}
