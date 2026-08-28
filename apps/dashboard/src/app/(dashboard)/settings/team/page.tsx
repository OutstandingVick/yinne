import { Badge, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listMembers } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";
import { InviteForm } from "./invite-form";

export default async function TeamPage() {
  const context = await activeUserContext(createRequestId());
  const members = await listMembers(context);
  return (
    <>
      <PageHeader
        title="Team"
        description="Membership, predefined roles, and explicit scopes are enforced centrally."
      />
      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Invite a member</h2>
        <InviteForm />
      </div>
      <Table label="Organization members">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Scope</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                <strong>{member.name}</strong>
                <br />
                <span className="help">{member.email}</span>
              </td>
              <td>{member.role ?? "Unassigned"}</td>
              <td>
                {member.scopeType ?? "—"}
                <br />
                <span className="mono">{member.scopeId ?? ""}</span>
              </td>
              <td>
                <Badge tone={member.status === "active" ? "success" : "warning"}>
                  {member.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
