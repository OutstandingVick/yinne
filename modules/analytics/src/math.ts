import type { AnalyticsRatio } from "@yinne/contracts";

export function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint | null {
  if (denominator === 0n) return null;
  const sign = numerator < 0n !== denominator < 0n ? -1n : 1n;
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  const quotient = absoluteNumerator / absoluteDenominator;
  const remainder = absoluteNumerator % absoluteDenominator;
  return sign * (quotient + (remainder * 2n >= absoluteDenominator ? 1n : 0n));
}

export function decimalRatio(numerator: bigint, denominator: bigint, scale = 6): AnalyticsRatio {
  if (denominator === 0n)
    return {
      numerator: numerator.toString(),
      denominator: "0",
      value: null,
      reason: "not_comparable",
    };
  const multiplier = 10n ** BigInt(scale);
  const scaled = divideRoundHalfUp(numerator * multiplier, denominator);
  const negative = (scaled ?? 0n) < 0n;
  const absolute = negative ? -(scaled ?? 0n) : (scaled ?? 0n);
  const whole = absolute / multiplier;
  const fraction = (absolute % multiplier).toString().padStart(scale, "0");
  return {
    numerator: numerator.toString(),
    denominator: denominator.toString(),
    value: `${negative ? "-" : ""}${whole}.${fraction}`,
    reason: null,
  };
}

export function normalizeMrr(
  amount: bigint,
  interval: "month" | "year",
  intervalCount: number,
): bigint {
  const months = BigInt(intervalCount) * (interval === "year" ? 12n : 1n);
  return divideRoundHalfUp(amount, months) ?? 0n;
}

export function addCurrency(
  target: Record<string, bigint>,
  currency: string,
  amount: bigint,
): void {
  target[currency] = (target[currency] ?? 0n) + amount;
}

export function serializeMoney(values: Record<string, bigint>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amount]) => [currency, amount.toString()]),
  );
}
