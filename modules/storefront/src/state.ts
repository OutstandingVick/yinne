import { ApiError } from "@yinne/contracts";

export type StoreStatus = "draft" | "active" | "paused" | "archived";

const transitions: Record<StoreStatus, readonly StoreStatus[]> = {
  draft: ["active", "archived"],
  active: ["paused", "archived"],
  paused: ["active", "archived"],
  archived: [],
};

export function assertStoreTransition(from: StoreStatus, to: StoreStatus): void {
  if (!transitions[from].includes(to)) {
    throw new ApiError(
      409,
      "conflict",
      "invalid_store_transition",
      `Store cannot transition from ${from} to ${to}.`,
    );
  }
}
