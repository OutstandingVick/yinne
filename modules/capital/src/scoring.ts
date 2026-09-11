import type { CapitalBand, CapitalDimension, CapitalSignal } from "@yinne/contracts";
import { capitalModel, type CapitalSignalKey } from "./config";

export interface CapitalSignalInput {
  key: CapitalSignalKey;
  raw: Record<string, unknown>;
  value: number | null;
  status: "available" | "not_applicable" | "insufficient";
  reason: string;
}

const labels: Record<CapitalSignalKey, string> = {
  revenue_consistency: "Revenue consistency",
  positive_growth: "Positive growth",
  cash_flow_stability: "Cash-flow stability",
  customer_quality: "Customer quality",
  refund_risk: "Refund behavior",
  operating_history: "Operating history",
};

export function interpolate(value: number, knots: readonly (readonly [number, number])[]): number {
  if (value <= knots[0]![0]) return knots[0]![1];
  if (value >= knots.at(-1)![0]) return knots.at(-1)![1];
  for (let index = 1; index < knots.length; index += 1) {
    const right = knots[index]!;
    const left = knots[index - 1]!;
    if (value <= right[0]) {
      const progress = (value - left[0]) / (right[0] - left[0]);
      return left[1] + progress * (right[1] - left[1]);
    }
  }
  return 0;
}

function normalize(input: CapitalSignalInput): number | null {
  if (input.status !== "available" || input.value === null || !Number.isFinite(input.value))
    return null;
  switch (input.key) {
    case "revenue_consistency":
      return interpolate(input.value, capitalModel.thresholds.revenueConsistency);
    case "positive_growth":
      return interpolate(input.value, capitalModel.thresholds.growth);
    case "cash_flow_stability":
      return Math.max(0, Math.min(100, input.value * 100));
    case "customer_quality":
      return interpolate(input.value, capitalModel.thresholds.customerQuality);
    case "refund_risk":
      return interpolate(input.value, capitalModel.thresholds.refundRisk);
    case "operating_history":
      return Math.max(0, Math.min(100, (input.value / 24) * 100));
  }
}

function explanation(key: CapitalSignalKey, score: number | null, reason: string): string {
  if (score === null) return reason;
  const quality =
    score >= 80 ? "strong" : score >= 60 ? "stable" : score >= 40 ? "developing" : "limited";
  return `${labels[key]} is ${quality} under the documented rules-1 thresholds.`;
}

export function bandForScore(score: number): CapitalBand {
  return capitalModel.bands.find((band) => score >= band.minimum)!.key;
}

export function scoreSignals(inputs: CapitalSignalInput[]): {
  score: number | null;
  band: CapitalBand | null;
  signals: CapitalSignal[];
  dimensions: CapitalDimension[];
  observableWeight: number;
} {
  const prepared = inputs.map((input) => ({ input, normalized: normalize(input) }));
  const observableWeight = prepared.reduce(
    (sum, item) => sum + (item.normalized === null ? 0 : capitalModel.weights[item.input.key]),
    0,
  );
  const signals = prepared.map(({ input, normalized }) => {
    const baseWeight = capitalModel.weights[input.key];
    const effectiveWeight =
      normalized === null || observableWeight === 0 ? 0 : (baseWeight / observableWeight) * 100;
    const contribution = normalized === null ? 0 : (normalized * effectiveWeight) / 100;
    return {
      key: input.key,
      dimension: input.key,
      status: input.status,
      raw: input.raw,
      normalized_score: normalized === null ? null : Number(normalized.toFixed(2)),
      base_weight: baseWeight,
      effective_weight: Number(effectiveWeight.toFixed(2)),
      contribution: Number(contribution.toFixed(2)),
      reason: input.reason,
      explanation: explanation(input.key, normalized, input.reason),
    } satisfies CapitalSignal;
  });
  if (observableWeight < capitalModel.minimumObservableWeight)
    return { score: null, band: null, signals, dimensions: [], observableWeight };
  const score = Math.floor(signals.reduce((sum, signal) => sum + signal.contribution, 0) + 0.5);
  const dimensions = signals
    .filter((signal) => signal.normalized_score !== null)
    .map((signal) => ({
      key: signal.key,
      label: labels[signal.key],
      score: signal.normalized_score!,
      effective_weight: signal.effective_weight,
      contribution: signal.contribution,
    }));
  return { score, band: bandForScore(score), signals, dimensions, observableWeight };
}
