import { notFound } from "next/navigation";
import { getPublicPaymentLink } from "@yinne/checkout";
import { formatMinorAmount } from "../../../lib/money";
import { PaymentLinkForm } from "./payment-link-form";
export const dynamic = "force-dynamic";
export default async function PublicPaymentLink({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let link;
  try {
    link = await getPublicPaymentLink(token);
  } catch {
    notFound();
  }
  return (
    <main className="public-shell">
      <section className="public-card">
        <p className="eyebrow">Yinne payment link · {link.environment} mode</p>
        <h1>{link.name}</h1>
        {link.description ? <p>{link.description}</p> : null}
        {link.amount ? (
          <p className="public-total">{formatMinorAmount(link.amount, link.currency)}</p>
        ) : null}
        {link.kind === "flexible" ? (
          <p>
            Choose an amount from {formatMinorAmount(link.minimum_amount!, link.currency)}
            {link.maximum_amount
              ? ` to ${formatMinorAmount(link.maximum_amount, link.currency)}`
              : " or more"}
            .
          </p>
        ) : null}
        {link.available ? (
          <PaymentLinkForm token={token} flexible={link.kind === "flexible"} />
        ) : (
          <div role="status" className="public-result">
            <h2>Link unavailable</h2>
            <p>This link is inactive, expired, not started, or has reached its usage limit.</p>
          </div>
        )}
        <small>No card details are collected by Yinne.</small>
      </section>
    </main>
  );
}
