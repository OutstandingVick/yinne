import Link from "next/link";
import { Badge, Button, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listInvoices } from "@yinne/invoicing";
import { formatMinorAmount } from "../../../lib/money";
import { activeUserContext } from "../../../lib/context";
export default async function InvoicesPage() {
  const rows = await listInvoices(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <>
      <PageHeader
        title="Invoices"
        description="Customer receivables collected through canonical Checkout and Payments."
        actions={
          <Link href="/invoices/new">
            <Button>Create invoice</Button>
          </Link>
        }
      />
      {!rows.data.length ? (
        <EmptyState title="No invoices" description="Create a draft Invoice to bill a Customer." />
      ) : (
        <Table label="Invoices">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/invoices/${row.id}`}>{row.invoice_number ?? "Draft"}</Link>
                </td>
                <td>{formatMinorAmount(row.total_amount, row.currency)}</td>
                <td>
                  <Badge
                    tone={
                      row.status === "paid"
                        ? "success"
                        : row.status === "void"
                          ? "neutral"
                          : "warning"
                    }
                  >
                    {row.display_status}
                  </Badge>
                </td>
                <td>{row.due_at ? new Date(row.due_at).toLocaleDateString() : "On receipt"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
