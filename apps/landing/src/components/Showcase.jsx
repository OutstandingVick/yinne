import Eyebrow from "./ui/Eyebrow.jsx";
/** Section 2: product showcase. */
export default function Showcase() {
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:py-32">
        <div className="flex flex-col items-center text-center">
          <Eyebrow>The dashboard</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-ink">
            Run your whole business from one screen.
          </h2>
        </div>

        <figure className="mx-auto mt-14 max-w-[1280px] rounded-[22px] border border-gray-200 bg-gray-100 p-2 shadow-[0_30px_80px_rgba(23,23,23,0.10)]"></figure>
      </div>
    </section>
  );
}
