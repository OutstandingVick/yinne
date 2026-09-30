import { CoreScreen, DetailGrid, DetailItem, PageHeader, StatusBadge } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getLocation } from "@yinne/operations";
import { activeUserContext } from "../../../../../lib/context";
export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const location = await getLocation(await activeUserContext(createRequestId()), (await params).id);
  return (
    <CoreScreen className="operations-screen">
      <PageHeader
        title={location.name}
        description="Location identity remains stable across historical Inventory and Orders."
      />
      <DetailGrid>
        <DetailItem label="Status">
            <StatusBadge tone={location.status === "active" ? "success" : "warning"}>
              {location.status}
            </StatusBadge>
        </DetailItem>
        <DetailItem label="Code">{location.code}</DetailItem>
        <DetailItem label="Type">{location.type}</DetailItem>
        <DetailItem label="Timezone">{location.timezone}</DetailItem>
      </DetailGrid>
    </CoreScreen>
  );
}
