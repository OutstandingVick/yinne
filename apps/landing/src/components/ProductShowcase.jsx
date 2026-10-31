import { useRef, useState } from "react";
import { products } from "./productShowcaseData.js";
import Button from "./ui/Button.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

export default function ProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabsRef = useRef([]);
  const product = products[activeIndex];

  function handleTabKeyDown(event, index) {
    let nextIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % products.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + products.length) % products.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = products.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabsRef.current[nextIndex]?.focus();
  }

  return (
    <section id="products" className="scroll-mt-24 border-b border-gray-100 bg-gray-50/60">
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow>Yinne products</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-ink">
            Everything you need to move forward.
          </h2>
          <p className="mx-auto mt-6 max-w-[55ch] text-pretty text-[15px] leading-relaxed text-gray-600">
            Explore the connected tools for selling, getting paid, running your business and
            understanding what comes next.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto border-b border-ink/10">
          <div role="tablist" aria-label="Yinne products" className="flex min-w-max gap-1">
            {products.map((item, index) => (
              <button
                key={item.id}
                ref={(element) => {
                  tabsRef.current[index] = element;
                }}
                id={`product-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-controls="product-panel"
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`min-h-12 rounded-t-[8px] border-b-2 px-5 py-3 font-mono text-xs uppercase tracking-[0.06em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cobalt sm:px-7 sm:text-[13px] ${
                  index === activeIndex
                    ? "border-ink bg-ink text-white"
                    : "border-transparent text-gray-600 hover:border-cobalt hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          id="product-panel"
          role="tabpanel"
          aria-labelledby={`product-tab-${product.id}`}
          tabIndex={0}
          className="grid gap-12 py-12 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-16"
        >
          <div className="flex min-w-0 flex-col items-start justify-center">
            <p className="font-bit text-[11px] uppercase tracking-[0.14em] text-cobalt">
              0{activeIndex + 1} / 0{products.length} · {product.label}
            </p>
            <h3 className="mt-6 max-w-[16ch] text-balance font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.025em] text-ink">
              {product.title}
            </h3>
            <p className="mt-6 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-gray-600">
              {product.description}
            </p>
            <ul className="mt-8 space-y-4">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-ink">
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-vanilla font-mono text-xs text-ink"
                  >
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Button href="https://app.yinne.store" variant="cobalt" arrow>
                Open Yinne
              </Button>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-[16px] border border-ink/10 bg-white shadow-[0_24px_60px_rgba(23,23,23,0.08)]">
              <div className="flex items-center gap-3 border-b border-ink/10 bg-vanilla/50 px-5 py-4 sm:px-6">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-ink/20" />
                  <span className="h-2 w-2 rounded-full bg-ink/20" />
                  <span className="h-2 w-2 rounded-full bg-ink/20" />
                </span>
                <span className="min-w-0 truncate font-mono text-xs text-ink/70">
                  Yinne / {product.previewTitle}
                </span>
              </div>
              <div className="p-5 sm:p-8">
                <div className="flex items-center gap-3">
                  <img
                    src="/yinne-icon.svg"
                    alt=""
                    width="40"
                    height="40"
                    className="rounded-[10px]"
                  />
                  <div>
                    <p className="font-bit text-[10px] uppercase tracking-[0.14em] text-gray-500">
                      Product preview
                    </p>
                    <p className="font-display text-xl text-ink">{product.previewTitle}</p>
                  </div>
                </div>
                <div className="mt-7 space-y-3">
                  {product.previewRows.map((row, index) => (
                    <div
                      key={row}
                      className="flex items-center gap-4 rounded-[10px] border border-ink/10 bg-white px-4 py-4"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-vanilla font-bit text-[11px] text-ink">
                        0{index + 1}
                      </span>
                      <span className="min-w-0 flex-1 font-display text-lg text-ink">{row}</span>
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full bg-cobalt"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-[16px] bg-ink px-5 py-5 text-white sm:px-7">
              <p className="font-bit text-[10px] uppercase tracking-[0.14em] text-canary">
                One connected workflow
              </p>
              <ol className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs leading-relaxed text-white/80">
                {product.flow.map((step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-canary">
                        →
                      </span>
                    ) : null}
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
