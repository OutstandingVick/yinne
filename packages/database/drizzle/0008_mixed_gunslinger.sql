CREATE TABLE "checkout_line_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"variant_id" uuid,
	"description" text NOT NULL,
	"variant_title" text,
	"sku" text,
	"unit_amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"quantity" integer NOT NULL,
	"total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_items_amount_check" CHECK ("checkout_line_items"."unit_amount" > 0 and "checkout_line_items"."quantity" > 0 and "checkout_line_items"."total_amount" = "checkout_line_items"."unit_amount" * "checkout_line_items"."quantity"),
	CONSTRAINT "checkout_items_currency_check" CHECK ("checkout_line_items"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"payment_link_id" uuid,
	"customer_id" uuid,
	"order_id" uuid,
	"payment_id" uuid,
	"public_token_digest" text NOT NULL,
	"public_token_prefix" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"customer_capture" jsonb DEFAULT '{"name":true,"email":true,"phone":false}'::jsonb NOT NULL,
	"customer_details" jsonb,
	"success_url" text,
	"cancel_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"late_completion" boolean DEFAULT false NOT NULL,
	"link_usage_counted" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_sessions_org_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "checkout_sessions_environment_check" CHECK ("checkout_sessions"."environment" in ('test', 'live')),
	CONSTRAINT "checkout_sessions_status_check" CHECK ("checkout_sessions"."status" in ('open', 'processing', 'completed', 'expired', 'cancelled')),
	CONSTRAINT "checkout_sessions_amount_check" CHECK ("checkout_sessions"."amount" > 0),
	CONSTRAINT "checkout_sessions_currency_check" CHECK ("checkout_sessions"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"public_token_digest" text NOT NULL,
	"public_token_prefix" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"variant_id" uuid,
	"quantity" integer,
	"fixed_amount" bigint,
	"minimum_amount" bigint,
	"maximum_amount" bigint,
	"currency" text NOT NULL,
	"usage_limit" integer,
	"completed_usage_count" integer DEFAULT 0 NOT NULL,
	"customer_capture" jsonb DEFAULT '{"name":true,"email":true,"phone":false}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_links_org_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "payment_links_environment_check" CHECK ("payment_links"."environment" in ('test', 'live')),
	CONSTRAINT "payment_links_kind_check" CHECK ("payment_links"."kind" in ('product', 'fixed', 'flexible')),
	CONSTRAINT "payment_links_status_check" CHECK ("payment_links"."status" in ('active', 'inactive')),
	CONSTRAINT "payment_links_currency_check" CHECK ("payment_links"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_links_usage_check" CHECK ("payment_links"."completed_usage_count" >= 0 and ("payment_links"."usage_limit" is null or ("payment_links"."usage_limit" > 0 and "payment_links"."completed_usage_count" <= "payment_links"."usage_limit"))),
	CONSTRAINT "payment_links_amount_check" CHECK (("payment_links"."kind" = 'product' and "payment_links"."variant_id" is not null and "payment_links"."quantity" > 0 and "payment_links"."fixed_amount" is null and "payment_links"."minimum_amount" is null) or ("payment_links"."kind" = 'fixed' and "payment_links"."variant_id" is null and "payment_links"."fixed_amount" > 0 and "payment_links"."minimum_amount" is null) or ("payment_links"."kind" = 'flexible' and "payment_links"."variant_id" is null and "payment_links"."fixed_amount" is null and "payment_links"."minimum_amount" > 0 and ("payment_links"."maximum_amount" is null or "payment_links"."maximum_amount" >= "payment_links"."minimum_amount")))
);
--> statement-breakpoint
ALTER TABLE "checkout_line_items" ADD CONSTRAINT "checkout_line_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_line_items" ADD CONSTRAINT "checkout_items_session_org_fk" FOREIGN KEY ("organization_id","checkout_session_id") REFERENCES "public"."checkout_sessions"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_line_items" ADD CONSTRAINT "checkout_items_variant_org_fk" FOREIGN KEY ("organization_id","variant_id") REFERENCES "public"."variants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_location_org_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_link_org_fk" FOREIGN KEY ("organization_id","payment_link_id") REFERENCES "public"."payment_links"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customers"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_order_org_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."orders"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_location_org_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_variant_org_fk" FOREIGN KEY ("organization_id","variant_id") REFERENCES "public"."variants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_items_org_id_uidx" ON "checkout_line_items" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "checkout_items_session_idx" ON "checkout_line_items" USING btree ("organization_id","checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_org_id_uidx" ON "checkout_sessions" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_token_uidx" ON "checkout_sessions" USING btree ("public_token_digest");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_order_uidx" ON "checkout_sessions" USING btree ("organization_id","environment","order_id") WHERE "checkout_sessions"."order_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_payment_uidx" ON "checkout_sessions" USING btree ("organization_id","environment","payment_id") WHERE "checkout_sessions"."payment_id" is not null;--> statement-breakpoint
CREATE INDEX "checkout_sessions_org_env_created_idx" ON "checkout_sessions" USING btree ("organization_id","environment","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_org_id_uidx" ON "payment_links" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_token_uidx" ON "payment_links" USING btree ("public_token_digest");--> statement-breakpoint
CREATE INDEX "payment_links_org_env_created_idx" ON "payment_links" USING btree ("organization_id","environment","created_at","id");
--> statement-breakpoint
ALTER TABLE checkout_sessions ADD CONSTRAINT checkout_sessions_payment_org_fk FOREIGN KEY (organization_id, payment_id) REFERENCES payments(organization_id, id);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON payment_links, checkout_sessions TO yinne_app;
GRANT SELECT, INSERT ON checkout_line_items TO yinne_app;
--> statement-breakpoint
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_links_tenant_policy ON payment_links USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
--> statement-breakpoint
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY checkout_sessions_tenant_policy ON checkout_sessions USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
--> statement-breakpoint
ALTER TABLE checkout_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_line_items FORCE ROW LEVEL SECURITY;
CREATE POLICY checkout_line_items_tenant_policy ON checkout_line_items
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TRIGGER checkout_line_items_immutable BEFORE UPDATE OR DELETE ON checkout_line_items
  FOR EACH ROW EXECUTE FUNCTION yinne_reject_immutable_change();
--> statement-breakpoint
CREATE FUNCTION yinne_resolve_checkout_token(p_token_digest text)
RETURNS TABLE(organization_id uuid, environment text, resource_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$ SELECT organization_id, environment, id FROM checkout_sessions WHERE public_token_digest = p_token_digest LIMIT 1 $$;
REVOKE ALL ON FUNCTION yinne_resolve_checkout_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_resolve_checkout_token(text) TO yinne_app;
--> statement-breakpoint
CREATE FUNCTION yinne_resolve_payment_link_token(p_token_digest text)
RETURNS TABLE(organization_id uuid, environment text, resource_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$ SELECT organization_id, environment, id FROM payment_links WHERE public_token_digest = p_token_digest LIMIT 1 $$;
REVOKE ALL ON FUNCTION yinne_resolve_payment_link_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_resolve_payment_link_token(text) TO yinne_app;
