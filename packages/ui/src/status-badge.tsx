import type { ReactNode } from "react";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";
const symbols: Record<StatusTone, string> = {
  neutral: "•",
  success: "✓",
  warning: "!",
  danger: "×",
  info: "i",
};

/** Callers supply the semantic tone; business statuses are never inferred here. */
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span className={`badge badge-${tone} status-badge`}>
      <span aria-hidden="true">{symbols[tone]}</span>
      <span className="status-badge-label">{children}</span>
    </span>
  );
}
