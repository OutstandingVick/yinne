import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicProducts } from "@yinne/storefront";
import { Cart } from "./cart";

export const metadata = { title: "Cart", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  let result;
  try {
    result = await listPublicProducts((await params).slug, 50);
  } catch {
    notFound();
  }
  const variants = result.data.flatMap((product) =>
    product.variants.map((variant) => ({ ...variant, product: product.name })),
  );
  return (
    <main className="store-shell">
      <header className="store-header">
        <Link href={`/store/${result.store.slug}`}>{result.store.public_name}</Link>
        <Link href={`/store/${result.store.slug}`}>Keep shopping</Link>
      </header>
      <Cart storeSlug={result.store.slug} variants={variants} />
    </main>
  );
}
