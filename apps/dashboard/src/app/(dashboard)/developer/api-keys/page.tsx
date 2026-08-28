import { Badge, Button, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listApiKeys } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";
import { revokeApiKeyAction } from "../../actions";
import { ApiKeyForm } from "./api-key-form";

export default async function ApiKeysPage() {
  const context = await activeUserContext(createRequestId());
  const keys = await listApiKeys(context);
  return (
    <>
      <PageHeader
        title="API keys"
        description="Secrets are shown once, keyed-hashed at rest, scoped, revocable, and isolated by test/live environment."
      />
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Create API key</h2>
        <ApiKeyForm />
      </section>
      <Table label="API keys">
        <thead>
          <tr>
            <th>Name / prefix</th>
            <th>Environment</th>
            <th>Scopes</th>
            <th>Status</th>
            <th>Last used</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id}>
              <td>
                <strong>{key.name}</strong>
                <br />
                <span className="mono">{key.prefix}</span>
              </td>
              <td>
                <Badge tone="warning">{key.environment}</Badge>
              </td>
              <td>
                {key.scopes.map((scope) => (
                  <div className="mono" key={scope}>
                    {scope}
                  </div>
                ))}
              </td>
              <td>
                <Badge tone={key.status === "active" ? "success" : "danger"}>{key.status}</Badge>
              </td>
              <td>{key.lastUsedAt?.toISOString() ?? "Never"}</td>
              <td>
                {key.status === "active" ? (
                  <form action={revokeApiKeyAction}>
                    <input type="hidden" name="id" value={key.id} />
                    <Button className="button-danger" type="submit">
                      Revoke
                    </Button>
                  </form>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
