"use client";

import { useActionState } from "react";
import { Button, Input, Select } from "@yinne/ui";
import { inviteMemberAction, type ActionState } from "../../actions";

const initial: ActionState = { ok: false };

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMemberAction, initial);
  return (
    <form className="form" action={action}>
      <div className="form-row">
        <label htmlFor="invite-email">Email</label>
        <Input id="invite-email" name="email" type="email" required />
      </div>
      <div className="form-row">
        <label htmlFor="invite-role">Role</label>
        <Select id="invite-role" name="role" defaultValue="staff">
          <option value="admin">Admin</option>
          <option value="finance">Finance</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="analyst">Analyst</option>
          <option value="developer">Developer</option>
        </Select>
        <span className="help">
          Phase 1 invitations from this page are organization-scoped. Location assignment follows in
          the location operations phase.
        </span>
      </div>
      {state.message ? (
        <p className="notice" role="status">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite member"}
      </Button>
    </form>
  );
}
