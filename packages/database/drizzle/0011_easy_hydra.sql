CREATE TABLE "recurring_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"unit_amount" bigint NOT NULL,
	"interval" text NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "recurring_prices_amount_check" CHECK ("recurring_prices"."unit_amount" > 0),
	CONSTRAINT "recurring_prices_currency_check" CHECK ("recurring_prices"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "recurring_prices_interval_check" CHECK ("recurring_prices"."interval" in ('month', 'year') and "recurring_prices"."interval_count" = 1),
	CONSTRAINT "recurring_prices_status_check" CHECK ("recurring_prices"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "subscription_plans_status_check" CHECK ("subscription_plans"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "subscription_renewals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"subscription_id" uuid NOT NULL,
	"invoice_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"last_payment_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_renewals_environment_check" CHECK ("subscription_renewals"."environment" in ('test', 'live')),
	CONSTRAINT "subscription_renewals_status_check" CHECK ("subscription_renewals"."status" in ('started', 'pending', 'failed', 'succeeded', 'exhausted')),
	CONSTRAINT "subscription_renewals_period_check" CHECK ("subscription_renewals"."period_end" > "subscription_renewals"."period_start"),
	CONSTRAINT "subscription_renewals_attempt_check" CHECK ("subscription_renewals"."attempt_count" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"price_id" uuid NOT NULL,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"unit_amount" bigint NOT NULL,
	"interval" text NOT NULL,
	"interval_count" integer NOT NULL,
	"billing_timezone" text DEFAULT 'UTC' NOT NULL,
	"anchor_day" integer NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"next_billing_at" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"payment_method_reference" text,
	"mock_renewal_outcome" text DEFAULT 'succeed' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_environment_check" CHECK ("subscriptions"."environment" in ('test', 'live')),
	CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" in ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'ended')),
	CONSTRAINT "subscriptions_amount_check" CHECK ("subscriptions"."unit_amount" > 0),
	CONSTRAINT "subscriptions_currency_check" CHECK ("subscriptions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "subscriptions_interval_check" CHECK ("subscriptions"."interval" in ('month', 'year') and "subscriptions"."interval_count" = 1),
	CONSTRAINT "subscriptions_anchor_check" CHECK ("subscriptions"."anchor_day" between 1 and 31),
	CONSTRAINT "subscriptions_period_check" CHECK ("subscriptions"."current_period_end" > "subscriptions"."current_period_start"),
	CONSTRAINT "subscriptions_mock_outcome_check" CHECK ("subscriptions"."mock_renewal_outcome" in ('succeed', 'fail', 'pending'))
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recurring_prices" ADD CONSTRAINT "recurring_prices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_prices" ADD CONSTRAINT "recurring_prices_plan_org_fk" FOREIGN KEY ("organization_id","plan_id") REFERENCES "public"."subscription_plans"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_subscription_org_fk" FOREIGN KEY ("organization_id","subscription_id") REFERENCES "public"."subscriptions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_invoice_org_fk" FOREIGN KEY ("organization_id","invoice_id") REFERENCES "public"."invoices"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_payment_org_fk" FOREIGN KEY ("organization_id","last_payment_id") REFERENCES "public"."payments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_location_org_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customers"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_org_fk" FOREIGN KEY ("organization_id","plan_id") REFERENCES "public"."subscription_plans"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_org_fk" FOREIGN KEY ("organization_id","price_id") REFERENCES "public"."recurring_prices"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_prices_org_id_uidx" ON "recurring_prices" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "recurring_prices_org_plan_status_idx" ON "recurring_prices" USING btree ("organization_id","plan_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_org_id_uidx" ON "subscription_plans" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "subscription_plans_org_status_idx" ON "subscription_plans" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_renewals_period_uidx" ON "subscription_renewals" USING btree ("organization_id","environment","subscription_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_renewals_org_id_uidx" ON "subscription_renewals" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "subscription_renewals_retry_idx" ON "subscription_renewals" USING btree ("environment","status","next_retry_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_id_uidx" ON "subscriptions" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "subscriptions_due_idx" ON "subscriptions" USING btree ("environment","status","next_billing_at","id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_customer_idx" ON "subscriptions" USING btree ("organization_id","customer_id","created_at");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_org_fk" FOREIGN KEY ("organization_id","subscription_id") REFERENCES "public"."subscriptions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_subscription_period_uidx" ON "invoices" USING btree ("organization_id","environment","subscription_id","billing_period_start") WHERE "invoices"."subscription_id" is not null;