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
      </div>
    </section>
  );
}
