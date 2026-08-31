export type CheckoutStatus = "open" | "processing" | "completed" | "expired" | "cancelled";
const transitions: Record<CheckoutStatus, readonly CheckoutStatus[]> = {
  open: ["processing", "expired", "cancelled"],
  processing: ["open", "completed", "cancelled"],
  completed: [],
  expired: [],
  cancelled: [],
};
export const canTransitionCheckout = (from: CheckoutStatus, to: CheckoutStatus) =>
  transitions[from].includes(to);
export const shouldExpireCheckout = (status: CheckoutStatus, expiresAt: Date, now = new Date()) =>
  status === "open" && expiresAt.getTime() <= now.getTime();
