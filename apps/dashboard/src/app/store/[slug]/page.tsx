import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicProducts } from "@yinne/storefront";
import { formatMinorAmount } from "../../../lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const result = await listPublicProducts((await params).slug, 1);
    return {
      title: result.store.public_name,
      description: result.store.description,
      alternates: { canonical: `/store/${result.store.slug}` },
    };
  } catch {
    return { title: "Store unavailable", robots: { index: false } };
  }
}

export default async function StoreHome({ params }: { params: Promise<{ slug: string }> }) {
  let result;
  try {
    result = await listPublicProducts((await params).slug, 50);
  } catch {
    notFound();
  }
  return (
    <main
      className="store-shell"
      style={
        {
          "--store-primary": result.store.appearance.primary_color,
          "--store-bg": result.store.appearance.background_color,
          "--store-text": result.store.appearance.text_color,
        } as React.CSSProperties
      }
    >
      <header className="store-header">
        <Link href={`/store/${result.store.slug}`} className="store-brand">
          {result.store.logo_url ? (
            <img src={result.store.logo_url} alt="" width="48" height="48" />
          ) : null}
          <span>{result.store.public_name}</span>
        </Link>
        <Link href={`/store/${result.store.slug}/cart`}>Cart</Link>
      </header>
      <section className="store-hero">
        <p className="eyebrow">Independent commerce, powered by Yinne</p>
        <h1>{result.store.public_name}</h1>
        {result.store.description ? <p>{result.store.description}</p> : null}
      </section>
      <section aria-labelledby="catalogue-title">
        <h2 id="catalogue-title">Shop</h2>
        {!result.data.length ? (
          <p className="store-empty">Products are coming soon.</p>
        ) : (
          <div className="product-grid">
            {result.data.map((product) => (
              <article className="product-card" key={product.slug}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.image_alt ?? ""}
                    width="640"
                    height="480"
                    loading="lazy"
                  />
                ) : (
                  <div className="product-placeholder" />
                )}
                <div>
                  <h3>
                    <Link href={`/store/${result.store.slug}/products/${product.slug}`}>
                      {product.name}
                    </Link>
                  </h3>
                  <p>{product.description}</p>
                  <strong>
                    {product.variants[0]
                      ? `From ${formatMinorAmount(product.variants[0].unit_amount, product.variants[0].currency)}`
                      : "Unavailable"}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer>
        {result.store.contact_email ? (
          <a href={`mailto:${result.store.contact_email}`}>Contact {result.store.public_name}</a>
        ) : null}
        <small>Secure checkout powered by Yinne · Test mode</small>
      </footer>
    </main>
  );
}
