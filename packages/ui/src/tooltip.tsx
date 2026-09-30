"use client";

import { useId, useState, type ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <span className="tooltip" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} onFocus={() => setVisible(true)} onBlur={() => setVisible(false)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setVisible(false); } }}>
    <button type="button" className="tooltip-trigger" aria-describedby={visible ? id : undefined} onClick={() => setVisible(!visible)}>{children}</button>
    <span id={id} role="tooltip" className="tooltip-content" hidden={!visible}>{label}</span>
  </span>;
}
