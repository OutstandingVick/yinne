import Link from "next/link";
import { Badge, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listEmployees } from "@yinne/operations";
import { activeUserContext } from "../../../../lib/context";
export default async function EmployeesPage() {
  const rows = await listEmployees(await activeUserContext(createRequestId()));
  return (
    <>
      <PageHeader
        title="Employees"
        description="Organization members with operational profiles and centrally scoped roles."
      />
      {!rows.length ? (
        <EmptyState title="No employees" description="Invite members from Team." />
      ) : (
        <Table label="Employees">
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
                  <Badge tone={row.status === "active" ? "success" : "warning"}>{row.status}</Badge>
                </td>
                <td>
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
    </>
  );
}
