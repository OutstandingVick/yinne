import { ApiError, type AnalyticsQuery } from "@yinne/contracts";

export interface ReportingWindow {
  from: Date;
  to: Date;
  timezone: string;
  currency?: string;
  locationId?: string;
  granularity: AnalyticsQuery["granularity"];
  limit: number;
}

export function reportingWindow(query: AnalyticsQuery): ReportingWindow {
  const from = new Date(query.from);
  const to = new Date(query.to);
  if (to <= from || to.getTime() - from.getTime() > 366 * 86_400_000)
    throw new ApiError(
      400,
      "invalid_request",
      "invalid_reporting_window",
      "The reporting window must be positive and no longer than 366 days.",
    );
  try {
    new Intl.DateTimeFormat("en", { timeZone: query.timezone });
  } catch {
    throw new ApiError(
      400,
      "invalid_request",
      "invalid_reporting_timezone",
      "The reporting timezone must be a valid IANA timezone.",
    );
  }
  return {
    from,
    to,
    timezone: query.timezone,
    ...(query.currency ? { currency: query.currency } : {}),
    ...(query.location_id ? { locationId: query.location_id } : {}),
    granularity: query.granularity,
    limit: query.limit,
  };
}

export function analyticsMeta(window: ReportingWindow, asOf = new Date()) {
  return {
    formula_version: "analytics.v1",
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    timezone: window.timezone,
    granularity: window.granularity,
    freshness: { mode: "live", as_of: asOf.toISOString() },
    filters: {
      currency: window.currency ?? null,
      location_id: window.locationId ?? null,
    },
  };
}
