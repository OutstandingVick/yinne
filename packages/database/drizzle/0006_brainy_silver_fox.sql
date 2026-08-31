CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider_account_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"provider_reference" text,
	"failure_code" text,
	"failure_message" text,
	"request_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_environment_check" CHECK ("payment_attempts"."environment" in ('test', 'live')),
	CONSTRAINT "payment_attempts_status_check" CHECK ("payment_attempts"."status" in ('created', 'submitted', 'pending', 'succeeded', 'failed', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"provider_account_id" uuid NOT NULL,
	"latest_attempt_id" uuid,
	"refunded_amount" bigint DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"succeeded_at" timestamp with time zone,
	CONSTRAINT "payments_environment_check" CHECK ("payments"."environment" in ('test', 'live')),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'partially_refunded', 'refunded')),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_refunded_amount_check" CHECK ("payments"."refunded_amount" >= 0 and "payments"."refunded_amount" <= "payments"."amount"),
	CONSTRAINT "payments_currency_check" CHECK ("payments"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"environment" text NOT NULL,
	"capabilities" jsonb NOT NULL,
	"supported_currencies" jsonb NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_accounts_environment_check" CHECK ("provider_accounts"."environment" in ('test', 'live')),
	CONSTRAINT "provider_accounts_status_check" CHECK ("provider_accounts"."status" in ('enabled', 'disabled')),
	CONSTRAINT "provider_accounts_mock_test_check" CHECK ("provider_accounts"."provider" <> 'mock' or "provider_accounts"."environment" = 'test')
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"provider_account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"type" text NOT NULL,
	"object_reference" text NOT NULL,
	"payload_digest" text NOT NULL,
	"normalized_data" jsonb NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_events_environment_check" CHECK ("provider_events"."environment" in ('test', 'live')),
	CONSTRAINT "provider_events_status_check" CHECK ("provider_events"."status" in ('received', 'processed', 'ignored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"reason" text NOT NULL,
	"provider_reference" text,
	"failure_code" text,
	"failure_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "refunds_environment_check" CHECK ("refunds"."environment" in ('test', 'live')),
	CONSTRAINT "refunds_status_check" CHECK ("refunds"."status" in ('created', 'pending', 'succeeded', 'failed')),
	CONSTRAINT "refunds_amount_check" CHECK ("refunds"."amount" > 0),
	CONSTRAINT "refunds_currency_check" CHECK ("refunds"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"refund_id" uuid,
	"kind" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"provider_reference" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_environment_check" CHECK ("transactions"."environment" in ('test', 'live')),
	CONSTRAINT "transactions_kind_check" CHECK ("transactions"."kind" in ('charge', 'refund')),
	CONSTRAINT "transactions_amount_check" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_currency_check" CHECK ("transactions"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"event_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_status_code" integer,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "webhook_deliveries_environment_check" CHECK ("webhook_deliveries"."environment" in ('test', 'live')),
	CONSTRAINT "webhook_deliveries_status_check" CHECK ("webhook_deliveries"."status" in ('queued', 'delivering', 'retry_scheduled', 'succeeded', 'failed', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_endpoints_environment_check" CHECK ("webhook_endpoints"."environment" in ('test', 'live')),
	CONSTRAINT "webhook_endpoints_status_check" CHECK ("webhook_endpoints"."status" in ('enabled', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_pattern" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payments_org_id_uidx" ON "payments" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accounts_org_id_uidx" ON "provider_accounts" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_org_id_uidx" ON "refunds" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoints_org_id_uidx" ON "webhook_endpoints" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_org_fk" FOREIGN KEY ("organization_id","payment_id") REFERENCES "public"."payments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_provider_account_org_fk" FOREIGN KEY ("organization_id","provider_account_id") REFERENCES "public"."provider_accounts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_org_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."orders"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customers"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_account_org_fk" FOREIGN KEY ("organization_id","provider_account_id") REFERENCES "public"."provider_accounts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_account_org_fk" FOREIGN KEY ("organization_id","provider_account_id") REFERENCES "public"."provider_accounts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_org_fk" FOREIGN KEY ("organization_id","payment_id") REFERENCES "public"."payments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_org_fk" FOREIGN KEY ("organization_id","payment_id") REFERENCES "public"."payments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refund_org_fk" FOREIGN KEY ("organization_id","refund_id") REFERENCES "public"."refunds"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_event_org_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_org_fk" FOREIGN KEY ("organization_id","endpoint_id") REFERENCES "public"."webhook_endpoints"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_endpoint_org_fk" FOREIGN KEY ("organization_id","endpoint_id") REFERENCES "public"."webhook_endpoints"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_org_id_uidx" ON "payment_attempts" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_ref_uidx" ON "payment_attempts" USING btree ("provider_account_id","environment","provider_reference") WHERE "payment_attempts"."provider_reference" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_active_uidx" ON "payment_attempts" USING btree ("organization_id","payment_id") WHERE "payment_attempts"."status" in ('created', 'submitted', 'pending', 'unknown');--> statement-breakpoint
CREATE INDEX "payment_attempts_org_payment_created_idx" ON "payment_attempts" USING btree ("organization_id","payment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_order_succeeded_uidx" ON "payments" USING btree ("organization_id","environment","order_id") WHERE "payments"."status" in ('succeeded', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE INDEX "payments_org_env_created_idx" ON "payments" USING btree ("organization_id","environment","created_at","id");--> statement-breakpoint
CREATE INDEX "payments_org_order_idx" ON "payments" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accounts_org_provider_env_label_uidx" ON "provider_accounts" USING btree ("organization_id","provider","environment","label");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accounts_default_uidx" ON "provider_accounts" USING btree ("organization_id","environment") WHERE "provider_accounts"."is_default" and "provider_accounts"."status" = 'enabled';--> statement-breakpoint
CREATE INDEX "provider_accounts_org_env_status_idx" ON "provider_accounts" USING btree ("organization_id","environment","status");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_org_id_uidx" ON "provider_events" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_account_external_uidx" ON "provider_events" USING btree ("provider_account_id","environment","external_id");--> statement-breakpoint
CREATE INDEX "provider_events_org_received_idx" ON "provider_events" USING btree ("organization_id","received_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_provider_ref_uidx" ON "refunds" USING btree ("organization_id","environment","provider_reference") WHERE "refunds"."provider_reference" is not null;--> statement-breakpoint
CREATE INDEX "refunds_org_payment_created_idx" ON "refunds" USING btree ("organization_id","payment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_org_id_uidx" ON "transactions" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_provider_evidence_uidx" ON "transactions" USING btree ("organization_id","environment","kind","provider_reference");--> statement-breakpoint
CREATE INDEX "transactions_org_payment_created_idx" ON "transactions" USING btree ("organization_id","payment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_org_id_uidx" ON "webhook_deliveries" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_event_endpoint_generation_uidx" ON "webhook_deliveries" USING btree ("event_id","endpoint_id","generation");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_next_idx" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoints_org_env_url_uidx" ON "webhook_endpoints" USING btree ("organization_id","environment","url");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_subscriptions_org_id_uidx" ON "webhook_subscriptions" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_subscriptions_endpoint_pattern_uidx" ON "webhook_subscriptions" USING btree ("endpoint_id","event_pattern");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON provider_accounts, payments, payment_attempts, refunds, provider_events, webhook_endpoints, webhook_deliveries TO yinne_app;
GRANT SELECT, INSERT ON transactions, webhook_subscriptions TO yinne_app;--> statement-breakpoint
ALTER TABLE provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY provider_accounts_tenant_policy ON provider_accounts USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY payments_tenant_policy ON payments USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_attempts_tenant_policy ON payment_attempts USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds FORCE ROW LEVEL SECURITY;
CREATE POLICY refunds_tenant_policy ON refunds USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY transactions_tenant_policy ON transactions USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_events FORCE ROW LEVEL SECURITY;
CREATE POLICY provider_events_tenant_policy ON provider_events USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_endpoints_tenant_policy ON webhook_endpoints USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_subscriptions_tenant_policy ON webhook_subscriptions
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_tenant_policy ON webhook_deliveries USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);--> statement-breakpoint
CREATE TRIGGER transactions_immutable BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION yinne_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER provider_events_no_delete BEFORE DELETE ON provider_events
  FOR EACH ROW EXECUTE FUNCTION yinne_reject_immutable_change();
