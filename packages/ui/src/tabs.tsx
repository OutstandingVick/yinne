"use client";

import { useId, type ReactNode } from "react";

export function Tabs({ label, items, value, onValueChange }: { label: string; items: readonly { value: string; label: string; content: ReactNode; disabled?: boolean }[]; value: string; onValueChange: (value: string) => void }) {
  const id = useId();
  return <div className="tabs">
    <div role="tablist" aria-label={label} className="tab-list" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next]?.focus(); buttons[next]?.click();
    }}>
      {items.map((item, index) => <button key={item.value} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} disabled={item.disabled} onClick={() => onValueChange(item.value)}>{item.label}</button>)}
    </div>
    {items.map((item, index) => <div key={item.value} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={value !== item.value} tabIndex={0}>{item.content}</div>)}
  </div>;
}
