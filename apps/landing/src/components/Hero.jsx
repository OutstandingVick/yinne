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
        </div>
      </div>
    </section>
  );
}
