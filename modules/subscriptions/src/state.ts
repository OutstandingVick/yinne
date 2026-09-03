import { ApiError } from "@yinne/contracts";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "ended";

const transitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trialing: ["active", "paused", "cancelled"],
  active: ["past_due", "paused", "cancelled", "ended"],
  past_due: ["active", "paused", "cancelled"],
  paused: ["active", "cancelled"],
  cancelled: [],
  ended: [],
};

export function assertSubscriptionTransition(from: SubscriptionStatus, to: SubscriptionStatus) {
  if (!transitions[from].includes(to))
    throw new ApiError(
      409,
      "conflict",
      "invalid_subscription_transition",
      `Subscription cannot transition from ${from} to ${to}.`,
    );
}
