"use client";

import { useActionState } from "react";
import { Button, Input } from "@yinne/ui";
import { authenticate } from "./actions";

export function SignInForm() {
  const [error, action, pending] = useActionState(authenticate, undefined);
  return (
    <form className="form" action={action}>
      <div className="form-row">
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="owner@acme.test"
        />
      </div>
      <div className="form-row">
        <label htmlFor="password">Password</label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
