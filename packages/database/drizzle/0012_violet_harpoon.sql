CREATE TABLE "capital_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"model_version" text NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"score" integer,
	"band" text,
	"data_sufficiency" text NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL,
	"lookback_start" timestamp with time zone NOT NULL,
	"lookback_end" timestamp with time zone NOT NULL,
	"dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"watch_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score_change" jsonb,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capital_profiles_environment_check" CHECK ("capital_profiles"."environment" in ('test', 'live')),
	CONSTRAINT "capital_profiles_currency_check" CHECK ("capital_profiles"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "capital_profiles_status_check" CHECK ("capital_profiles"."status" in ('scored', 'insufficient_data')),
	CONSTRAINT "capital_profiles_score_check" CHECK ("capital_profiles"."score" is null or "capital_profiles"."score" between 0 and 100),
	CONSTRAINT "capital_profiles_band_check" CHECK ("capital_profiles"."band" is null or "capital_profiles"."band" in ('limited', 'developing', 'stable', 'highly_stable')),
	CONSTRAINT "capital_profiles_sufficiency_check" CHECK ("capital_profiles"."data_sufficiency" in ('insufficient', 'limited', 'sufficient', 'strong')),
	CONSTRAINT "capital_profiles_score_status_check" CHECK (("capital_profiles"."status" = 'scored' and "capital_profiles"."score" is not null and "capital_profiles"."band" is not null) or ("capital_profiles"."status" = 'insufficient_data' and "capital_profiles"."score" is null and "capital_profiles"."band" is null)),
	CONSTRAINT "capital_profiles_window_check" CHECK ("capital_profiles"."lookback_end" > "capital_profiles"."lookback_start")
);
--> statement-breakpoint
ALTER TABLE "capital_profiles" ADD CONSTRAINT "capital_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capital_profiles_replay_uidx" ON "capital_profiles" USING btree ("organization_id","environment","model_version","currency","lookback_end");--> statement-breakpoint
CREATE UNIQUE INDEX "capital_profiles_org_id_uidx" ON "capital_profiles" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "capital_profiles_latest_idx" ON "capital_profiles" USING btree ("organization_id","environment","currency","calculated_at");
--> statement-breakpoint
GRANT SELECT, INSERT ON capital_profiles TO yinne_app;
--> statement-breakpoint
ALTER TABLE capital_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY capital_profiles_tenant_policy ON capital_profiles USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  AND environment = nullif(current_setting('app.environment', true), '')
);
--> statement-breakpoint
CREATE TRIGGER capital_profiles_immutable BEFORE UPDATE OR DELETE ON capital_profiles
  FOR EACH ROW EXECUTE FUNCTION yinne_reject_immutable_change();
