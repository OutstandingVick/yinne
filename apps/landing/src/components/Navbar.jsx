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
        <div className="flex items-center gap-1 rounded-[14px] border border-white/70 bg-white/70 p-1.5 shadow-[0_8px_30px_rgba(23,23,23,0.08)] backdrop-blur-md">
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
