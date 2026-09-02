import { revalidatePath } from "next/cache";
import { Badge, Button, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getInvoice, issueInvoice, voidInvoice } from "@yinne/invoicing";
import { formatMinorAmount } from "../../../../lib/money";
import { activeUserContext } from "../../../../lib/context";
async function issue(id: string) {
  "use server";
  await issueInvoice(await activeUserContext(createRequestId()), id);
  revalidatePath(`/invoices/${id}`);
}
async function voidAction(id: string) {
  "use server";
  await voidInvoice(await activeUserContext(createRequestId()), id);
  revalidatePath(`/invoices/${id}`);
}
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(await activeUserContext(createRequestId()), id);
  return (
    <>
      <PageHeader
        title={invoice.invoice_number ?? "Draft invoice"}
        description="Financial fields freeze when issued; payment evidence comes from Payments Core."
      />
      <section className="card detail-grid">
        <div>
          <span className="label">Status</span>
          <p>
            <Badge tone={invoice.status === "paid" ? "success" : "warning"}>
              {invoice.display_status}
            </Badge>
          </p>
        </div>
        <div>
          <span className="label">Total</span>
          <p>{formatMinorAmount(invoice.total_amount, invoice.currency)}</p>
        </div>
        <div>
          <span className="label">Due</span>
          <p>{invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "On receipt"}</p>
        </div>
        <div>
          <span className="label">Payment</span>
          <p>{invoice.payment_id ?? "Not paid"}</p>
        </div>
      </section>
      <Table label="Invoice items">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit amount</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{formatMinorAmount(item.unit_amount, item.currency)}</td>
              <td>{formatMinorAmount(item.total_amount, item.currency)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="action-row">
        {invoice.status === "draft" ? (
          <form action={issue.bind(null, id)}>
            <Button type="submit">Issue invoice</Button>
          </form>
        ) : null}
        {["draft", "open"].includes(invoice.status) ? (
          <form action={voidAction.bind(null, id)}>
            <Button className="button-secondary" type="submit">
              Void invoice
            </Button>
          </form>
        ) : null}
      </div>
    </>
  );
}
