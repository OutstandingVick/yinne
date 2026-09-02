import { Badge, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getLocation } from "@yinne/operations";
import { activeUserContext } from "../../../../../lib/context";
export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const location = await getLocation(await activeUserContext(createRequestId()), (await params).id);
  return (
    <>
      <PageHeader
        title={location.name}
        description="Location identity remains stable across historical Inventory and Orders."
      />
      <section className="card detail-grid">
        <div>
          <span className="label">Status</span>
          <p>
            <Badge tone={location.status === "active" ? "success" : "warning"}>
              {location.status}
            </Badge>
          </p>
        </div>
        <div>
          <span className="label">Code</span>
          <p>{location.code}</p>
        </div>
        <div>
          <span className="label">Type</span>
          <p>{location.type}</p>
        </div>
        <div>
          <span className="label">Timezone</span>
          <p>{location.timezone}</p>
        </div>
      </section>
    </>
  );
}
