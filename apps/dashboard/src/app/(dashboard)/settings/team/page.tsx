import { CoreScreen, PageHeader, SectionCard, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listMembers } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";
import { InviteForm } from "./invite-form";

export default async function TeamPage() {
  const context = await activeUserContext(createRequestId());
  const members = await listMembers(context);
  return (
    <CoreScreen className="operations-screen">
      <PageHeader
        title="Team"
        description="Membership, predefined roles, and explicit scopes are enforced centrally."
      />
      <SectionCard>
        <h2>Invite a member</h2>
        <InviteForm />
      </SectionCard>
      <Table label="Organization members" density="compact">
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
                <StatusBadge tone={member.status === "active" ? "success" : "warning"}>
                  {member.status}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </CoreScreen>
  );
}
