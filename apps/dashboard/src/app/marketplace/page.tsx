import Link from "next/link";
import { searchPublicMarketplace } from "@yinne/marketplace";
import { formatMinorAmount } from "../../lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title:"Yinne Marketplace", description:"Discover products from independent merchants on Yinne." };

export default async function MarketplacePage({searchParams}:{searchParams:Promise<{q?:string;category?:string}>}) {
  const query=await searchParams;
  const result=await searchPublicMarketplace({q:query.q,category:query.category,available:true,limit:30});
  return <main className="store-shell">
    <header className="store-header"><Link className="store-brand" href="/marketplace"><span>Yinne Marketplace</span></Link><Link href="/sign-in">Merchant sign in</Link></header>
    <section className="store-hero"><p className="eyebrow">Independent merchants, one discovery destination</p><h1>Find something worth buying</h1><form action="/marketplace"><label htmlFor="market-search">Search products</label><div className="form-row"><input id="market-search" name="q" defaultValue={query.q}/><button type="submit">Search</button></div></form></section>
    <section aria-labelledby="market-results"><h2 id="market-results">{query.q?`Results for “${query.q}”`:"Browse Marketplace"}</h2>
      {!result.data.length?<p className="store-empty">No available listings match these filters.</p>:<div className="product-grid">{result.data.map(listing=><article className="product-card" key={listing.id}><div className="product-placeholder"/><div><p className="eyebrow">{listing.category.name} · {listing.merchant.name}</p><h3><Link href={`/marketplace/listings/${listing.id}`}>{listing.title}</Link></h3><p>{listing.description}</p><strong>{listing.variants[0]?`From ${formatMinorAmount(listing.variants[0].unit_amount,listing.variants[0].currency)}`:"Unavailable"}</strong></div></article>)}</div>}
    </section><footer><small>Single-merchant checkout · Payments powered by canonical Yinne commerce · Test mode</small></footer>
  </main>;
}
