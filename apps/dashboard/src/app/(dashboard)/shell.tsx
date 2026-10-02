"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function DashboardShell({
  rail,
  sidebar,
  topbar,
  children,
}: {
  rail: ReactNode;
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 70rem)");
    const close = () => {
      if (desktop.matches) drawer.current?.close();
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  return (
    <>
      <a className="skip-link" href="#dashboard-content">
        Skip to content
      </a>
      <div className={`shell${pathname === "/" ? " home-shell" : ""}`}>
        <aside className="rail desktop-sidebar">{rail}</aside>
        <div className="main">
          <header className="topbar">
            <button
              className="button button-secondary menu-toggle"
              type="button"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {topbar}
          </header>
          <main className="content" id="dashboard-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
      <dialog
        ref={drawer}
        className="navigation-drawer"
        aria-label="Navigation"
        onClick={(event) => {
          if (event.target === event.currentTarget) drawer.current?.close();
        }}
      >
        <div className="sidebar">
          <button
            className="drawer-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => drawer.current?.close()}
          >
            ×
          </button>
          <div
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) drawer.current?.close();
            }}
          >
            {sidebar}
          </div>
        </div>
      </dialog>
    </>
  );
}
