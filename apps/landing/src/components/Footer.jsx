import Button from "./ui/Button.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";
/** Section 4: closing statement, call to action, links and the legal line. */
export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[1320px] px-4 pt-24 sm:px-6 lg:pt-32">
        <div className="relative overflow-hidden rounded-[16px] bg-cobalt px-6 py-16 text-white sm:px-12 lg:py-24">
          <span
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-canary"
          />
          <div className="relative max-w-[22ch]">
            <Eyebrow tone="dark">Start today</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.75rem,6vw,4.75rem)] leading-[0.98] tracking-[-0.03em]">
              Your business, finally in one place.
            </h2>
          </div>
          <div className="relative mt-10 flex flex-wrap gap-3">
            <Button href="https://app.yinne.store" variant="light" arrow>
              Open the dashboard
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-8 font-bit text-[10px] uppercase tracking-[0.14em] text-gray-400 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Yinne</span>
          <span>Test mode · No real financial execution</span>
        </div>
      </div>
    </footer>
  );
}
