import { ApiError } from "@yinne/contracts";

export type ListingStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "suspended"
  | "archived";

const transitions: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["approved", "rejected", "archived"],
  approved: ["suspended", "archived"],
  rejected: ["submitted", "archived"],
  suspended: ["submitted", "archived"],
  archived: [],
};

export function assertListingTransition(from: ListingStatus, to: ListingStatus) {
  if (!transitions[from].includes(to))
    throw new ApiError(
      409,
      "conflict",
      "invalid_listing_transition",
      `Listing cannot transition from ${from} to ${to}.`,
    );
}
