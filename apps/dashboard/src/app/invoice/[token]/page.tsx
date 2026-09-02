import { notFound } from "next/navigation";
import { getPublicInvoice } from "@yinne/invoicing";
import { formatMinorAmount } from "../../../lib/money";
import { PayInvoice } from "./pay-invoice";
export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false } };
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let invoice;
  try {
    invoice = await getPublicInvoice(token);
  } catch {
    notFound();
  }
  return (
    <main className="public-shell">
      <section className="public-card">
        <p className="eyebrow">Invoice · Test mode</p>
        <h1>{invoice.merchant_name}</h1>
        <div className="detail-grid">
          <div>
            <small>Invoice</small>
            <p>{invoice.invoice_number}</p>
          </div>
          <div>
            <small>Status</small>
            <p>{invoice.status}</p>
          </div>
          <div>
            <small>Issued</small>
            <p>{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <small>Due</small>
            <p>{invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "On receipt"}</p>
          </div>
        </div>
        <ul className="public-items">
          {invoice.items.map((item) => (
            <li key={item.id}>
              <span>
                {item.description} × {item.quantity}
              </span>
              <strong>{formatMinorAmount(item.total_amount, item.currency)}</strong>
            </li>
          ))}
        </ul>
        <p className="public-total">{formatMinorAmount(invoice.total_amount, invoice.currency)}</p>
        {invoice.payable ? (
          <PayInvoice token={token} />
        ) : (
          <div role="status" className="public-result">
            <h2>Invoice paid</h2>
            <p>Payment has been reconciled successfully.</p>
          </div>
        )}
        <small>
          Yinne uses canonical Checkout and Payments. No payment credentials are stored here.
        </small>
      </section>
    </main>
  );
}
