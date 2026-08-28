import { ApiError } from "@yinne/contracts";

interface Bucket {
  count: number;
  resetsAt: number;
}
const buckets = new Map<string, Bucket>();

export function enforceRateLimit(key: string, limit: number, windowMs = 60_000): void {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  if (existing.count >= limit) {
    throw new ApiError(429, "rate_limit", "rate_limit_exceeded", "Too many requests. Retry later.");
  }
  existing.count += 1;
}
