"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type ModalProps = { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; className?: string };

export function Modal({ open, onClose, title, children, actions, className = "" }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className={`ui-modal ${className}`} aria-labelledby={titleId} onClose={onClose}>
    <header className="modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="button button-ghost" aria-label="Close dialog" onClick={() => dialog.current?.close()}>×</button></header>
    <div className="modal-body">{children}</div>
    {actions ? <footer className="modal-actions">{actions}</footer> : null}
  </dialog>;
}
