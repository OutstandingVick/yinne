export function canTransitionPayment(from: string, to: string): boolean {
  return (
    (
      {
        created: ["pending", "succeeded", "failed"],
        pending: ["succeeded", "failed"],
        succeeded: ["partially_refunded", "refunded"],
        partially_refunded: ["partially_refunded", "refunded"],
      } as Record<string, string[]>
    )[from]?.includes(to) ?? false
  );
}
export function canTransitionAttempt(from: string, to: string): boolean {
  return (
    (
      {
        created: ["submitted"],
        submitted: ["pending", "succeeded", "failed", "unknown"],
        pending: ["succeeded", "failed"],
        unknown: ["succeeded", "failed"],
      } as Record<string, string[]>
    )[from]?.includes(to) ?? false
  );
}
export function canTransitionRefund(from: string, to: string): boolean {
  return (
    (
      { created: ["pending", "succeeded", "failed"], pending: ["succeeded", "failed"] } as Record<
        string,
        string[]
      >
    )[from]?.includes(to) ?? false
  );
}
export function remainingRefundable(amount: bigint, refunded: bigint, pending: bigint): bigint {
  const remaining = amount - refunded - pending;
  return remaining > 0n ? remaining : 0n;
}
