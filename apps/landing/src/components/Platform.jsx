import Button from "./ui/Button.jsx";
import Eyebrow from "./ui/Eyebrow.jsx";

const modules = [
  {
    tag: "Commerce",
    title: "Orders & inventory",
    body: "Products, variants and stock across every location, with orders that know what you can actually sell.",
  },
  {
    tag: "Payments",
    title: "Payments & refunds",
    body: "Payment links, hosted checkout and refunds, reconciled the moment money moves.",
  },
  {
    tag: "Finance",
    title: "Invoices & subscriptions",
    body: "Issue invoices, bill on a schedule and let customers pay from a link that just works.",
  },
  {
    tag: "Intelligence",
    title: "Analytics & capital",
    body: "Live revenue, customer and payment reports, plus a capital profile built from your real numbers.",
  },
];

const endpoints = [
  { method: "GET", path: "/v1/orders", label: "Every order, newest first." },
  { method: "POST", path: "/v1/payment-links", label: "Get paid from a link." },
  { method: "GET", path: "/v1/analytics/sales", label: "Revenue by day and currency." },
];

const chips = ["⚡ Real-time", "◎ Multi-currency", "▢ Test mode", "{ } Typed API", "↻ Webhooks"];

function CodePanel() {
  return (
    <div className="overflow-hidden rounded-[10px] bg-ink shadow-[0_24px_60px_rgba(23,23,23,0.18)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-bit text-[10px] uppercase tracking-[0.14em] text-white/40">
          yinne · test
        </span>
        <span className="flex items-center gap-1.5 font-bit text-[10px] uppercase tracking-[0.14em] text-canary">
          <span className="h-1.5 w-1.5 rounded-full bg-canary" aria-hidden="true" />
          200 · 38ms
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-white/80">
        <code>
          <span className="text-canary">$</span> curl api.yinne.store/v1/orders?status=paid{"\n"}
          {"{"}
          {"\n"}
          {"  "}
          <span className="text-vanilla">"count"</span>: 52,{"\n"}
          {"  "}
          <span className="text-vanilla">"orders"</span>: [{"\n"}
          {"    "}
          {'{ "number": "ORD-01A1", "total": "NGN 12,500.00", "status": "paid" },'}
          {"\n"}
          {"    "}
          {'{ "number": "ORD-01A0", "total": "NGN 6,500.00", "status": "paid" }'}
          {"\n"}
          {"  ]"}
          {"\n"}
          {"}"}
        </code>
      </pre>
    </div>
  );
}

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

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-[12px] border border-gray-200 bg-gray-50/60 p-4 sm:p-6">
            <p className="font-bit text-[10px] uppercase tracking-[0.14em] text-gray-400">
              ⓘ Call it from anywhere
            </p>
            <div className="mt-4">
              <CodePanel />
            </div>
            <p className="mt-4 font-mono text-xs text-gray-500">
              ↳ the same data the dashboard shows, over REST with typed JSON.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {chips.map((chip) => (
                <li
                  key={chip}
                  className="font-bit text-[10px] uppercase tracking-[0.12em] text-gray-500"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-between rounded-[12px] border border-gray-200 bg-white p-6">
            <div>
              <span className="inline-block rounded-[4px] border border-gray-200 px-2 py-1 font-bit text-[10px] uppercase tracking-[0.12em] text-gray-500">
                Read & write
              </span>
              <ul className="mt-6 divide-y divide-gray-100">
                {endpoints.map((endpoint) => (
                  <li key={endpoint.path} className="grid grid-cols-[auto_1fr] gap-x-4 py-4">
                    <span className="font-mono text-xs text-gray-400">
                      {endpoint.method} <span className="text-gray-500">{endpoint.path}</span>
                    </span>
                    <span className="font-display text-lg leading-snug tracking-[-0.01em] text-ink">
                      {endpoint.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8">
              <Button href="https://app.yinne.store" variant="cobalt" arrow>
                Start in test mode
              </Button>
            </div>
          </div>
        </div>

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module, index) => (
            <li
              key={module.title}
              className={`rounded-[12px] border p-6 transition-colors ${
                index === 0
                  ? "border-vanilla bg-vanilla"
                  : "border-gray-200 bg-white hover:border-ink"
              }`}
            >
              <p className="font-bit text-[10px] uppercase tracking-[0.14em] text-gray-500">
                {module.tag}
              </p>
              <h3 className="mt-6 font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                {module.title}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-600">{module.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
