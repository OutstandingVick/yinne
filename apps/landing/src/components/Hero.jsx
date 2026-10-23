import Navbar from "./Navbar.jsx";
import Button from "./ui/Button.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

/** Section 1: headline, value line, and calls to action. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-white">
      {/* Store-aisle photo blended into the hero palette: a cobalt multiply tint, a white wash
          that keeps the headline readable, the vanilla glow and a fade into the next section. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <img
          src="/hero-store.jpg"
          alt=""
          className="h-full w-full object-cover object-[70%_center] saturate-[0.85]"
        />
        <div className="absolute inset-0 bg-cobalt/25 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/75 lg:via-white/85 lg:to-white/25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#F6F5AE_0%,rgba(246,245,174,0)_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white" />
      </div>
      <Navbar />
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-4 pb-20 pt-36 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pb-28 lg:pt-44">
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
        </div>
      </div>
    </section>
  );
}
