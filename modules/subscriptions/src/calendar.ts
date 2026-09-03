export type BillingInterval = "month" | "year";

function lastUtcDay(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function advanceBillingDate(
  instant: Date,
  interval: BillingInterval,
  anchorDay = instant.getUTCDate(),
) {
  const year = instant.getUTCFullYear() + (interval === "year" ? 1 : 0);
  const month = instant.getUTCMonth() + (interval === "month" ? 1 : 0);
  const normalized = new Date(Date.UTC(year, month, 1, instant.getUTCHours(), instant.getUTCMinutes(), instant.getUTCSeconds(), instant.getUTCMilliseconds()));
  normalized.setUTCDate(Math.min(anchorDay, lastUtcDay(normalized.getUTCFullYear(), normalized.getUTCMonth())));
  return normalized;
}

export function initialBillingPeriod(start: Date, interval: BillingInterval) {
  return { start, end: advanceBillingDate(start, interval), anchorDay: start.getUTCDate() };
}
