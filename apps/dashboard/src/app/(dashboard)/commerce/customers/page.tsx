import Link from "next/link";
import { Button, EmptyState, Input, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCustomers } from "@yinne/commerce";
import { activeUserContext } from "../../../../lib/context";
import { createCustomerAction } from "../../actions";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const customers = await listCustomers(await activeUserContext(createRequestId()), {
    limit: 100,
    ...(search ? { search } : {}),
  });
  return (
    <>
      <PageHeader
        title="Customers"
        description="Organization-owned customer records. Contact details follow the customers:pii_read permission."
      />
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Add customer</h2>
        <form action={createCustomerAction} className="form form-inline">
          <div className="form-row">
            <label htmlFor="customer-name">Name</label>
            <Input id="customer-name" name="name" required maxLength={160} />
          </div>
          <div className="form-row">
            <label htmlFor="customer-email">Email</label>
            <Input id="customer-email" name="email" type="email" />
          </div>
          <div className="form-row">
            <label htmlFor="customer-phone">Phone</label>
            <Input id="customer-phone" name="phone" />
          </div>
          <Button type="submit">Add customer</Button>
        </form>
      </section>
      <form className="filter-bar">
        <Input
          name="search"
          defaultValue={search}
          placeholder="Search name, email, or reference"
          aria-label="Search customers"
        />
        <Button type="submit" className="button-secondary">
          Search
        </Button>
      </form>
      {!customers.data.length ? (
        <EmptyState
          title="No customers yet"
          description="Add the first customer to begin an order."
        />
      ) : (
        <Table label="Customers">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {customers.data.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link href={`/commerce/customers/${customer.id}`}>
                    <strong>{customer.name}</strong>
                  </Link>
                </td>
                <td>{customer.pii_redacted ? "Restricted" : (customer.email ?? "—")}</td>
                <td>{customer.pii_redacted ? "Restricted" : (customer.phone ?? "—")}</td>
                <td>{new Date(customer.created_at).toLocaleDateString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
