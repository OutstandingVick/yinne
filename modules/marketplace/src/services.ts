import { and, asc, eq, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import type { MarketplaceListingInput, MarketplaceModerationInput, MarketplaceProfileInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { createId } from "@yinne/core";
import { principalId } from "@yinne/auth";
import { inventoryLevels, marketplaceCategories, marketplaceListings, marketplaceProfiles, marketplaces, merchants, products, providerAccounts, storeListings, stores, variants, withTenantTransaction } from "@yinne/database";
import { assertListingTransition, type ListingStatus } from "./state";

const missing = (): never => { throw new ApiError(404, "invalid_request", "resource_not_found", "The requested Marketplace resource does not exist."); };
const profileView = (r: typeof marketplaceProfiles.$inferSelect) => ({ id:r.id, marketplace_id:r.marketplaceId, merchant_id:r.merchantId, public_name:r.publicName, slug:r.slug, description:r.description, logo_url:r.logoUrl, terms_accepted:r.termsAcceptedAt !== null, contact_verified:r.contactVerifiedAt !== null, suspended:r.suspendedAt !== null, version:r.version, updated_at:r.updatedAt.toISOString() });
const listingView = (r: typeof marketplaceListings.$inferSelect) => ({ id:r.id, product_id:r.productId, category_id:r.categoryId, status:r.status, title:r.titleOverride, description:r.descriptionOverride, eligibility:r.eligibility, moderation_reason_code:r.moderationReasonCode, moderation_explanation:r.moderationExplanation, version:r.version, updated_at:r.updatedAt.toISOString() });

async function market(tx: Parameters<Parameters<typeof withTenantTransaction>[1]>[0]) {
  const [row] = await tx.select().from(marketplaces).where(and(eq(marketplaces.slug, "yinne"), eq(marketplaces.status, "active"))).limit(1);
  if (!row) throw new ApiError(404, "invalid_request", "marketplace_disabled", "Marketplace is not enabled.");
  return row;
}

export async function getMarketplaceProfile(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "marketplace:read", { organizationId: context.tenant.organizationId });
    const m = await market(tx);
    const [row] = await tx.select().from(marketplaceProfiles).where(and(eq(marketplaceProfiles.marketplaceId,m.id),eq(marketplaceProfiles.organizationId,context.tenant.organizationId),eq(marketplaceProfiles.environment,context.tenant.environment))).limit(1);
    if (!row) return missing();
    return profileView(row);
  });
}

export async function upsertMarketplaceProfile(context: RequestContext, input: MarketplaceProfileInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "marketplace:manage", { organizationId: context.tenant.organizationId });
    const m = await market(tx);
    const [merchant] = await tx.select({id:merchants.id}).from(merchants).where(and(eq(merchants.organizationId,context.tenant.organizationId),eq(merchants.status,"active"))).limit(1);
    if (!merchant) return missing();
    const now = new Date();
    const [row] = await tx.insert(marketplaceProfiles).values({ id:createId(), organizationId:context.tenant.organizationId, environment:context.tenant.environment, marketplaceId:m.id, merchantId:merchant.id, publicName:input.public_name, slug:input.slug, description:input.description, logoUrl:input.logo_url, termsAcceptedAt:input.terms_accepted?now:null, contactVerifiedAt:input.contact_verified?now:null }).onConflictDoUpdate({ target:[marketplaceProfiles.marketplaceId, marketplaceProfiles.organizationId, marketplaceProfiles.environment], set:{ publicName:input.public_name, slug:input.slug, description:input.description, logoUrl:input.logo_url, termsAcceptedAt:input.terms_accepted?now:null, contactVerifiedAt:input.contact_verified?now:null, version:sql`${marketplaceProfiles.version} + 1`, updatedAt:now } }).returning();
    await recordDomainChange(tx, context, { action:"marketplace.profile_updated", aggregateType:"marketplace_profile", aggregateId:row!.id, aggregateVersion:row!.version, data:{ marketplace_id:m.id } });
    return profileView(row!);
  });
}

export async function listMarketplaceListings(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "marketplace:read", {organizationId:context.tenant.organizationId});
    return (await tx.select().from(marketplaceListings).where(and(eq(marketplaceListings.organizationId,context.tenant.organizationId),eq(marketplaceListings.environment,context.tenant.environment))).orderBy(asc(marketplaceListings.createdAt))).map(listingView);
  });
}

