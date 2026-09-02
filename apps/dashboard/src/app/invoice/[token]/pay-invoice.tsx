"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function PayInvoice({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/v1/public/invoices/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotency_key: crypto.randomUUID() + crypto.randomUUID() }),
      });
      const body = (await response.json()) as {
        checkout_session?: { checkout_url?: string | null };
        error?: { message?: string };
      };
      if (!response.ok || !body.checkout_session?.checkout_url)
        throw new Error(body.error?.message ?? "Invoice checkout could not start.");
      router.push(body.checkout_session.checkout_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invoice checkout could not start.");
      setBusy(false);
    }
  }
  return (
    <>
      {error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : null}
      <button className="store-checkout" disabled={busy} onClick={() => void pay()}>
        {busy ? "Starting checkout…" : "Pay invoice"}
      </button>
    </>
  );
}
