import type { ReactNode } from "react";

/** Supply existing route URLs and labels; pagination never fetches or computes data. */
export function Pagination({ label, previous, next, children }: { label: string; previous?: { href: string; label: string }; next?: { href: string; label: string }; children?: ReactNode }) {
  return <nav className="pagination" aria-label={label}>
    {previous ? <a className="button button-secondary" href={previous.href}>{previous.label}</a> : null}
    <span className="pagination-summary">{children}</span>
    {next ? <a className="button button-secondary" href={next.href}>{next.label}</a> : null}
  </nav>;
}
