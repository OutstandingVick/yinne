"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Variant = {
  id: string;
  title: string;
  unit_amount: string;
  currency: string;
  availability: string;
  product: string;
};
type Item = { variant_id: string; quantity: number };

export function Cart({ storeSlug, variants }: { storeSlug: string; variants: Variant[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = `yinne-cart:${storeSlug}`;
  useEffect(() => setItems(JSON.parse(localStorage.getItem(key) ?? "[]") as Item[]), [key]);
  const rows = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          variant: variants.find((variant) => variant.id === item.variant_id),
        }))
        .filter((item) => item.variant),
    [items, variants],
  );
  function save(next: Item[]) {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
  }
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/v1/public/stores/${storeSlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, idempotency_key: crypto.randomUUID() + crypto.randomUUID() }),
      });
      const body = (await response.json()) as {
        checkout_session?: { checkout_url?: string };
        error?: { message?: string };
      };
      if (!response.ok || !body.checkout_session?.checkout_url)
        throw new Error(body.error?.message ?? "Checkout could not start.");
      localStorage.removeItem(key);
      router.push(body.checkout_session.checkout_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not start.");
      setBusy(false);
    }
  }
  if (!rows.length)
    return (
      <div className="store-empty">
        <h1>Your cart is empty</h1>
        <p>Add a product to begin checkout.</p>
      </div>
    );
  return (
    <section>
      <h1>Your cart</h1>
      <ul className="cart-list">
        {rows.map((row) => (
          <li key={row.variant_id}>
            <div>
              <strong>{row.variant!.product}</strong>
              <span>{row.variant!.title}</span>
            </div>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max="100"
                value={row.quantity}
                onChange={(event) =>
                  save(
                    items.map((item) =>
                      item.variant_id === row.variant_id
                        ? { ...item, quantity: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="link-button"
              onClick={() => save(items.filter((item) => item.variant_id !== row.variant_id))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="store-checkout"
        type="button"
        disabled={busy}
        onClick={() => void checkout()}
      >
        {busy ? "Starting secure checkout…" : "Continue to secure checkout"}
      </button>
      <p>
        <small>
          Prices and availability are checked again before checkout. Your cart stays here if
          anything changed.
        </small>
      </p>
    </section>
  );
}
