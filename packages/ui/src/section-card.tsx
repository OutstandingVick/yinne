import type { HTMLAttributes } from "react";

/** A card used as a named section; callers keep their existing heading and content. */
export function SectionCard({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`card core-section-card ${className}`} {...props} />;
}
