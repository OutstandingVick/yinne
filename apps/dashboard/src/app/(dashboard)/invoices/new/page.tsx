import { redirect } from "next/navigation";
import { Button, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { createInvoiceSchema } from "@yinne/contracts";
import { createInvoice } from "@yinne/invoicing";
import { listCustomers } from "@yinne/commerce";
import { listLocations } from "@yinne/operations";
import { merchants, withTenantTransaction } from "@yinne/database";
import { activeUserContext } from "../../../../lib/context";
async function create(formData: FormData) {
  "use server";
  const context = await activeUserContext(createRequestId());
  const input = createInvoiceSchema.parse({
    merchant_id: formData.get("merchant_id"),
    location_id: formData.get("location_id"),
    customer_id: formData.get("customer_id"),
    currency: formData.get("currency"),
    due_at: formData.get("due_at") || null,
    items: [
      {
        description: formData.get("description"),
        quantity: Number(formData.get("quantity")),
        unit_amount: formData.get("unit_amount"),
      },
    ],
  });
  const invoice = await createInvoice(context, input, crypto.randomUUID() + crypto.randomUUID());
  redirect(`/invoices/${(invoice as { id: string }).id}`);
}
export default async function NewInvoicePage() {
  const context = await activeUserContext(createRequestId());
  const [customers, locations, merchantRows] = await Promise.all([
    listCustomers(context, { limit: 100 }),
    listLocations(context, { limit: 100, status: "active" }),
    withTenantTransaction(context.tenant, (tx) => tx.select().from(merchants).limit(20)),
  ]);
  return (
    <>
      <PageHeader
        title="Create invoice"
        description="Amounts are integer minor units and totals are derived on the server."
      />
      <form action={create} className="card form-grid">
        <label>
          Merchant
          <select name="merchant_id" required>
            {merchantRows.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer
          <select name="customer_id" required>
            {customers.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select name="location_id" required>
            {locations.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Currency
          <input name="currency" defaultValue="NGN" pattern="[A-Z]{3}" required />
        </label>
        <label>
          Due date
          <input name="due_at" type="date" />
        </label>
        <label className="full">
          Description
          <input name="description" required />
        </label>
        <label>
          Quantity
          <input name="quantity" type="number" min="1" defaultValue="1" required />
        </label>
        <label>
          Unit amount (minor units)
          <input name="unit_amount" inputMode="numeric" pattern="[1-9][0-9]*" required />
        </label>
        <div className="full">
          <Button type="submit">Save draft</Button>
        </div>
      </form>
    </>
  );
}
