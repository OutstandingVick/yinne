import { Badge, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getEmployee } from "@yinne/operations";
import { activeUserContext } from "../../../../../lib/context";
export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const employee = await getEmployee(await activeUserContext(createRequestId()), (await params).id);
  return (
    <>
      <PageHeader title={employee.name} description={employee.email} />
      <section className="card">
        <Badge tone={employee.status === "active" ? "success" : "warning"}>{employee.status}</Badge>
        <h2>Access</h2>
        <ul>
          {employee.assignments.map((a) => (
            <li key={`${a.role}-${a.scope_id}`}>
              {a.role} · {a.location_name ?? a.scope_type}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
