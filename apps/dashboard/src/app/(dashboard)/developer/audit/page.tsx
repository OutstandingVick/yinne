import { PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listAuditLogs } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";

export default async function AuditPage() {
  const context = await activeUserContext(createRequestId());
  const logs = await listAuditLogs(context, 50);
  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Append-only accountability records with redacted metadata. Audit logs are not an event bus."
      />
      <Table label="Audit log">
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
              <td>{log.action}</td>
              <td>
                {log.actorType}
                <br />
                <span className="mono">{log.actorId}</span>
              </td>
              <td>
                {log.targetType}
                <br />
                <span className="mono">{log.targetId}</span>
              </td>
              <td className="mono">{log.requestId}</td>
              <td>{log.createdAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
