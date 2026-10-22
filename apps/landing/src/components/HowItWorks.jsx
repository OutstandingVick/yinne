import Eyebrow from "./ui/Eyebrow.jsx";
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
      </div>
    </section>
  );
}
