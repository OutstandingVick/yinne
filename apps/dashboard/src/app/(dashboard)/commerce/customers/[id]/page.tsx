import { notFound } from "next/navigation";
import { CoreScreen, DetailGrid, DetailItem, PageHeader, StatusBadge } from "@yinne/ui";
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
      <CoreScreen>
        <PageHeader title={customer.name} description="Customer detail" />
        <DetailGrid>
          <DetailItem label="Email">
            <p>{customer.pii_redacted ? "Restricted" : (customer.email ?? "—")}</p>
          </DetailItem>
          <DetailItem label="Phone">
            <p>{customer.pii_redacted ? "Restricted" : (customer.phone ?? "—")}</p>
          </DetailItem>
          <DetailItem label="External reference">
            <p>{customer.external_ref ?? "—"}</p>
          </DetailItem>
          <div className="detail-item">
            <StatusBadge tone={customer.pii_redacted ? "warning" : "success"}>
              {customer.pii_redacted ? "PII restricted" : "PII visible"}
            </StatusBadge>
          </div>
        </DetailGrid>
      </CoreScreen>
    );
  } catch {
    notFound();
  }
}
