/** Floating header: wordmark on the left, a frosted pill of links on the right. */
export default function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-4 sm:px-6"
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
      </nav>
    </header>
  );
}
