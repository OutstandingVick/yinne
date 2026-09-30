import { CoreScreen, EmptyState, PageHeader, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listProviderAccounts } from "@yinne/payments";
import { activeUserContext } from "../../../../lib/context";
export default async function ProvidersPage() {
  const rows = await listProviderAccounts(await activeUserContext(createRequestId()), {
    limit: 50,
  });
  return (
    <CoreScreen className="operations-screen">
      <PageHeader
        title="Providers"
        description="Organization payment execution configuration. Mock Provider is test-only and needs no credentials."
      />
      {!rows.data.length ? (
        <EmptyState
          title="No providers"
          description="Run the repeatable seed to install the test Mock Provider account."
        />
      ) : (
        <Table label="Provider accounts" density="compact">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Label</th>
              <th>Environment</th>
              <th>Capabilities</th>
              <th>Status</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td>{row.provider}</td>
                <td>{row.label}</td>
                <td>
                  <StatusBadge tone={row.environment === "test" ? "warning" : "info"}>{row.environment}</StatusBadge>
                </td>
                <td className="provider-capabilities">{row.capabilities.join(", ")}</td>
                <td>
                  <StatusBadge tone={row.status === "enabled" ? "success" : "danger"}>{row.status}</StatusBadge>
                </td>
                <td>{row.is_default ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CoreScreen>
  );
}
