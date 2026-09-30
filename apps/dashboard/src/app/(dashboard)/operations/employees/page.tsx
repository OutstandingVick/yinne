import Link from "next/link";
import { CoreScreen, EmptyState, PageHeader, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listEmployees } from "@yinne/operations";
import { activeUserContext } from "../../../../lib/context";
export default async function EmployeesPage() {
  const rows = await listEmployees(await activeUserContext(createRequestId()));
  return (
    <CoreScreen className="operations-screen">
      <PageHeader
        title="Employees"
        description="Organization members with operational profiles and centrally scoped roles."
      />
      {!rows.length ? (
        <EmptyState title="No employees" description="Invite members from Team." />
      ) : (
        <Table label="Employees" density="compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Location access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/operations/employees/${row.id}`}>{row.name}</Link>
                  <br />
                  <small>{row.email}</small>
                </td>
                <td>
                  <StatusBadge tone={row.status === "active" ? "success" : "warning"}>
                    {row.status}
                  </StatusBadge>
                </td>
                <td className="scope-cell">
                  {row.assignments
                    .filter((a) => a.scope_type === "location")
                    .map((a) => a.location_name)
                    .filter(Boolean)
                    .join(", ") || "Organization/merchant scope"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CoreScreen>
  );
}
