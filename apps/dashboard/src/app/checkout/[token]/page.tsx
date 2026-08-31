import { notFound } from "next/navigation";
import { getPublicCheckout } from "@yinne/checkout";
import { formatMinorAmount } from "../../../lib/money";
import { CheckoutForm } from "./checkout-form";
export const dynamic = "force-dynamic";
export default async function HostedCheckout({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let checkout;
  try {
    checkout = await getPublicCheckout(token);
  } catch {
    notFound();
  }
  return (
    <main className="public-shell">
      <section className="public-card">
        <p className="eyebrow">Yinne hosted checkout · Test mode</p>
        <h1>Complete your payment</h1>
        <p className="public-total">{formatMinorAmount(checkout.amount, checkout.currency)}</p>
        <ul className="public-items">
          {checkout.items.map((item) => (
            <li key={item.id}>
              <span>
                {item.description}
                {item.variant_title ? ` — ${item.variant_title}` : ""} × {item.quantity}
              </span>
              <strong>{formatMinorAmount(item.total_amount, item.currency)}</strong>
            </li>
          ))}
        </ul>
        <p>
          Session status: <strong>{checkout.status}</strong> · Expires{" "}
          {new Date(checkout.expires_at).toLocaleString("en-NG")}
        </p>
        {checkout.status === "open" ? (
          <CheckoutForm token={token} capture={checkout.customer_capture} />
        ) : (
          <div role="status" className="public-result">
            <h2>{checkout.status}</h2>
            <p>
              {checkout.status === "processing"
                ? "Payment confirmation is still processing."
                : "This checkout can no longer accept a payment."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
