import Navbar from "./Navbar.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

/** Section 1: headline, value line, calls to action and the dot-matrix globe. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-[radial-gradient(ellipse_at_top_left,#F6F5AE_0%,rgba(246,245,174,0)_45%)]">
      <Navbar />
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 pb-20 pt-36 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pb-28 lg:pt-44">
        <div>
          <Eyebrow>Commerce infrastructure</Eyebrow>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.03em] text-ink">
            Commerce and payments, in one calm place.
          </h1>
          <p className="mt-8 max-w-[34ch] font-display text-[clamp(1.4rem,2.4vw,2.1rem)] leading-[1.25] tracking-[-0.02em] text-gray-500">
            <span className="text-ink">Orders, inventory and payments</span> — run from one
            dashboard, live from your very first sale.
          </p>
        </div>
      </div>
    </section>
  );
}
