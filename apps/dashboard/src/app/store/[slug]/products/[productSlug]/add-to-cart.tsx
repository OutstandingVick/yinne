"use client";

import { useState } from "react";

export function AddToCart({
  storeSlug,
  variants,
}: {
  storeSlug: string;
  variants: { id: string; title: string; availability: string }[];
}) {
  const [variantId, setVariantId] = useState(
    variants.find((item) => item.availability !== "out_of_stock")?.id ?? "",
  );
  const [message, setMessage] = useState("");
  function add() {
    const key = `yinne-cart:${storeSlug}`;
    const current = JSON.parse(localStorage.getItem(key) ?? "[]") as {
      variant_id: string;
      quantity: number;
    }[];
    const existing = current.find((item) => item.variant_id === variantId);
    if (existing) existing.quantity = Math.min(existing.quantity + 1, 100);
    else current.push({ variant_id: variantId, quantity: 1 });
    localStorage.setItem(key, JSON.stringify(current));
    setMessage("Added to cart.");
  }
  return (
    <div className="store-buy">
      <label htmlFor="variant">Choose an option</label>
      <select id="variant" value={variantId} onChange={(event) => setVariantId(event.target.value)}>
        {variants.map((variant) => (
          <option
            key={variant.id}
            value={variant.id}
            disabled={variant.availability === "out_of_stock"}
          >
            {variant.title} · {variant.availability.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <button type="button" onClick={add} disabled={!variantId}>
        Add to cart
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