export async function createMarketplaceListing(context: RequestContext, input: MarketplaceListingInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "marketplace:manage", {organizationId:context.tenant.organizationId});
    const m=await market(tx);
    const [profile]=await tx.select().from(marketplaceProfiles).where(and(eq(marketplaceProfiles.marketplaceId,m.id),eq(marketplaceProfiles.organizationId,context.tenant.organizationId),eq(marketplaceProfiles.environment,context.tenant.environment))).limit(1);
    const [product]=await tx.select({id:products.id}).from(products).where(and(eq(products.organizationId,context.tenant.organizationId),eq(products.id,input.product_id))).limit(1);
    const [category]=await tx.select({id:marketplaceCategories.id}).from(marketplaceCategories).where(and(eq(marketplaceCategories.marketplaceId,m.id),eq(marketplaceCategories.slug,input.category_slug),eq(marketplaceCategories.status,"active"))).limit(1);
    if(!profile || !product || !category) return missing();
    const [row]=await tx.insert(marketplaceListings).values({id:createId(),organizationId:context.tenant.organizationId,environment:context.tenant.environment,marketplaceId:m.id,profileId:profile.id,productId:product.id,categoryId:category.id,titleOverride:input.title,descriptionOverride:input.description}).returning();
    await recordDomainChange(tx,context,{action:"marketplace.listing_created",aggregateType:"marketplace_listing",aggregateId:row!.id,aggregateVersion:1,data:{product_id:product.id}}); return listingView(row!);
  });
}

export async function transitionMarketplaceListing(context: RequestContext, id: string, status: ListingStatus, moderation?: MarketplaceModerationInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx,context.principal,status==="approved"||status==="rejected"||status==="suspended"?"marketplace:moderate":"marketplace:manage",{organizationId:context.tenant.organizationId});
    const [current]=await tx.select().from(marketplaceListings).where(and(eq(marketplaceListings.organizationId,context.tenant.organizationId),eq(marketplaceListings.environment,context.tenant.environment),eq(marketplaceListings.id,id))).for("update").limit(1);
    if(!current) return missing();
    assertListingTransition(current.status as ListingStatus,status); const now=new Date();
    let eligibility=current.eligibility;
    if(status==="submitted" || status==="approved") {
      const [e]=await tx.select({profile:marketplaceProfiles,product:products,store:stores,publication:storeListings,provider:providerAccounts,variant:variants,onHand:inventoryLevels.onHand}).from(marketplaceProfiles)
        .innerJoin(products,and(eq(products.organizationId,marketplaceProfiles.organizationId),eq(products.id,current.productId)))
        .leftJoin(stores,and(eq(stores.organizationId,marketplaceProfiles.organizationId),eq(stores.environment,marketplaceProfiles.environment)))
        .leftJoin(storeListings,and(eq(storeListings.organizationId,products.organizationId),eq(storeListings.productId,products.id),eq(storeListings.storeId,stores.id)))
        .leftJoin(providerAccounts,and(eq(providerAccounts.organizationId,marketplaceProfiles.organizationId),eq(providerAccounts.environment,marketplaceProfiles.environment),eq(providerAccounts.status,"active")))
        .leftJoin(variants,and(eq(variants.organizationId,products.organizationId),eq(variants.productId,products.id),eq(variants.status,"active")))
        .leftJoin(inventoryLevels,and(eq(inventoryLevels.organizationId,variants.organizationId),eq(inventoryLevels.variantId,variants.id),eq(inventoryLevels.locationId,stores.defaultLocationId)))
        .where(eq(marketplaceProfiles.id,current.profileId)).limit(1);
      const checks={terms_accepted:!!e?.profile.termsAcceptedAt,contact_verified:!!e?.profile.contactVerifiedAt,merchant_active:!e?.profile.suspendedAt,store_active:e?.store?.status==="active",product_active:e?.product.status==="active",storefront_published:e?.publication?.status==="published",provider_active:!!e?.provider,variant_available:!!e?.variant&&(!e.variant.trackInventory||(e.onHand??0n)>0n)};
      eligibility={eligible:Object.values(checks).every(Boolean),checks,evaluated_at:now.toISOString()};
      if(status==="approved" && !eligibility.eligible) throw new ApiError(409,"conflict","listing_ineligible","The listing does not satisfy Marketplace eligibility requirements.");
    }
    const [row]=await tx.update(marketplaceListings).set({status,eligibility,version:sql`${marketplaceListings.version} + 1`,updatedAt:now,...(moderation?{moderationReasonCode:moderation.reason_code,moderationExplanation:moderation.explanation,moderatedBy:principalId(context.principal),moderatedAt:now}:{}),...(status==="archived"?{archivedAt:now}:{})}).where(eq(marketplaceListings.id,id)).returning();
    const action = status === "submitted" ? "marketplace.listing_submitted" : status === "approved" ? "marketplace.listing_approved" : status === "rejected" ? "marketplace.listing_rejected" : status === "suspended" ? "marketplace.listing_suspended" : "marketplace.listing_archived";
    await recordDomainChange(tx,context,{action,aggregateType:"marketplace_listing",aggregateId:id,aggregateVersion:row!.version,data:{status,reason_code:moderation?.reason_code}}); return listingView(row!);
  });
}
