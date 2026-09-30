"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className="nav-link" href={href} aria-current={active ? "page" : undefined}>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {href === "/" ? (
          <path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7" />
        ) : href.startsWith("/commerce") ? (
          <path d="M4 7h16v14H4Z M8 7V5a4 4 0 0 1 8 0v2 M4 12h16" />
        ) : href.startsWith("/settings") ? (
          <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
          </>
        ) : (
          <>
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <path d="M8 8h8 M8 12h8 M8 16h4" />
          </>
        )}
      </svg>
      <span>{children}</span>
    </Link>
  );
}
