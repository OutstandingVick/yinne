export const capitalModel = {
  version: "rules-1" as const,
  lookbackDays: 180,
  minimumObservedDays: 90,
  minimumPaidOrders: 30,
  minimumObservableWeight: 70,
  weights: {
    revenue_consistency: 25,
    positive_growth: 20,
    cash_flow_stability: 20,
    customer_quality: 15,
    refund_risk: 10,
    operating_history: 10,
  },
  bands: [
    { minimum: 80, key: "highly_stable" as const },
    { minimum: 60, key: "stable" as const },
    { minimum: 40, key: "developing" as const },
    { minimum: 0, key: "limited" as const },
  ],
  thresholds: {
    revenueConsistency: [
      [0.15, 100],
      [0.3, 80],
      [0.5, 55],
      [0.8, 25],
      [1, 0],
    ],
    growth: [
      [-0.3, 0],
      [-0.1, 30],
      [0, 55],
      [0.1, 75],
      [0.25, 90],
      [0.5, 100],
    ],
    customerQuality: [
      [0, 0],
      [0.15, 40],
      [0.3, 65],
      [0.5, 85],
      [0.7, 100],
    ],
    refundRisk: [
      [0, 100],
      [0.02, 90],
      [0.05, 70],
      [0.1, 40],
      [0.2, 0],
    ],
  },
} as const;

export type CapitalSignalKey = keyof typeof capitalModel.weights;
