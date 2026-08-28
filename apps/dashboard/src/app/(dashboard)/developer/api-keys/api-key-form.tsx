"use client";

import { useActionState } from "react";
import { Button, Checkbox, Input } from "@yinne/ui";
import { createApiKeyAction, type ActionState } from "../../actions";

const initial: ActionState = { ok: false };
const scopes = [
  "organization:read",
  "members:read",
  "api_keys:read",
  "events:read",
  "audit_logs:read",
] as const;

export function ApiKeyForm() {
  const [state, action, pending] = useActionState(createApiKeyAction, initial);
  return (
    <form className="form" action={action}>
      <div className="form-row">
        <label htmlFor="key-name">Key name</label>
        <Input id="key-name" name="name" required minLength={2} placeholder="Backend integration" />
      </div>
      <fieldset className="form-row">
        <legend className="label">Scopes</legend>
        {scopes.map((scope) => (
          <label key={scope} style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <Checkbox name="scopes" value={scope} defaultChecked={scope === "organization:read"} />{" "}
            <span className="mono">{scope}</span>
          </label>
        ))}
      </fieldset>
      {state.message ? (
        <div className={state.secret ? "secret-panel" : "notice"} role="status">
          <strong>{state.message}</strong>
          {state.secret ? (
            <>
              <p className="mono">{state.secret}</p>
              <p>This value is not stored and cannot be recovered.</p>
            </>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create test key"}
      </Button>
    </form>
  );
}
