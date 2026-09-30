"use client";

import { Modal, type ModalProps } from "./modal";

export function Drawer({ className = "", ...props }: ModalProps) {
  return <Modal {...props} className={`ui-drawer ${className}`} />;
}
