import { ApiError } from "@yinne/contracts";
export type LocationStatus = "active" | "inactive" | "archived";
export function assertLocationTransition(from: LocationStatus, to: LocationStatus) {
  const allowed: Record<LocationStatus, LocationStatus[]> = {
    active: ["inactive", "archived"],
    inactive: ["active", "archived"],
    archived: [],
  };
  if (!allowed[from].includes(to))
    throw new ApiError(
      409,
      "conflict",
      "invalid_location_transition",
      `Location cannot transition from ${from} to ${to}.`,
    );
}
