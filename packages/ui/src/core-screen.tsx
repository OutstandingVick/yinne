import type { HTMLAttributes } from "react";

/** Shared composition boundary for the core dashboard screens. */
export function CoreScreen({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`core-screen ${className}`} {...props} />;
}
