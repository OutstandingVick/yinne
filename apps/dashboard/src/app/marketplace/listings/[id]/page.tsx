import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMarketplaceListing } from "@yinne/marketplace";
import { formatMinorAmount } from "../../../../lib/money";
import { MarketplaceBuy } from "./buy";
export const dynamic = "force-dynamic";
export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let listing;
  try {
    listing = await getPublicMarketplaceListing((await params).id);
  } catch {
    notFound();
  }
  return (
    <main className="store-shell">
      <header className="store-header">
        <Link href="/marketplace">Yinne Marketplace</Link>
        <span>{listing.merchant.name}</span>
      </header>
      <article className="product-detail">
        <div className="product-placeholder" />
        <div>
          <p className="eyebrow">
            {listing.category.name} · Sold by {listing.merchant.name}
          </p>
          <h1>{listing.title}</h1>
          <p>{listing.description}</p>
          <ul className="variant-prices">
            {listing.variants.map((v) => (
              <li key={v.id}>
                <span>{v.title}</span>
                <strong>{formatMinorAmount(v.unit_amount, v.currency)}</strong>
              </li>
            ))}
          </ul>
          <MarketplaceBuy listingId={listing.id} variants={listing.variants} />
          <small>One merchant per checkout. Price and stock are revalidated before payment.</small>
        </div>
      </article>
    </main>
  );
}
