import { capitalFeatureSet, type CapitalFeatureSet } from "@yinne/analytics";
import type { RequestContext } from "@yinne/application";
import type { CapitalSignalInput } from "./scoring";

export interface CapitalSignalProvider {
  load(context: RequestContext, currency: string, asOf: Date): Promise<CapitalFeatureSet>;
}

export const analyticsCapitalSignalProvider: CapitalSignalProvider = {
  load: capitalFeatureSet,
};

function weeklyNumbers(values: bigint[]): number[] {
  const numbers = values.map(Number);
  const sorted = [...numbers].sort((left, right) => left - right);
  const low = sorted[Math.floor((sorted.length - 1) * 0.05)] ?? 0;
  const high = sorted[Math.ceil((sorted.length - 1) * 0.95)] ?? 0;
  return numbers.map((value) => Math.max(low, Math.min(high, value)));
}

function coefficientOfVariation(values: number[]): number | null {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (values.length < 8 || mean <= 0) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function stability(values: number[]): number | null {
  if (values.length < 8 || !values.some((value) => value > 0)) return null;
  const activeShare = values.filter((value) => value > 0).length / values.length;
  let peak = 0;
  let maximumDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    if (peak > 0) maximumDrawdown = Math.max(maximumDrawdown, (peak - Math.max(0, value)) / peak);
  }
  return activeShare * 0.6 + (1 - maximumDrawdown) * 0.4;
}

export function deriveSignalInputs(features: CapitalFeatureSet): CapitalSignalInput[] {
  const weeks = weeklyNumbers(features.weeklyNetCollected);
  const cv = coefficientOfVariation(weeks);
  const growth =
    features.previous90NetCollected > 0n
      ? Number(features.current90NetCollected - features.previous90NetCollected) /
        Number(features.previous90NetCollected)
      : null;
  const customerApplicable =
    features.identifiedBuyerCount >= 10 && features.identityCoverage >= 0.6;
  return [
    {
      key: "revenue_consistency",
      raw: { weekly_cv: cv, complete_weeks: weeks.length },
      value: cv,
      status: cv === null ? "insufficient" : "available",
      reason:
        cv === null
          ? "At least eight positive-mean complete weeks are required."
          : "Weekly coefficient of variation.",
    },
    {
      key: "positive_growth",
      raw: {
        current_90d_net_collected: features.current90NetCollected.toString(),
        previous_90d_net_collected: features.previous90NetCollected.toString(),
        growth,
      },
      value: growth,
      status: growth === null ? "insufficient" : "available",
      reason:
        growth === null
          ? "Two comparable periods with a positive previous period are required."
          : "Equal 90-day net-collected comparison.",
    },
    {
      key: "cash_flow_stability",
      raw: { stability: stability(weeks), complete_weeks: weeks.length },
      value: stability(weeks),
      status: stability(weeks) === null ? "insufficient" : "available",
      reason: "Active-week share and maximum drawdown composite.",
    },
    {
      key: "customer_quality",
      raw: {
        repeat_revenue_share: features.repeatRevenueShare,
        identified_buyers: features.identifiedBuyerCount,
        identity_coverage: features.identityCoverage,
      },
      value: customerApplicable ? features.repeatRevenueShare : null,
      status: customerApplicable ? "available" : "not_applicable",
      reason: customerApplicable
        ? "Repeat identified-customer revenue share."
        : "Requires ten identified buyers and 60% identity coverage; weight is removed.",
    },
    {
      key: "refund_risk",
      raw: {
        refund_amount: features.refundAmount.toString(),
        charge_amount: features.chargeAmount.toString(),
      },
      value:
        features.chargeAmount > 0n
          ? Number(features.refundAmount) / Number(features.chargeAmount)
          : null,
      status: features.chargeAmount > 0n ? "available" : "insufficient",
      reason: "Successful refund amount divided by successful charge amount.",
    },
    {
      key: "operating_history",
      raw: { observed_days: features.observedDays },
      value: features.observedDays / 30,
      status: features.observedDays > 0 ? "available" : "insufficient",
      reason: "Observed active months, capped at 24 by normalization.",
    },
  ];
}
