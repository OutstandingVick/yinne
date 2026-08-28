import { notFound } from "next/navigation";
import { Badge, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getCustomer } from "@yinne/commerce";
import { activeUserContext } from "../../../../../lib/context";
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const customer = await getCustomer(
      await activeUserContext(createRequestId()),
      (await params).id,
    );
    return (
      <>
        <PageHeader title={customer.name} description="Customer detail" />
        <section className="card detail-grid">
          <div>
            <span className="label">Email</span>
            <p>{customer.pii_redacted ? "Restricted" : (customer.email ?? "—")}</p>
          </div>
          <div>
            <span className="label">Phone</span>
            <p>{customer.pii_redacted ? "Restricted" : (customer.phone ?? "—")}</p>
          </div>
          <div>
            <span className="label">External reference</span>
            <p>{customer.external_ref ?? "—"}</p>
          </div>
          <div>
            <Badge tone={customer.pii_redacted ? "warning" : "success"}>
              {customer.pii_redacted ? "PII restricted" : "PII visible"}
            </Badge>
          </div>
        </section>
      </>
    );
  } catch {
    notFound();
  }
}
