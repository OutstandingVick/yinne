CREATE TABLE "marketplace_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"marketplace_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_categories_status_check" CHECK ("marketplace_categories"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"marketplace_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title_override" text,
	"description_override" text,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"moderation_reason_code" text,
	"moderation_explanation" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "marketplace_listings_environment_check" CHECK ("marketplace_listings"."environment" in ('test', 'live')),
	CONSTRAINT "marketplace_listings_status_check" CHECK ("marketplace_listings"."status" in ('draft', 'submitted', 'approved', 'rejected', 'suspended', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "marketplace_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"marketplace_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"public_name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"terms_accepted_at" timestamp with time zone,
	"contact_verified_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_profiles_environment_check" CHECK ("marketplace_profiles"."environment" in ('test', 'live'))
);
--> statement-breakpoint
CREATE TABLE "marketplaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "marketplaces_status_check" CHECK ("marketplaces"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
ALTER TABLE "marketplace_categories" ADD CONSTRAINT "marketplace_categories_marketplace_id_marketplaces_id_fk" FOREIGN KEY ("marketplace_id") REFERENCES "public"."marketplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_profiles_org_id_uidx" ON "marketplace_profiles" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_marketplace_id_marketplaces_id_fk" FOREIGN KEY ("marketplace_id") REFERENCES "public"."marketplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_category_id_marketplace_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."marketplace_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_profile_org_fk" FOREIGN KEY ("organization_id","profile_id") REFERENCES "public"."marketplace_profiles"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_product_org_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_profiles" ADD CONSTRAINT "marketplace_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_profiles" ADD CONSTRAINT "marketplace_profiles_marketplace_id_marketplaces_id_fk" FOREIGN KEY ("marketplace_id") REFERENCES "public"."marketplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_profiles" ADD CONSTRAINT "marketplace_profiles_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_categories_market_slug_uidx" ON "marketplace_categories" USING btree ("marketplace_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_listings_org_id_uidx" ON "marketplace_listings" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_listings_market_product_active_uidx" ON "marketplace_listings" USING btree ("marketplace_id","environment","product_id") WHERE "marketplace_listings"."status" <> 'archived';--> statement-breakpoint
CREATE INDEX "marketplace_listings_public_idx" ON "marketplace_listings" USING btree ("marketplace_id","environment","status","category_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_profiles_market_org_env_uidx" ON "marketplace_profiles" USING btree ("marketplace_id","organization_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_profiles_market_env_slug_uidx" ON "marketplace_profiles" USING btree ("marketplace_id","environment","slug");--> statement-breakpoint
-- marketplace_profiles_org_id_uidx is created before the composite listing foreign key.
--> statement-breakpoint
GRANT SELECT ON marketplaces, marketplace_categories TO yinne_app;
GRANT SELECT, INSERT, UPDATE ON marketplace_profiles, marketplace_listings TO yinne_app;
--> statement-breakpoint
ALTER TABLE marketplace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY marketplace_profiles_tenant_policy ON marketplace_profiles USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings FORCE ROW LEVEL SECURITY;
CREATE POLICY marketplace_listings_tenant_policy ON marketplace_listings USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION yinne_resolve_marketplace_listing(
  requested_marketplace text,
  requested_listing uuid,
  requested_environment text
) RETURNS TABLE(organization_id uuid, environment text, resource_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT ml.organization_id, ml.environment, ml.id
  FROM marketplace_listings ml
  JOIN marketplace_profiles mp ON mp.id = ml.profile_id AND mp.organization_id = ml.organization_id
  JOIN marketplaces m ON m.id = ml.marketplace_id
  WHERE m.slug = requested_marketplace AND m.status = 'active'
    AND ml.id = requested_listing AND ml.environment = requested_environment
    AND ml.status = 'approved' AND mp.suspended_at IS NULL
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION yinne_resolve_marketplace_listing(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_resolve_marketplace_listing(text, uuid, text) TO yinne_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION yinne_search_marketplace(
  requested_marketplace text,
  requested_environment text,
  requested_query text DEFAULT NULL,
  requested_category text DEFAULT NULL,
  requested_merchant text DEFAULT NULL,
  requested_currency text DEFAULT NULL,
  requested_min_amount bigint DEFAULT NULL,
  requested_max_amount bigint DEFAULT NULL,
  requested_available boolean DEFAULT true,
  requested_limit integer DEFAULT 20
) RETURNS TABLE(organization_id uuid, listing_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT ml.organization_id, ml.id
  FROM marketplace_listings ml
  JOIN marketplaces m ON m.id = ml.marketplace_id
  JOIN marketplace_profiles mp ON mp.id = ml.profile_id AND mp.organization_id = ml.organization_id
  JOIN marketplace_categories mc ON mc.id = ml.category_id AND mc.marketplace_id = m.id
  JOIN products p ON p.id = ml.product_id AND p.organization_id = ml.organization_id
  JOIN stores s ON s.organization_id = ml.organization_id AND s.environment = ml.environment
  JOIN store_listings sl ON sl.store_id = s.id AND sl.product_id = p.id AND sl.status = 'published'
  WHERE m.slug = requested_marketplace AND m.status = 'active'
    AND ml.environment = requested_environment AND ml.status = 'approved'
    AND mp.suspended_at IS NULL AND mp.terms_accepted_at IS NOT NULL AND mp.contact_verified_at IS NOT NULL
    AND p.status = 'active' AND s.status = 'active' AND mc.status = 'active'
    AND (requested_query IS NULL OR coalesce(ml.title_override, p.name) ILIKE '%' || requested_query || '%' OR coalesce(ml.description_override, p.description, '') ILIKE '%' || requested_query || '%')
    AND (requested_category IS NULL OR mc.slug = requested_category)
    AND (requested_merchant IS NULL OR mp.slug = requested_merchant)
    AND EXISTS (
      SELECT 1 FROM variants v LEFT JOIN inventory_levels il
        ON il.organization_id = v.organization_id AND il.variant_id = v.id AND il.location_id = s.default_location_id
      WHERE v.organization_id = p.organization_id AND v.product_id = p.id AND v.status = 'active'
        AND (requested_currency IS NULL OR v.currency = requested_currency)
        AND (requested_min_amount IS NULL OR v.unit_amount >= requested_min_amount)
        AND (requested_max_amount IS NULL OR v.unit_amount <= requested_max_amount)
        AND (NOT requested_available OR NOT v.track_inventory OR coalesce(il.on_hand, 0) > 0)
    )
  ORDER BY ml.rank DESC, ml.created_at DESC, ml.id
  LIMIT least(greatest(requested_limit, 1), 50)
$$;
REVOKE ALL ON FUNCTION yinne_search_marketplace(text,text,text,text,text,text,bigint,bigint,boolean,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_search_marketplace(text,text,text,text,text,text,bigint,bigint,boolean,integer) TO yinne_app;
