"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFloatingPosition } from "./floating-position";

/** Disclosure with ordinary links/buttons: native Tab order, Escape dismissal. */
export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const position = useFloatingPosition<HTMLDivElement>(open);
  return (
    <details
      className="dropdown"
      ref={details}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          details.current?.removeAttribute("open");
          details.current?.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.removeAttribute("open");
      }}
    >
      <summary className="button button-secondary">
        {label}
        <span aria-hidden="true">⌄</span>
      </summary>
      <div
        ref={position}
        className="dropdown-panel"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a,button")) {
            details.current?.removeAttribute("open");
            details.current?.querySelector("summary")?.focus();
          }
        }}
      >
        {children}
      </div>
    </details>
  );
}
