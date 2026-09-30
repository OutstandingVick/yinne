import type { ReactNode } from "react";

/** Presents an already formatted amount without changing rounding or currency logic. */
export function FinancialAmount({ children, prominent = false }: { children: ReactNode; prominent?: boolean }) {
  return <span className={`financial-amount${prominent ? " financial-amount-prominent" : ""}`}>{children}</span>;
}
