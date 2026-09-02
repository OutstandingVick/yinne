import Link from "next/link";
import { Badge, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listLocations } from "@yinne/operations";
import { activeUserContext } from "../../../../lib/context";
export default async function LocationsPage() {
  const rows = await listLocations(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <>
      <PageHeader
        title="Locations"
        description="Canonical operational nodes for inventory, orders, staff scope, Storefront, and Invoices."
      />
      {!rows.data.length ? (
        <EmptyState
          title="No Locations"
          description="Create an operational Location through the API."
        />
      ) : (
        <Table label="Locations">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Type</th>
              <th>Status</th>
              <th>Timezone</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/operations/locations/${row.id}`}>{row.name}</Link>
                </td>
                <td>{row.code}</td>
                <td>{row.type}</td>
                <td>
                  <Badge tone={row.status === "active" ? "success" : "warning"}>{row.status}</Badge>
                </td>
                <td>{row.timezone}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
