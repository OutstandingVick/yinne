import type {
  CapitalDataSufficiency,
  CapitalProfile,
  CapitalScoreChange,
  CapitalSignal,
} from "@yinne/contracts";
import type { CapitalFeatureSet } from "@yinne/analytics";
import { capitalModel } from "./config";
import { deriveSignalInputs } from "./signals";
import { scoreSignals } from "./scoring";

export const capitalLimitations = [
  "This profile is merchant analytics, not a credit decision, approval, or financing offer.",
  "External sales, expenses, liabilities, settlements, and bank balances are not observed.",
  "The rules-1 thresholds are transparent heuristics and are not default-risk calibration.",
];

export function dataSufficiency(features: CapitalFeatureSet): {
  level: CapitalDataSufficiency;
  missing: string[];
} {
  const missing: string[] = [];
  if (features.observedDays < capitalModel.minimumObservedDays)
    missing.push(`${capitalModel.minimumObservedDays - features.observedDays} more observed days`);
  if (features.paidOrderCount < capitalModel.minimumPaidOrders)
    missing.push(`${capitalModel.minimumPaidOrders - features.paidOrderCount} more paid orders`);
  if (missing.length) return { level: "insufficient", missing };
  if (
    features.observedDays >= 180 &&
    features.paidOrderCount >= 100 &&
    features.identityCoverage >= 0.8
  )
    return { level: "strong", missing };
  if (features.observedDays >= 120 && features.paidOrderCount >= 50)
    return { level: "sufficient", missing };
  return { level: "limited", missing };
}

function explanations(signals: CapitalSignal[]) {
  const available = signals.filter((signal) => signal.normalized_score !== null);
  return {
    strengths: available
      .filter((signal) => signal.normalized_score! >= 75)
      .sort((left, right) => right.contribution - left.contribution)
      .slice(0, 3)
      .map((signal) => signal.explanation),
    watchAreas: available
      .filter((signal) => signal.normalized_score! < 50)
      .sort((left, right) => left.normalized_score! - right.normalized_score!)
      .slice(0, 3)
      .map((signal) => signal.explanation),
  };
}

export function scoreChange(
  current: Pick<CapitalProfile, "score" | "signals">,
  previous: Pick<CapitalProfile, "id" | "score" | "signals"> | null,
): CapitalScoreChange | null {
  if (current.score === null || previous?.score === null || !previous) return null;
  const old = new Map(previous.signals.map((signal) => [signal.key, signal.contribution]));
  const contributors = current.signals
    .map((signal) => ({
      key: signal.key,
      delta: Number((signal.contribution - (old.get(signal.key) ?? 0)).toFixed(2)),
    }))
    .filter((item) => Math.abs(item.delta) >= 0.5)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 3)
    .map((item) => ({ ...item, direction: item.delta > 0 ? ("up" as const) : ("down" as const) }));
  return { delta: current.score - previous.score, previous_profile_id: previous.id, contributors };
}

export function buildCapitalProfile(
  id: string,
  organizationId: string,
  environment: "test" | "live",
  features: CapitalFeatureSet,
  calculatedAt: Date,
  previous: Pick<CapitalProfile, "id" | "score" | "signals"> | null = null,
): CapitalProfile {
  const sufficiency = dataSufficiency(features);
  const scored = scoreSignals(deriveSignalInputs(features));
  if (scored.observableWeight < capitalModel.minimumObservableWeight)
    sufficiency.missing.push("at least 70% of model weight must be observable");
  const eligible = sufficiency.level !== "insufficient" && scored.score !== null;
  const narrative = explanations(scored.signals);
  const profile: CapitalProfile = {
    id,
    organization_id: organizationId,
    environment,
    status: eligible ? "scored" : "insufficient_data",
    model_version: capitalModel.version,
    currency: features.currency,
    score: eligible ? scored.score : null,
    band: eligible ? scored.band : null,
    data_sufficiency: eligible ? sufficiency.level : "insufficient",
    calculated_at: calculatedAt.toISOString(),
    lookback_start: features.from.toISOString(),
    lookback_end: features.to.toISOString(),
    dimensions: eligible ? scored.dimensions : [],
    signals: scored.signals,
    strengths: eligible ? narrative.strengths : [],
    watch_areas: eligible ? narrative.watchAreas : [],
    missing_requirements: [...new Set(sufficiency.missing)],
    score_change: null,
    limitations: capitalLimitations,
  };
  profile.score_change = scoreChange(profile, previous);
  return profile;
}
