import { and, asc, eq, sql } from "drizzle-orm";
import type { MarketplaceCheckoutInput, MarketplaceSearchInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { database, inventoryLevels, marketplaceCategories, marketplaceListings, marketplaceProfiles, products, stores, variants, withTenantTransaction } from "@yinne/database";
import { createPublicStoreCheckout } from "@yinne/storefront";

const notFound = (): never => { throw new ApiError(404,"invalid_request","resource_not_found","The Marketplace listing is unavailable."); };
const stock = (tracked:boolean,onHand:bigint|null) => !tracked || (onHand ?? 0n)>0n;

async function project(organizationId:string, listingId:string, environment:"test"|"live") {
  return withTenantTransaction({organizationId,environment}, async(tx)=>{
    const rows=await tx.select({listing:marketplaceListings,profile:marketplaceProfiles,category:marketplaceCategories,product:products,store:stores,variant:variants,onHand:inventoryLevels.onHand}).from(marketplaceListings)
      .innerJoin(marketplaceProfiles,and(eq(marketplaceProfiles.organizationId,marketplaceListings.organizationId),eq(marketplaceProfiles.id,marketplaceListings.profileId)))
      .innerJoin(marketplaceCategories,eq(marketplaceCategories.id,marketplaceListings.categoryId))
      .innerJoin(products,and(eq(products.organizationId,marketplaceListings.organizationId),eq(products.id,marketplaceListings.productId)))
      .innerJoin(stores,and(eq(stores.organizationId,marketplaceListings.organizationId),eq(stores.environment,marketplaceListings.environment)))
      .innerJoin(variants,and(eq(variants.organizationId,products.organizationId),eq(variants.productId,products.id),eq(variants.status,"active")))
      .leftJoin(inventoryLevels,and(eq(inventoryLevels.organizationId,variants.organizationId),eq(inventoryLevels.variantId,variants.id),eq(inventoryLevels.locationId,stores.defaultLocationId)))
      .where(and(eq(marketplaceListings.id,listingId),eq(marketplaceListings.status,"approved"),eq(products.status,"active"),eq(stores.status,"active"))).orderBy(asc(variants.createdAt)).limit(100);
    const first=rows[0]; if(!first) return notFound();
    return {id:first.listing.id,title:first.listing.titleOverride??first.product.name,description:first.listing.descriptionOverride??first.product.description,category:{slug:first.category.slug,name:first.category.name},merchant:{slug:first.profile.slug,name:first.profile.publicName,description:first.profile.description,logo_url:first.profile.logoUrl},product:{slug:first.product.slug},store_slug:first.store.slug,variants:rows.map(r=>({id:r.variant.id,title:r.variant.title,unit_amount:r.variant.unitAmount.toString(),currency:r.variant.currency,available:stock(r.variant.trackInventory,r.onHand)}))};
  });
}

export async function searchPublicMarketplace(input: MarketplaceSearchInput, environment:"test"|"live"="test") {
  const rows=(await database.execute(sql`select * from yinne_search_marketplace('yinne',${environment},${input.q??null},${input.category??null},${input.merchant??null},${input.currency??null},${input.min_amount??null},${input.max_amount??null},${input.available},${input.limit})`)) as unknown as {organization_id:string;listing_id:string}[];
  return {data:await Promise.all(rows.map(r=>project(r.organization_id,r.listing_id,environment))),has_more:rows.length===input.limit};
}

export async function getPublicMarketplaceListing(id:string, environment:"test"|"live"="test") {
  const rows=(await database.execute(sql`select * from yinne_resolve_marketplace_listing('yinne',${id},${environment})`)) as unknown as {organization_id:string;resource_id:string}[];
  const resolved=rows[0]; if(!resolved) return notFound(); return project(resolved.organization_id,resolved.resource_id,environment);
}

export async function createMarketplaceCheckout(id:string,input:MarketplaceCheckoutInput,environment:"test"|"live"="test",origin?:string) {
  const listing=await getPublicMarketplaceListing(id,environment);
  const variant=listing.variants.find(v=>v.id===input.variant_id && v.available); if(!variant) return notFound();
  return createPublicStoreCheckout(listing.store_slug,{items:[{variant_id:input.variant_id,quantity:input.quantity}],idempotency_key:input.idempotency_key},environment,origin);
}
