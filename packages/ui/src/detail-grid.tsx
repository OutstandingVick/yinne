import type { HTMLAttributes, ReactNode } from "react";

export function DetailGrid({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`card detail-grid core-detail-grid ${className}`} {...props} />;
}

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return <div className="detail-item"><span className="label">{label}</span><div className="detail-value">{children}</div></div>;
}
