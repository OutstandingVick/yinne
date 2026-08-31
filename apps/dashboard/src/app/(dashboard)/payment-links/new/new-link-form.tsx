"use client";
import { useState } from "react";
export function NewLinkForm({
  options,
}: {
  options: {
    locations: { id: string; merchant_id: string; name: string }[];
    variants: {
      id: string;
      product_name: string;
      title: string;
      currency: string;
      unit_amount: string;
    }[];
  };
}) {
  const [kind, setKind] = useState("fixed");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedLocation = options.locations.find(
      (value) => value.id === form.get("location_id"),
    )!;
    const base = {
      kind,
      merchant_id: selectedLocation.merchant_id,
      location_id: selectedLocation.id,
      name: form.get("name"),
      description: form.get("description") || undefined,
      currency: form.get("currency"),
      customer_capture: { name: true, email: true, phone: false },
    };
    const input =
      kind === "product"
        ? { ...base, kind: "product", variant_id: form.get("variant_id"), quantity: 1 }
        : kind === "fixed"
          ? { ...base, kind: "fixed", amount: form.get("amount") }
          : {
              ...base,
              kind: "flexible",
              minimum_amount: form.get("minimum_amount"),
              maximum_amount: form.get("maximum_amount") || undefined,
            };
    const response = await fetch("/v1/payment-links", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID() + crypto.randomUUID(),
      },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as {
      error?: { message?: string };
      payment_link?: { payment_url?: string };
    };
    if (!response.ok) {
      setError(body.error?.message || "Could not create link.");
      return;
    }
    if (!body.payment_link?.payment_url) {
      setError("The API returned an invalid Payment Link response.");
      return;
    }
    setCreated(window.location.origin + body.payment_link.payment_url);
  }
  if (created)
    return (
      <section className="panel">
        <h2>Payment Link created</h2>
        <p>Copy this URL now. For security, the capability token is shown only once.</p>
        <input readOnly value={created} onFocus={(event) => event.currentTarget.select()} />
      </section>
    );
  return (
    <form onSubmit={(event) => void submit(event)} className="form-grid">
      <label>
        Name
        <input name="name" required maxLength={160} />
      </label>
      <label>
        Description
        <input name="description" maxLength={2000} />
      </label>
      <label>
        Location
        <select name="location_id">
          {options.locations.map((location) => (
            <option value={location.id} key={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kind
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="fixed">Fixed amount</option>
          <option value="product">Product</option>
          <option value="flexible">Flexible amount</option>
        </select>
      </label>
      {kind === "product" ? (
        <label>
          Product variant
          <select
            name="variant_id"
            onChange={(event) => {
              const variant = options.variants.find((value) => value.id === event.target.value);
              const currency = document.querySelector<HTMLInputElement>("[name=currency]");
              if (variant && currency) currency.value = variant.currency;
            }}
          >
            {options.variants.map((variant) => (
              <option value={variant.id} key={variant.id}>
                {variant.product_name} — {variant.title} ({variant.unit_amount} {variant.currency})
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {kind === "fixed" ? (
        <label>
          Amount in minor units
          <input name="amount" required pattern="[1-9][0-9]*" />
        </label>
      ) : null}
      {kind === "flexible" ? (
        <>
          <label>
            Minimum amount
            <input name="minimum_amount" required pattern="[1-9][0-9]*" />
          </label>
          <label>
            Maximum amount (optional)
            <input name="maximum_amount" pattern="[1-9][0-9]*" />
          </label>
        </>
      ) : null}
      <label>
        Currency
        <input
          name="currency"
          defaultValue={options.variants[0]?.currency ?? "NGN"}
          pattern="[A-Z]{3}"
          required
        />
      </label>
      {error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : null}
      <button type="submit">Create Payment Link</button>
    </form>
  );
}
