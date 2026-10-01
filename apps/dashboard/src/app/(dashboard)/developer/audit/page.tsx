import { CoreScreen, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listAuditLogs } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";

export default async function AuditPage() {
  const context = await activeUserContext(createRequestId());
  const logs = await listAuditLogs(context, 50);
  return (
    <CoreScreen className="developer-screen">
      <PageHeader
        title="Audit logs"
        description="Append-only accountability records with redacted metadata. Audit logs are not an event bus."
      />
      <div className="technical-table">
        <Table label="Audit log" density="compact">
          <thead>
            <tr>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Request</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  <strong className="technical-primary">{log.action}</strong>
                </td>
                <td>
                  {log.actorType}
                  <br />
                  <span className="technical-value">{log.actorId}</span>
                </td>
                <td>
                  {log.targetType}
                  <br />
                  <span className="technical-value">{log.targetId}</span>
                </td>
                <td className="technical-value">{log.requestId}</td>
                <td>{log.createdAt.toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </CoreScreen>
  );
}
