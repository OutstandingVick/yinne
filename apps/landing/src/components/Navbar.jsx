import { useEffect, useRef, useState } from "react";

// Placeholder targets until Products, Solutions, Resources and Pricing pages exist.
const links = [
  { label: "Products", href: "#platform" },
  { label: "Solutions", href: "#how-it-works" },
  { label: "Resources", href: "https://github.com/OutstandingVick/yinne" },
  { label: "Pricing", href: "mailto:hello@yinne.store?subject=Pricing" },
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
];

/** Floating header: wordmark on the left; a frosted pill with the links (a menu below 1280px) and Open app. */
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6"
      >
        <a
          href="/"
          className="flex items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt"
        >
          <img src="/yinne-icon.svg" alt="" width="36" height="36" className="rounded-[9px]" />
          <span className="font-display text-[26px] leading-none tracking-[-0.02em] text-ink">
            Yinne
          </span>
        </a>
        <div
          ref={menuRef}
          className="relative flex items-center gap-1 rounded-[14px] border border-white/70 bg-white/70 p-1.5 shadow-[0_8px_30px_rgba(23,23,23,0.08)] backdrop-blur-md"
        >
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-11 items-center justify-center rounded-[10px] text-ink xl:hidden transition-colors hover:bg-vanilla focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hidden rounded-[10px] px-4 py-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-ink/80 transition-colors hover:bg-vanilla hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt xl:block"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://app.yinne.store"
            className="rounded-[10px] bg-ink px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-white transition-colors hover:bg-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
          >
            Open app
          </a>
          {open ? (
            <ul
              id="site-menu"
              className="absolute right-0 xl:hidden top-[calc(100%+8px)] w-56 rounded-[14px] border border-white/70 bg-white/90 p-1.5 shadow-[0_16px_40px_rgba(23,23,23,0.12)] backdrop-blur-md"
            >
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-[10px] px-4 py-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-ink/80 transition-colors hover:bg-vanilla hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
