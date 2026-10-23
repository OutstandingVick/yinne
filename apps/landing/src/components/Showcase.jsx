import { useState } from "react";
import Eyebrow from "./ui/Eyebrow.jsx";

const tabs = [
  {
    id: "sell",
    label: "Sell",
    body: "List products, track stock across locations and take orders — all from one screen.",
  },
  {
    id: "get-paid",
    label: "Get paid",
    body: "Send payment links, run hosted checkout and handle refunds without leaving Yinne.",
  },
  {
    id: "grow",
    label: "Grow",
    body: "Watch revenue and customers in real time, and plan with numbers you can trust.",
  },
];

/** Section 2: product showcase. */
export default function Showcase() {
  const [active, setActive] = useState(tabs[0].id);
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:py-32">
        <div className="flex flex-col items-center text-center">
          <Eyebrow>The dashboard</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-ink">
            Run your whole business from one screen.
          </h2>
          <div
            role="tablist"
            aria-label="What you can do in Yinne"
            className="mt-8 inline-flex rounded-full bg-gray-100 p-1"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`showcase-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                aria-controls="showcase-panel"
                onClick={() => setActive(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <figure className="mx-auto mt-14 max-w-[1280px] rounded-[22px] border border-gray-200 bg-gray-100 p-2 shadow-[0_30px_80px_rgba(23,23,23,0.10)]">
          <img
            src="/dashboard.webp"
            alt="Yinne dashboard home: collected, unpaid and refunded balances, a monthly revenue chart, this month's collections and top customers."
            width="2000"
            height="1085"
            loading="lazy"
            className="block w-full rounded-[14px] border border-gray-200 bg-white"
          />
        </figure>
      </div>
    </section>
  );
}
