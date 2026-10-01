import { CoreScreen, PageHeader, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listEvents } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";

export default async function EventsPage() {
  const context = await activeUserContext(createRequestId());
  const events = await listEvents(context, 50);
  return (
    <CoreScreen className="developer-screen">
      <PageHeader
        title="Domain events"
        description="Immutable platform facts. These are not provider events, public webhook deliveries, or audit logs."
      />
      <div className="technical-table"><Table label="Domain events" density="compact">
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
                <strong className="technical-primary">{event.type}</strong>
                <br />
                <span className="technical-value technical-secondary">{event.id}</span>
              </td>
              <td>
                {event.aggregateType} v{event.aggregateVersion}
                <br />
                <span className="technical-value technical-secondary">{event.aggregateId}</span>
              </td>
              <td>
                <StatusBadge tone={event.environment === "test" ? "warning" : "info"}>{event.environment}</StatusBadge>
              </td>
              <td>{event.occurredAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </Table></div>
    </CoreScreen>
  );
}
