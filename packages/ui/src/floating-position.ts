"use client";

import { useLayoutEffect, useRef } from "react";

/** Keep small anchored surfaces within the viewport without clipping their text. */
export function useFloatingPosition<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const element = ref.current;
      if (!element) return;
      element.style.transform = "none";
      const bounds = element.getBoundingClientRect();
      const shift =
        bounds.right > window.innerWidth - 16
          ? window.innerWidth - 16 - bounds.right
          : bounds.left < 16
            ? 16 - bounds.left
            : 0;
      element.style.transform = `translateX(${shift}px)`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);
  return ref;
}
