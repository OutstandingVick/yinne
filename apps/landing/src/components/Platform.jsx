import Eyebrow from "./ui/Eyebrow.jsx";
/** Section 2: what Yinne runs, shown as an API call, endpoints and module cards. */
export default function Platform() {
  return (
    <section id="platform" className="scroll-mt-24 border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:py-32">
        <Eyebrow>Platform</Eyebrow>
        <h2 className="mt-5 max-w-[18ch] font-display text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.02] tracking-[-0.025em] text-ink">
          Everything a merchant runs on. One place.
        </h2>
        <p className="mt-6 max-w-[60ch] text-[15px] leading-relaxed text-gray-500">
          Most businesses stitch together a store, a payment provider, an invoicing tool and a
          spreadsheet. Yinne is all of it at once — and every screen is backed by the same API,{" "}
          <strong className="font-bold text-ink">so your data is never in two places.</strong>
        </p>
      </div>
    </section>
  );
}
