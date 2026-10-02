import Link from "next/link";
import { CoreScreen, EmptyState, FinancialAmount, StatusBadge } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCustomers, listOrders } from "@yinne/commerce";
import { auth } from "../../auth";
import { activeUserContext } from "../../lib/context";
import { formatMinorAmount } from "../../lib/money";
import "./home.css";

type Order = Awaited<ReturnType<typeof listOrders>>["data"][number];

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLLECTED = new Set(["paid", "partially_refunded"]);

const actions = [
  [
    "Payment link",
    "/payment-links",
    "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m1 5a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  ],
  ["Checkout", "/checkout/sessions", "M3 5h18v14H3zM3 10h18"],
  ["New order", "/commerce/orders", "M12 5v14M5 12h14"],
  ["Refund", "/refunds", "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"],
  ["Create invoice", "/invoices", "M7 3h10v18l-5-3-5 3zM10 8h4M10 12h4"],
] as const;

function major(amount: bigint) {
  return Number(amount) / 100;
}

function compact(amount: bigint, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(major(amount));
}

function sumBy(orders: Order[], predicate: (order: Order) => boolean) {
  return orders.filter(predicate).reduce((total, order) => total + BigInt(order.total_amount), 0n);
}

/** Catmull-Rom spline through the points, with control points clamped to [top, bottom]. */
function smoothPath(points: [number, number][], top: number, bottom: number) {
  const clamp = (y: number) => Math.min(bottom, Math.max(top, y));
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M${x},${y}`;
    const [x0, y0] = points[index - 2] ?? points[index - 1]!;
    const [x1, y1] = points[index - 1]!;
    const [x3, y3] = points[index + 1] ?? [x, y];
    return `${path} C${x1 + (x - x0) / 6},${clamp(y1 + (y - y0) / 6)} ${x - (x3 - x1) / 6},${clamp(y - (y3 - y1) / 6)} ${x},${y}`;
  }, "");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function shortDate(time: number) {
  return new Date(time).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default async function HomePage() {
  const session = await auth();
  const context = await activeUserContext(createRequestId());
  const [ordersResult, customersResult] = await Promise.allSettled([
    listOrders(context, { limit: 100 }),
    listCustomers(context, { limit: 100 }),
  ]);
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value.data : null;
  const customers = customersResult.status === "fulfilled" ? customersResult.value.data : [];
  const firstName =
    session?.user.name?.split(" ")[0] ?? session?.user.email?.split("@")[0] ?? "there";

  // Amounts can't be summed across currencies, so the page reports the one with the most orders.
  const byCurrency = new Map<string, Order[]>();
  for (const order of orders ?? [])
    byCurrency.set(order.currency, [...(byCurrency.get(order.currency) ?? []), order]);
  const [currency, ledger] = [...byCurrency.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0] ?? ["NGN", []];
  const stack = [
    ["Collected", "/payments", "blue", sumBy(ledger, (o) => COLLECTED.has(o.financial_status))],
    ["Unpaid", "/commerce/orders", "yellow", sumBy(ledger, (o) => o.financial_status === "unpaid")],
    ["Refunded", "/refunds", "ink", sumBy(ledger, (o) => o.financial_status === "refunded")],
  ] as const;

  const now = Date.now();
  const inWindow = (order: Order, from: number, to: number) => {
    const created = new Date(order.created_at).getTime();
    return created >= from && created < to;
  };
  const collectedIn = (from: number, to: number) =>
    sumBy(ledger, (o) => COLLECTED.has(o.financial_status) && inWindow(o, from, to));
  const collectedThis = collectedIn(now - 30 * DAY, now + DAY);
  const collectedPrev = collectedIn(now - 60 * DAY, now - 30 * DAY);
  const change =
    collectedPrev > 0n
      ? (Number(collectedThis - collectedPrev) / Number(collectedPrev)) * 100
      : null;

  // Overview: collected per month, this year against last year.
  const today = new Date();
  const year = today.getFullYear();
  const monthly = (y: number) =>
    MONTHS.map((_, month) =>
      major(collectedIn(new Date(y, month, 1).getTime(), new Date(y, month + 1, 1).getTime())),
    );
  const current = monthly(year);
  const previous = monthly(year - 1);
  const peak = Math.max(1, ...current, ...previous);
  const chart = { width: 720, height: 220, top: 16, inset: 8 };
  const xAt = (month: number) => chart.inset + (month * (chart.width - 2 * chart.inset)) / 11;
  const plot = (values: number[]) =>
    values.map((value, month): [number, number] => [
      xAt(month),
      chart.top + (1 - value / peak) * (chart.height - chart.top),
    ]);
  const currentPoints = plot(current.slice(0, today.getMonth() + 1));
  const previousPoints = plot(previous);
  const lastPoint = currentPoints.at(-1)!;
  const total = (values: number[]) => BigInt(Math.round(values.reduce((a, b) => a + b, 0) * 100));

  // Collection progress for this calendar month.
  const monthStart = new Date(year, today.getMonth(), 1).getTime();
  const ordered = sumBy(ledger, (o) => inWindow(o, monthStart, now + DAY));
  const collected = collectedIn(monthStart, now + DAY);
  const segments = 48;
  const filled = ordered > 0n ? Math.round((Number(collected) / Number(ordered)) * segments) : 0;

  // Top customers by order value.
  const spend = new Map<string, bigint>();
  for (const order of ledger)
    if (order.customer_id)
      spend.set(
        order.customer_id,
        (spend.get(order.customer_id) ?? 0n) + BigInt(order.total_amount),
      );
  const topCustomers = [...spend.entries()]
    .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))
    .map(([id]) => customers.find((customer) => customer.id === id))
    .filter((customer) => customer !== undefined)
    .slice(0, 5);
  const averageOrder = ledger.length > 0 ? sumBy(ledger, () => true) / BigInt(ledger.length) : 0n;

  // Money movement: ten three-day buckets over the last 30 days.
  const buckets = Array.from({ length: 10 }, (_, index) => {
    const from = now - (10 - index) * 3 * DAY;
    const to = from + 3 * DAY;
    return {
      from,
      in: collectedIn(from, to),
      out: sumBy(ledger, (o) => o.financial_status === "refunded" && inWindow(o, from, to)),
    };
  });
  const moneyIn = buckets.reduce((sum, bucket) => sum + bucket.in, 0n);
  const moneyOut = buckets.reduce((sum, bucket) => sum + bucket.out, 0n);
  const bucketPeak = Math.max(1, ...buckets.map((bucket) => major(bucket.in)));
  const busiest = buckets.reduce(
    (best, bucket, index) => (bucket.in > buckets[best]!.in ? index : best),
    0,
  );

  return (
    <CoreScreen className="yh">
      <header className="yh-header">
        <h1>Welcome back, {firstName}!</h1>
        <nav className="yh-actions" aria-label="Quick actions">
          {actions.map(([label, href, icon], index) => (
            <Link
              key={label}
              href={href}
              className={index === 0 ? "yh-pill yh-pill-primary" : "yh-pill"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={icon} />
              </svg>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="yh-row yh-row-top">
        <section className="yh-card yh-wallet" aria-label="Collected balance">
          <div className="yh-stack">
            {stack.map(([label, href, tone, amount]) => (
              <Link href={href} key={label} className={`yh-currency yh-currency-${tone}`}>
                <span>{label}</span>
                <span>{compact(amount, currency)}</span>
              </Link>
            ))}
          </div>
          <div className="yh-wallet-body">
            <span className="yh-chip">
              {ledger.length} {currency} orders
            </span>
            <p className="yh-label">
              Collected · last 30 days{" "}
              {change !== null && (
                <span className={change >= 0 ? "yh-up" : "yh-down"}>
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
              )}
            </p>
            <span className="yh-balance">
              <FinancialAmount>
                {formatMinorAmount(collectedThis.toString(), currency)}
              </FinancialAmount>
            </span>
          </div>
        </section>

        <section className="yh-card yh-overview" aria-labelledby="yh-overview-title">
          <div className="yh-card-head">
            <h2 id="yh-overview-title">Overview</h2>
            <div className="yh-legend">
              <span className="yh-legend-current">
                {year} <strong>{compact(total(current), currency)}</strong>
              </span>
              <span className="yh-legend-previous">
                {year - 1} <strong>{compact(total(previous), currency)}</strong>
              </span>
            </div>
            <Link href="/analytics" className="yh-ghost">
              Analytics ↗
            </Link>
          </div>
          <svg
            className="yh-line-chart"
            viewBox={`0 0 ${chart.width} ${chart.height + 28}`}
            role="img"
            aria-label={`Collected ${currency} per month, ${year} compared with ${year - 1}`}
          >
            {[0.25, 0.5, 0.75, 1].map((step) => {
              const y = chart.top + (1 - step) * (chart.height - chart.top);
              return <line key={step} className="yh-grid" x1={0} x2={chart.width} y1={y} y2={y} />;
            })}
            <path
              className="yh-line-previous"
              d={smoothPath(previousPoints, chart.top, chart.height)}
            />
            <path
              className="yh-line-current"
              d={smoothPath(currentPoints, chart.top, chart.height)}
            />
            <line
              className="yh-cursor"
              x1={lastPoint[0]}
              x2={lastPoint[0]}
              y1={chart.top}
              y2={chart.height}
            />
            <circle className="yh-dot" cx={lastPoint[0]} cy={lastPoint[1]} r={6} />
            {MONTHS.map((month, index) => (
              <text
                key={month}
                x={xAt(index)}
                y={chart.height + 22}
                textAnchor={index === 0 ? "start" : index === 11 ? "end" : "middle"}
              >
                {month}
              </text>
            ))}
          </svg>
        </section>
      </div>

      <div className="yh-row">
        <section className="yh-card yh-progress" aria-labelledby="yh-progress-title">
          <div className="yh-card-head">
            <div>
              <h2 id="yh-progress-title">Collected this month</h2>
              <span className="yh-figure">
                <FinancialAmount>
                  {formatMinorAmount(collected.toString(), currency)}
                </FinancialAmount>
              </span>
            </div>
            <Link href="/payments" className="yh-icon-button" aria-label="Open payments">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h18v14H3zM3 10h18M7 15h4" />
              </svg>
            </Link>
          </div>
          <p className="yh-label">From {shortDate(monthStart)} to today</p>
          <div
            className="yh-segments"
            role="meter"
            aria-label="Share of this month's order value collected"
            aria-valuemin={0}
            aria-valuemax={segments}
            aria-valuenow={filled}
          >
            {Array.from({ length: segments }, (_, index) => (
              <span key={index} className={index < filled ? "is-filled" : ""} />
            ))}
          </div>
          <div className="yh-progress-foot">
            <span>
              Collected <strong>{formatMinorAmount(collected.toString(), currency)}</strong>
            </span>
            <span>
              Ordered <strong>{formatMinorAmount(ordered.toString(), currency)}</strong>
            </span>
          </div>
        </section>

        <section className="yh-card yh-customers" aria-labelledby="yh-customers-title">
          <div className="yh-card-head">
            <h2 id="yh-customers-title">Top customers</h2>
            <Link href="/commerce/customers" className="yh-ghost">
              See all customers
            </Link>
          </div>
          <div className="yh-avatars">
            <Link
              href="/commerce/customers"
              className="yh-avatar yh-avatar-add"
              aria-label="Add customer"
            >
              +
            </Link>
            {topCustomers.map((customer, index) => (
              <Link
                key={customer.id}
                href={`/commerce/customers/${customer.id}`}
                className={index === 0 ? "yh-avatar is-selected" : "yh-avatar"}
                title={customer.name}
                aria-label={customer.name}
              >
                {initials(customer.name)}
              </Link>
            ))}
          </div>
          <div className="yh-send">
            <div>
              <p className="yh-label">Average order</p>
              <span className="yh-figure">
                <FinancialAmount>
                  {formatMinorAmount(averageOrder.toString(), currency)}
                </FinancialAmount>
              </span>
            </div>
            <Link href="/payment-links" className="yh-pill yh-pill-primary">
              Request payment
            </Link>
          </div>
        </section>
      </div>

      <div className="yh-row">
        <section className="yh-card yh-orders" aria-labelledby="yh-orders-title">
          <div className="yh-card-head">
            <h2 id="yh-orders-title">Recent orders</h2>
            <Link href="/commerce/orders" className="yh-ghost">
              See all
            </Link>
          </div>
          {orders === null ? (
            <EmptyState
              title="Orders unavailable"
              description="Open Orders to inspect this data."
            />
          ) : orders.length === 0 ? (
            <EmptyState title="No orders" description="Create the first commercial order." />
          ) : (
            <ul className="yh-order-list">
              {orders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link href={`/commerce/orders/${order.id}`}>{order.number}</Link>
                  <time dateTime={new Date(order.created_at).toISOString()}>
                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                  <FinancialAmount>
                    {formatMinorAmount(order.total_amount, order.currency)}
                  </FinancialAmount>
                  <StatusBadge
                    tone={
                      order.financial_status === "paid"
                        ? "success"
                        : order.financial_status === "unpaid"
                          ? "warning"
                          : "info"
                    }
                  >
                    {order.financial_status.replace("_", " ")}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="yh-card yh-movement" aria-labelledby="yh-movement-title">
          <div className="yh-card-head">
            <h2 id="yh-movement-title">Money movement</h2>
            <span className="yh-ghost">Last 30 days</span>
          </div>
          <div className="yh-movement-totals">
            <div>
              <p className="yh-label">Money in</p>
              <FinancialAmount>{formatMinorAmount(moneyIn.toString(), currency)}</FinancialAmount>
            </div>
            <div>
              <p className="yh-label">Refunded</p>
              <FinancialAmount>{formatMinorAmount(moneyOut.toString(), currency)}</FinancialAmount>
            </div>
          </div>
          <ol className="yh-bars" aria-label="Money in per three-day period">
            {buckets.map((bucket, index) => (
              <li
                key={bucket.from}
                className={index === busiest && bucket.in > 0n ? "is-peak" : ""}
                style={
                  {
                    "--bar": `${Math.max(8, (major(bucket.in) / bucketPeak) * 100)}%`,
                  } as React.CSSProperties
                }
                title={`${shortDate(bucket.from)}: ${formatMinorAmount(bucket.in.toString(), currency)}`}
              >
                {index === busiest && bucket.in > 0n && (
                  <span className="yh-bar-tip">{shortDate(bucket.from)}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="notice">
        <strong>Payments are active in test mode.</strong> New orders start unpaid, and stock is
        decremented when a payment succeeds.
      </section>
    </CoreScreen>
  );
}
