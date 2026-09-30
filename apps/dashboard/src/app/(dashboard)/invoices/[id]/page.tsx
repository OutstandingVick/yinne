import { revalidatePath } from "next/cache";
import {
  ActionGroup,
  Button,
  CoreScreen,
  DetailGrid,
  DetailItem,
  FinancialAmount,
  PageHeader,
  StatusBadge,
  Table,
} from "@yinne/ui";
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
    <CoreScreen className="module-screen">
      <PageHeader
        title={invoice.invoice_number ?? "Draft invoice"}
        description="Financial fields freeze when issued; payment evidence comes from Payments Core."
      />
      <DetailGrid className="module-summary">
        <DetailItem label="Status">
          <StatusBadge tone={invoice.status === "paid" ? "success" : "warning"}>
            {invoice.display_status}
          </StatusBadge>
        </DetailItem>
        <DetailItem label="Total">
          <FinancialAmount prominent>
            {formatMinorAmount(invoice.total_amount, invoice.currency)}
          </FinancialAmount>
        </DetailItem>
        <DetailItem label="Due">
          {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "On receipt"}
        </DetailItem>
        <DetailItem label="Payment">{invoice.payment_id ?? "Not paid"}</DetailItem>
      </DetailGrid>
      <Table label="Invoice items" density="compact">
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
              <td>
                <FinancialAmount>
                  {formatMinorAmount(item.unit_amount, item.currency)}
                </FinancialAmount>
              </td>
              <td>
                <FinancialAmount>
                  {formatMinorAmount(item.total_amount, item.currency)}
                </FinancialAmount>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <ActionGroup className="module-actions">
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
      </ActionGroup>
    </CoreScreen>
  );
}
