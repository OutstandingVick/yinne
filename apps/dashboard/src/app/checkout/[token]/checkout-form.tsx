"use client";
import { useState } from "react";
export function CheckoutForm({
  token,
  capture,
}: {
  token: string;
  capture: { name: boolean; email: boolean; phone: boolean };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/v1/public/checkout/${token}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID() + crypto.randomUUID(),
        },
        body: JSON.stringify({
          customer: {
            name: form.get("name") || undefined,
            email: form.get("email") || undefined,
            phone: form.get("phone") || undefined,
          },
          confirmation: { mock_scenario: form.get("scenario") },
        }),
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        checkout_session?: { status?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || "Checkout could not be confirmed.");
      if (!body.checkout_session?.status) throw new Error("Checkout returned an invalid response.");
      setDone(body.checkout_session.status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be confirmed.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div role="status" className="public-result">
        <h2>Payment {done}</h2>
        <p>
          {done === "completed"
            ? "Your payment was successful."
            : "Your payment is processing. You can safely refresh this page."}
        </p>
      </div>
    );
  return (
    <form onSubmit={(event) => void submit(event)} className="public-form">
      {error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : null}
      {capture.name ? (
        <label>
          Full name
          <input name="name" required autoComplete="name" />
        </label>
      ) : null}
      {capture.email ? (
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
      ) : null}
      {capture.phone ? (
        <label>
          Phone
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
      ) : null}
      <label>
        Test outcome
        <select name="scenario" defaultValue="success">
          <option value="success">Successful payment</option>
          <option value="pending:then_success">Pending payment</option>
          <option value="failure:declined">Declined payment</option>
        </select>
      </label>
      <button disabled={busy} type="submit">
        {busy ? "Processing…" : "Pay securely"}
      </button>
      <small>Test mode — no real payment method or money is used.</small>
    </form>
  );
}
