import type { InputHTMLAttributes } from "react";

export function SearchField({ label, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className={`search-field ${className}`}>
    <span className="label">{label}</span>
    <span className="search-control">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input {...props} type="search" className="input" />
    </span>
  </label>;
}
