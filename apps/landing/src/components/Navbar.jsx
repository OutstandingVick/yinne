const links = [
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
];

// Placeholder targets until these pages exist.
const primaryLinks = [
  { label: "Products", href: "#platform" },
  { label: "Solutions", href: "#how-it-works" },
  { label: "Resources", href: "https://github.com/OutstandingVick/yinne" },
  { label: "Pricing", href: "mailto:hello@yinne.store?subject=Pricing" },
];

/** Floating header: wordmark on the left, product links centred, a frosted pill on the right. */
export default function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label="Primary"
        className="relative mx-auto flex max-w-[1320px] items-center justify-between px-4 py-4 sm:px-6"
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
        <ul className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-[14px] border border-white/70 bg-white/60 p-1.5 shadow-[0_8px_30px_rgba(23,23,23,0.06)] backdrop-blur-md xl:flex">
          {primaryLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="block rounded-[10px] px-3.5 py-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-ink/80 transition-colors hover:bg-vanilla hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1 rounded-[14px] border border-white/70 bg-white/70 p-1.5 shadow-[0_8px_30px_rgba(23,23,23,0.08)] backdrop-blur-md">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden rounded-[10px] px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-ink/80 transition-colors hover:bg-vanilla hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt sm:block"
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
        </div>
      </nav>
    </header>
  );
}
