CREATE TABLE "invoice_counters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"year" integer NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "invoice_counters_environment_check" CHECK ("invoice_counters"."environment" in ('test', 'live')),
	CONSTRAINT "invoice_counters_next_check" CHECK ("invoice_counters"."next_value" > 0)
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_items_amount_check" CHECK ("invoice_items"."quantity" > 0 and "invoice_items"."unit_amount" > 0 and "invoice_items"."total_amount" = "invoice_items"."unit_amount" * "invoice_items"."quantity"),
	CONSTRAINT "invoice_items_currency_check" CHECK ("invoice_items"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid,
	"customer_id" uuid NOT NULL,
	"number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	"total_amount" bigint NOT NULL,
	"public_token_digest" text,
	"public_token_prefix" text,
	"checkout_session_id" uuid,
	"order_id" uuid,
	"payment_id" uuid,
	"due_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_environment_check" CHECK ("invoices"."environment" in ('test', 'live')),
	CONSTRAINT "invoices_status_check" CHECK ("invoices"."status" in ('draft', 'open', 'paid', 'void')),
	CONSTRAINT "invoices_currency_check" CHECK ("invoices"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "invoices_amount_check" CHECK ("invoices"."subtotal_amount" > 0 and "invoices"."total_amount" = "invoices"."subtotal_amount"),
	CONSTRAINT "invoices_org_id_key" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "address" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE locations SET code = upper(regexp_replace(name, '[^A-Za-z0-9]+', '-', 'g')) WHERE code IS NULL;--> statement-breakpoint
ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_org_fk" FOREIGN KEY ("organization_id","invoice_id") REFERENCES "public"."invoices"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_org_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_variant_org_fk" FOREIGN KEY ("organization_id","variant_id") REFERENCES "public"."variants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_location_org_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customers"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_checkout_org_fk" FOREIGN KEY ("organization_id","checkout_session_id") REFERENCES "public"."checkout_sessions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_org_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."orders"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_org_fk" FOREIGN KEY ("organization_id","payment_id") REFERENCES "public"."payments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_counters_org_env_year_uidx" ON "invoice_counters" USING btree ("organization_id","environment","year");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_items_org_id_uidx" ON "invoice_items" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("organization_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_id_uidx" ON "invoices" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_env_number_uidx" ON "invoices" USING btree ("organization_id","environment","number") WHERE "invoices"."number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_public_token_uidx" ON "invoices" USING btree ("public_token_digest") WHERE "invoices"."public_token_digest" is not null;--> statement-breakpoint
CREATE INDEX "invoices_org_env_created_idx" ON "invoices" USING btree ("organization_id","environment","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_org_merchant_code_uidx" ON "locations" USING btree ("organization_id","merchant_id","code") WHERE "locations"."code" is not null;--> statement-breakpoint
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON invoice_counters, invoices TO yinne_app;
GRANT SELECT, INSERT, DELETE ON invoice_items TO yinne_app;
--> statement-breakpoint
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_counters FORCE ROW LEVEL SECURITY;
CREATE POLICY invoice_counters_tenant_policy ON invoice_counters USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY invoices_tenant_policy ON invoices USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;
CREATE POLICY invoice_items_tenant_policy ON invoice_items USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
--> statement-breakpoint
CREATE FUNCTION yinne_resolve_invoice_token(p_token_digest text)
RETURNS TABLE(organization_id uuid, environment text, resource_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT organization_id, environment, id FROM invoices
  WHERE public_token_digest = p_token_digest AND status in ('open', 'paid') LIMIT 1
$$;
REVOKE ALL ON FUNCTION yinne_resolve_invoice_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_resolve_invoice_token(text) TO yinne_app;
