import Eyebrow from "./ui/Eyebrow.jsx";

const steps = [
  {
    number: "01",
    title: "Add what you sell",
    body: "Create products and variants, set prices and record stock at each location.",
  },
  {
    number: "02",
    title: "Share a link",
    body: "Send a payment link, an invoice or your storefront. Customers pay without an account.",
  },
  {
    number: "03",
    title: "Get paid",
    body: "Payments reconcile automatically, stock updates on success and refunds stay in sync.",
  },
];

/** Section 3: four steps from first product to first payout, on a near-black band. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-ink text-white">
      <div className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <Eyebrow tone="dark">How it works</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.02] tracking-[-0.025em]">
              From first product to first payout.
            </h2>
          </div>
          <p className="max-w-[52ch] text-[15px] leading-relaxed text-white/60 lg:justify-self-end">
            No integrations to wire up and nothing to install. Set up in an afternoon, take your
            first payment in test mode, and{" "}
            <strong className="font-bold text-canary">go live when you are ready.</strong>
          </p>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-[12px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.number} className="group bg-ink p-6 transition-colors hover:bg-[#1f1f1f]">
              <span className="font-bit text-[11px] tracking-[0.14em] text-canary">
                {step.number}
              </span>
              <h3 className="mt-10 font-display text-2xl leading-tight tracking-[-0.02em]">
                {step.title}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-white/55">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
