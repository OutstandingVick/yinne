"use client";
import { useState } from "react";
export function PaymentLinkForm({ token, flexible }: { token: string; flexible: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/v1/public/payment-links/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: flexible ? form.get("amount") : undefined,
          idempotency_key: crypto.randomUUID() + crypto.randomUUID(),
        }),
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        checkout_session?: { checkout_url?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || "Checkout could not be opened.");
      if (!body.checkout_session?.checkout_url)
        throw new Error("Payment Link returned an invalid response.");
      location.assign(body.checkout_session.checkout_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be opened.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="public-form">
      {error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : null}
      {flexible ? (
        <label>
          Amount in minor units
          <input name="amount" inputMode="numeric" pattern="[1-9][0-9]*" required />
        </label>
      ) : null}
      <button disabled={busy}>{busy ? "Opening checkout…" : "Continue to checkout"}</button>
    </form>
  );
}
