import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

export function MetricCard({
  label,
  value,
  description,
  status,
  className = "",
}: {
  label: string;
  value: ReactNode;
  description?: string;
  status?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`metric-card ${className}`}>
      {status}
      <h2 className="metric-value">{value}</h2>
      <strong>{label}</strong>
      {description ? <p>{description}</p> : null}
    </Card>
  );
}
