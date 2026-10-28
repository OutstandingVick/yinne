import Navbar from "./Navbar.jsx";
import Button from "./ui/Button.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

/** Section 1: headline, value line, and calls to action. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#F6F5AE_0%,rgba(246,245,174,0)_55%)]"
      />
      <Navbar />
      <div className="relative mx-auto grid max-w-[1600px] items-center gap-12 px-4 pb-20 pt-36 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pb-28 lg:pt-44">
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
        <div className="relative min-w-0 lg:pl-6">
          <div className="relative aspect-[4/3] max-h-[560px] overflow-hidden rounded-[28px] shadow-[0_30px_80px_rgba(23,23,23,0.12)] ring-1 ring-ink/10 lg:aspect-[4/5]">
            <img
              src="/hero-market.webp"
              alt="At a market stall, a customer hands a banknote to a seller over fresh produce"
              width="1200"
              height="1797"
              loading="eager"
              fetchPriority="high"
              className="h-full w-full object-cover object-[60%_70%]"
            />
          </div>
          <div className="absolute -bottom-6 left-3 w-[min(85%,320px)] lg:-bottom-10 lg:-left-6">
            <span className="sr-only">
              Yinne payment received: ₦12,500.00 for order ORD-01A1, paid by Ada O. through a
              payment link today at 10:42. Stock updated for one item.
            </span>
            <div
              aria-hidden="true"
              className="relative rounded-2xl bg-white p-4 shadow-[0_16px_48px_rgba(23,23,23,0.16)] ring-1 ring-ink/10 sm:p-5"
            >
              <div className="flex items-center gap-2 border-b border-ink/10 pb-2">
                <img src="/yinne-icon.svg" alt="" width="26" height="26" className="rounded-md" />
                <span className="flex-1 font-bit text-[10px] uppercase tracking-wide text-ink">
                  Payment received
                </span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-cobalt text-xs font-bold text-white">
                  ✓
                </span>
              </div>
              <p className="py-2 font-display text-3xl leading-none tracking-tight text-ink sm:text-4xl">
                ₦12,500.00
              </p>
              <div className="space-y-1 border-t border-dashed border-ink/20 pt-2 font-mono text-[10px] leading-4 text-ink sm:text-[11px]">
                <div className="flex justify-between gap-2">
                  <span>Order</span>
                  <span>ORD-01A1</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Method</span>
                  <span>Payment link</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Customer</span>
                  <span>Ada O.</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Time</span>
                  <span>Today, 10:42</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-ink/10 pt-2 font-bit text-[10px] uppercase tracking-wide text-ink">
                <span className="h-2 w-2 rounded-full bg-canary ring-1 ring-ink/20" />
                Stock updated · 1 item
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
