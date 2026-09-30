import type { HTMLAttributes } from "react";

export function ActionGroup({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`action-group ${className}`} {...props} />;
}
