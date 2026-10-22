import Navbar from "./Navbar.jsx";
import Button from "./ui/Button.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

/** Section 1: headline, value line, and calls to action. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-[radial-gradient(ellipse_at_top_left,#F6F5AE_0%,rgba(246,245,174,0)_45%)]">
      <Navbar />
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 pb-20 pt-36 sm:px-6 lg:pb-28 lg:pt-44">
        <div>
          <Eyebrow>Commerce infrastructure</Eyebrow>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.03em] text-ink">
            Commerce and payments, in one calm place.
          </h1>
          <p className="mt-8 max-w-[34ch] font-display text-[clamp(1.4rem,2.4vw,2.1rem)] leading-[1.25] tracking-[-0.02em] text-gray-500">
            <span className="text-ink">Orders, inventory and payments</span> — run from one
            dashboard, live from your very first sale.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="https://app.yinne.store" arrow>
              Open the dashboard
            </Button>
            <Button href="#how-it-works" variant="secondary">
              See how it works
            </Button>
          </div>
          <div className="mt-10 inline-flex items-center gap-3 rounded-[6px] border border-gray-200 bg-white/80 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-cobalt" aria-hidden="true" />
            <span className="font-bit text-[11px] uppercase tracking-[0.12em] text-gray-500">
              Built in Lagos · Test mode live
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
