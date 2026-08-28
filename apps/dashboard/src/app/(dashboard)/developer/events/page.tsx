import { Badge, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listEvents } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";

export default async function EventsPage() {
  const context = await activeUserContext(createRequestId());
  const events = await listEvents(context, 50);
  return (
    <>
      <PageHeader
        title="Domain events"
        description="Immutable platform facts. These are not provider events, public webhook deliveries, or audit logs."
      />
      <Table label="Domain events">
        <thead>
          <tr>
            <th>Event</th>
            <th>Aggregate</th>
            <th>Environment</th>
            <th>Occurred</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <strong>{event.type}</strong>
                <br />
                <span className="mono">{event.id}</span>
              </td>
              <td>
                {event.aggregateType} v{event.aggregateVersion}
                <br />
                <span className="mono">{event.aggregateId}</span>
              </td>
              <td>
                <Badge tone="warning">{event.environment}</Badge>
              </td>
              <td>{event.occurredAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
