CREATE TABLE "store_listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"image_alt" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_listings_status_check" CHECK ("store_listings"."status" in ('published', 'unpublished')),
	CONSTRAINT "store_listings_display_order_check" CHECK ("store_listings"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"public_name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text NOT NULL,
	"default_location_id" uuid NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"appearance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"catalogue_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "stores_environment_check" CHECK ("stores"."environment" in ('test', 'live')),
	CONSTRAINT "stores_status_check" CHECK ("stores"."status" in ('draft', 'active', 'paused', 'archived')),
	CONSTRAINT "stores_currency_check" CHECK ("stores"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "stores_catalogue_version_check" CHECK ("stores"."catalogue_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "store_listings" ADD CONSTRAINT "store_listings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_listings" ADD CONSTRAINT "store_listings_store_org_fk" FOREIGN KEY ("organization_id","store_id") REFERENCES "public"."stores"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_listings" ADD CONSTRAINT "store_listings_product_org_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_location_org_fk" FOREIGN KEY ("organization_id","default_location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_listings_org_id_uidx" ON "store_listings" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_listings_store_product_uidx" ON "store_listings" USING btree ("store_id","product_id");--> statement-breakpoint
CREATE INDEX "store_listings_store_status_order_idx" ON "store_listings" USING btree ("store_id","status","display_order","id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_org_id_uidx" ON "stores" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_org_merchant_env_uidx" ON "stores" USING btree ("organization_id","merchant_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_environment_slug_uidx" ON "stores" USING btree ("environment","slug");--> statement-breakpoint
CREATE INDEX "stores_org_status_idx" ON "stores" USING btree ("organization_id","environment","status");