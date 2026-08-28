export const operatingModes = ["test", "live"] as const;
export type OperatingMode = (typeof operatingModes)[number];

export function assertModeMatch(expected: OperatingMode, actual: OperatingMode): void {
  if (expected !== actual) throw new Error("Operating mode mismatch.");
}
