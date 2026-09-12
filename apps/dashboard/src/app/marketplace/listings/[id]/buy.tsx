"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function MarketplaceBuy({
  listingId,
  variants,
}: {
  listingId: string;
  variants: { id: string; title: string; available: boolean }[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants.find((v) => v.available)?.id ?? "");
  const [message, setMessage] = useState("");
  async function buy() {
    setMessage("Starting secure checkout…");
    const response = await fetch(`/v1/public/marketplace/listings/${listingId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        variant_id: variantId,
        quantity: 1,
        idempotency_key: crypto.randomUUID(),
      }),
    });
    const body = (await response.json()) as {
      checkout_session?: { checkout_url?: string };
      error?: { message?: string };
    };
    if (!response.ok || !body.checkout_session?.checkout_url) {
      setMessage(body.error?.message ?? "Checkout is unavailable.");
      return;
    }
    router.push(body.checkout_session.checkout_url);
  }
  return (
    <div className="store-buy">
      <label htmlFor="market-variant">Choose an option</label>
      <select id="market-variant" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
        {variants.map((v) => (
          <option key={v.id} value={v.id} disabled={!v.available}>
            {v.title}
            {v.available ? "" : " · unavailable"}
          </option>
        ))}
      </select>
      <button type="button" disabled={!variantId} onClick={() => void buy()}>
        Buy from {"this merchant"}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
