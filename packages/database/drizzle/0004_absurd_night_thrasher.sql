CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"external_ref" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_levels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"on_hand" bigint DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_levels_nonnegative_check" CHECK ("inventory_levels"."on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"inventory_level_id" uuid NOT NULL,
	"delta" bigint NOT NULL,
	"resulting_on_hand" bigint NOT NULL,
	"reason" text NOT NULL,
	"order_id" uuid,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_delta_check" CHECK ("inventory_movements"."delta" <> 0),
	CONSTRAINT "inventory_movements_result_check" CHECK ("inventory_movements"."resulting_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_name" text NOT NULL,
	"variant_title" text NOT NULL,
	"sku" text NOT NULL,
	"unit_amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"quantity" integer NOT NULL,
	"total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0 and "order_items"."quantity" <= 10000),
	CONSTRAINT "order_items_amounts_check" CHECK ("order_items"."unit_amount" >= 0 and "order_items"."total_amount" = "order_items"."unit_amount" * "order_items"."quantity"),
	CONSTRAINT "order_items_currency_check" CHECK ("order_items"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid,
	"number" text NOT NULL,
	"financial_status" text DEFAULT 'unpaid' NOT NULL,
	"fulfilment_status" text DEFAULT 'unfulfilled' NOT NULL,
	"currency" text NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	"total_amount" bigint NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "orders_financial_status_check" CHECK ("orders"."financial_status" in ('unpaid', 'paid', 'partially_refunded', 'refunded')),
	CONSTRAINT "orders_fulfilment_status_check" CHECK ("orders"."fulfilment_status" in ('unfulfilled', 'fulfilled', 'cancelled')),
	CONSTRAINT "orders_currency_check" CHECK ("orders"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "orders_amounts_check" CHECK ("orders"."subtotal_amount" >= 0 and "orders"."total_amount" >= 0 and "orders"."total_amount" = "orders"."subtotal_amount")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "products_status_check" CHECK ("products"."status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"title" text NOT NULL,
	"unit_amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "variants_unit_amount_check" CHECK ("variants"."unit_amount" >= 0),
	CONSTRAINT "variants_currency_check" CHECK ("variants"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "variants_status_check" CHECK ("variants"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_id_uidx" ON "customers" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_org_id_uidx" ON "products" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_org_id_uidx" ON "variants" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_org_id_uidx" ON "orders" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_levels_org_id_uidx" ON "inventory_levels" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_variant_org_fk" FOREIGN KEY ("organization_id","variant_id") REFERENCES "public"."variants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_location_org_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_level_org_fk" FOREIGN KEY ("organization_id","inventory_level_id") REFERENCES "public"."inventory_levels"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_org_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."orders"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_org_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_org_fk" FOREIGN KEY ("organization_id","variant_id") REFERENCES "public"."variants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_org_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customers"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_org_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_external_ref_uidx" ON "customers" USING btree ("organization_id","external_ref") WHERE "external_ref" is not null;--> statement-breakpoint
CREATE INDEX "customers_org_email_idx" ON "customers" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "customers_org_created_idx" ON "customers" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_levels_org_variant_location_uidx" ON "inventory_levels" USING btree ("organization_id","variant_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_levels_org_location_idx" ON "inventory_levels" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_org_id_uidx" ON "inventory_movements" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "inventory_movements_org_level_created_idx" ON "inventory_movements" USING btree ("organization_id","inventory_level_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_org_id_uidx" ON "order_items" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "order_items_org_order_idx" ON "order_items" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_org_number_uidx" ON "orders" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "orders_org_created_idx" ON "orders" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "orders_org_location_created_idx" ON "orders" USING btree ("organization_id","location_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_org_customer_idx" ON "orders" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_org_slug_uidx" ON "products" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "products_org_status_created_idx" ON "products" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_org_sku_uidx" ON "variants" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE INDEX "variants_org_product_idx" ON "variants" USING btree ("organization_id","product_id");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON customers, products, variants, inventory_levels, orders TO yinne_app;
GRANT SELECT, INSERT ON inventory_movements, order_items TO yinne_app;--> statement-breakpoint
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY customers_tenant_policy ON customers
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY products_tenant_policy ON products
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants FORCE ROW LEVEL SECURITY;
CREATE POLICY variants_tenant_policy ON variants
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels FORCE ROW LEVEL SECURITY;
CREATE POLICY inventory_levels_tenant_policy ON inventory_levels
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY inventory_movements_tenant_policy ON inventory_movements
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_policy ON orders
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
CREATE POLICY order_items_tenant_policy ON order_items
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
CREATE OR REPLACE FUNCTION yinne_reject_immutable_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END
$$;--> statement-breakpoint
CREATE TRIGGER inventory_movements_immutable
  BEFORE UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION yinne_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER order_items_immutable
  BEFORE UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION yinne_reject_immutable_change();
