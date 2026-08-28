import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { database } from "@yinne/database";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(
    request,
    async () => {
      await database.execute(sql`select 1`);
      return { status: "ok", checks: { database: "ok", application: "ok" } };
    },
    { authenticated: false, rateLimit: 300 },
  );
}
