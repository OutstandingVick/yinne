import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@yinne/storefront";
import { formatMinorAmount } from "../../../../../lib/money";
import { AddToCart } from "./add-to-cart";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  try {
    const value = await params;
    const { product, store } = await getPublicProduct(value.slug, value.productSlug);
    return {
      title: `${product.name} · ${store.public_name}`,
      description: product.description,
      alternates: { canonical: `/store/${store.slug}/products/${product.slug}` },
    };
  } catch {
    return { title: "Product unavailable", robots: { index: false } };
  }
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const value = await params;
  let result;
  try {
    result = await getPublicProduct(value.slug, value.productSlug);
  } catch {
    notFound();
  }
  return (
    <main className="store-shell">
      <header className="store-header">
        <Link href={`/store/${result.store.slug}`}>{result.store.public_name}</Link>
        <Link href={`/store/${result.store.slug}/cart`}>Cart</Link>
      </header>
      <article className="product-detail">
        {result.product.image_url ? (
          <img
            src={result.product.image_url}
            alt={result.product.image_alt ?? ""}
            width="720"
            height="720"
          />
        ) : (
          <div className="product-placeholder" />
        )}
        <div>
          <p className="eyebrow">{result.store.public_name}</p>
          <h1>{result.product.name}</h1>
          <p>{result.product.description}</p>
          <ul className="variant-prices">
            {result.product.variants.map((variant) => (
              <li key={variant.id}>
                <span>{variant.title}</span>
                <strong>{formatMinorAmount(variant.unit_amount, variant.currency)}</strong>
              </li>
            ))}
          </ul>
          <AddToCart storeSlug={result.store.slug} variants={result.product.variants} />
        </div>
      </article>
    </main>
  );
}
