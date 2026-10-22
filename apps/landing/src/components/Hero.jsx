import Navbar from "./Navbar.jsx";
import Button from "./ui/Button.jsx";
import DotMatrix from "./ui/DotMatrix.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

const stats = [
  { value: "8", label: "Modules" },
  { value: "1", label: "Dashboard" },
  { value: "0", label: "Spreadsheets" },
];

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
        <div className="flex flex-col items-center gap-8 lg:items-end">
          <DotMatrix />
          <dl className="grid w-full max-w-[460px] grid-cols-3 border-t border-gray-200 pt-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-bit text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-4xl tracking-[-0.03em] text-ink">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
