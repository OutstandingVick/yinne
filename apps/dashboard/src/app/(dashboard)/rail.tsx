"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navigation, type NavGroup } from "./navigation";

const icons: Record<NavGroup["icon"], string> = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  commerce: "M5 7h14l-1 14H6Z M9 7V5a3 3 0 0 1 6 0v2",
  payments: "M3 6h18v12H3Z M3 10h18 M7 15h4",
  channels: "M4 9 5 4h14l1 5 M4 9h16v11H4Z M9 20v-6h6v6",
  finance: "M6 3h12v18l-3-2-3 2-3-2-3 2Z M9 8h6 M9 12h6",
  operations: "M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12Z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  recurring: "M20 12a8 8 0 0 1-14 5 M4 12a8 8 0 0 1 14-5 M18 3v4h-4 M6 21v-4h4",
  intelligence: "M4 20V4 M4 20h16 M8 16v-4 M12 16V8 M16 16v-6",
  platform:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
};

/** Desktop navigation: one icon per group, with the group's pages in a flyout. */
export function Rail() {
  const pathname = usePathname();
  return (
    <>
      <Link href="/" className="rail-brand" aria-label="Yinne home">
        <Image src="/brand/yinne-icon.svg" alt="" width={44} height={44} priority />
      </Link>
      <nav aria-label="Primary" className="rail-nav">
        {navigation.map((group) => {
          const active = group.items.some(([, href]) => isActive(href, pathname));
          const single = group.items.length === 1;
          return (
            <div
              key={group.label}
              className={`rail-group${group.icon === "platform" ? " rail-group-end" : ""}`}
            >
              <Link
                href={group.items[0]![1]}
                className="rail-button"
                aria-label={group.label}
                aria-current={single && active ? "page" : undefined}
                data-active={active || undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={icons[group.icon]} />
                </svg>
              </Link>
              <div className="rail-flyout" role="group" aria-label={group.label}>
                <span className="rail-flyout-title">{group.label}</span>
                {single
                  ? null
                  : group.items.map(([label, href]) => (
                      <Link
                        key={href}
                        href={href}
                        className="rail-flyout-link"
                        aria-current={isActive(href, pathname) ? "page" : undefined}
                      >
                        {label}
                      </Link>
                    ))}
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}
