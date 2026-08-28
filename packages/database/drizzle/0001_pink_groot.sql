CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"secret_digest" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"environment" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"outcome" text DEFAULT 'succeeded' NOT NULL,
	"request_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" text NOT NULL,
	"version" integer NOT NULL,
	"api_version" text NOT NULL,
	"environment" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"aggregate_version" integer NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"request_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"principal_id" text NOT NULL,
	"operation" text NOT NULL,
	"environment" text NOT NULL,
	"key_digest" text NOT NULL,
	"request_digest" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"locked_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_name" text,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"staff_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"default_currency" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seed_versions" (
	"key" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"auth_subject" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_org_id_uidx" ON "merchants" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_id_uidx" ON "organization_members" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_org_id_uidx" ON "events" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_merchant_org_fk" FOREIGN KEY ("organization_id","merchant_id") REFERENCES "public"."merchants"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_event_org_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_member_org_fk" FOREIGN KEY ("organization_id","member_id") REFERENCES "public"."organization_members"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_prefix_uidx" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_org_id_uidx" ON "api_keys" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "api_keys_org_status_idx" ON "api_keys" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_org_actor_idx" ON "audit_logs" USING btree ("organization_id","actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_org_target_idx" ON "audit_logs" USING btree ("organization_id","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_aggregate_version_uidx" ON "events" USING btree ("organization_id","aggregate_type","aggregate_id","aggregate_version","type");--> statement-breakpoint
CREATE INDEX "events_org_type_created_idx" ON "events" USING btree ("organization_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_scope_key_uidx" ON "idempotency_records" USING btree ("organization_id","principal_id","operation","environment","key_digest");--> statement-breakpoint
CREATE INDEX "idempotency_expiry_idx" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_org_merchant_name_uidx" ON "locations" USING btree ("organization_id","merchant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_org_id_uidx" ON "locations" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "locations_org_status_idx" ON "locations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_org_slug_uidx" ON "merchants" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "merchants_org_status_idx" ON "merchants" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_uidx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_status_idx" ON "organization_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_event_topic_uidx" ON "outbox_messages" USING btree ("event_id","topic");--> statement-breakpoint
CREATE INDEX "outbox_state_available_idx" ON "outbox_messages" USING btree ("state","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_uidx" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignments_unique_scope_uidx" ON "role_assignments" USING btree ("organization_id","member_id","role_id","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "role_assignments_member_idx" ON "role_assignments" USING btree ("organization_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_uidx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_uidx" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_normalized_email_uidx" ON "users" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_subject_uidx" ON "users" USING btree ("auth_subject");
--> statement-breakpoint
ALTER TABLE organizations ADD CONSTRAINT organizations_status_check CHECK (status IN ('active', 'suspended', 'closed'));
ALTER TABLE organizations ADD CONSTRAINT organizations_currency_check CHECK (default_currency ~ '^[A-Z]{3}$');
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled'));
ALTER TABLE organization_members ADD CONSTRAINT organization_members_status_check CHECK (status IN ('invited', 'active', 'suspended', 'removed'));
ALTER TABLE role_assignments ADD CONSTRAINT role_assignments_scope_check CHECK (scope_type IN ('organization', 'merchant', 'location'));
ALTER TABLE merchants ADD CONSTRAINT merchants_status_check CHECK (status IN ('active', 'suspended', 'archived'));
ALTER TABLE locations ADD CONSTRAINT locations_type_check CHECK (type IN ('store', 'restaurant', 'office', 'branch', 'warehouse', 'pop_up', 'agent'));
ALTER TABLE locations ADD CONSTRAINT locations_status_check CHECK (status IN ('active', 'inactive', 'archived'));
ALTER TABLE api_keys ADD CONSTRAINT api_keys_environment_check CHECK (environment IN ('test', 'live'));
ALTER TABLE api_keys ADD CONSTRAINT api_keys_status_check CHECK (status IN ('active', 'revoked', 'expired'));
ALTER TABLE events ADD CONSTRAINT events_environment_check CHECK (environment IN ('test', 'live'));
ALTER TABLE outbox_messages ADD CONSTRAINT outbox_state_check CHECK (state IN ('pending', 'processing', 'processed', 'failed'));
ALTER TABLE outbox_messages ADD CONSTRAINT outbox_attempts_check CHECK (attempts >= 0);
ALTER TABLE idempotency_records ADD CONSTRAINT idempotency_environment_check CHECK (environment IN ('test', 'live'));
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yinne_app') THEN
    CREATE ROLE yinne_app LOGIN PASSWORD 'yinne_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
  END IF;
END
$$;
--> statement-breakpoint
GRANT CONNECT ON DATABASE yinne TO yinne_app;
GRANT USAGE ON SCHEMA public TO yinne_app;
GRANT SELECT, INSERT, UPDATE ON users TO yinne_app;
GRANT SELECT ON roles, permissions, role_permissions TO yinne_app;
GRANT SELECT, INSERT, UPDATE ON organizations, organization_members, role_assignments, merchants, locations, api_keys, idempotency_records TO yinne_app;
GRANT SELECT, INSERT ON audit_logs, events, outbox_messages TO yinne_app;
GRANT UPDATE ON outbox_messages TO yinne_app;
CREATE SCHEMA IF NOT EXISTS graphile_worker AUTHORIZATION yinne_app;
GRANT USAGE, CREATE ON SCHEMA graphile_worker TO yinne_app;
--> statement-breakpoint
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant_policy ON organizations
  USING (id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_members_tenant_policy ON organization_members
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY role_assignments_tenant_policy ON role_assignments
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants FORCE ROW LEVEL SECURITY;
CREATE POLICY merchants_tenant_policy ON merchants
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations FORCE ROW LEVEL SECURITY;
CREATE POLICY locations_tenant_policy ON locations
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant_policy ON api_keys
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
    AND environment = nullif(current_setting('app.environment', true), '')
  );
--> statement-breakpoint
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_policy ON audit_logs
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
CREATE POLICY events_tenant_policy ON events
  USING (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
    AND environment = nullif(current_setting('app.environment', true), '')
  )
  WITH CHECK (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
    AND environment = nullif(current_setting('app.environment', true), '')
  );
--> statement-breakpoint
ALTER TABLE outbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY outbox_messages_tenant_policy ON outbox_messages
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records FORCE ROW LEVEL SECURITY;
CREATE POLICY idempotency_records_tenant_policy ON idempotency_records
  USING (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
    AND environment = nullif(current_setting('app.environment', true), '')
  )
  WITH CHECK (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
    AND environment = nullif(current_setting('app.environment', true), '')
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION yinne_authenticate_local(p_email text)
RETURNS TABLE (id uuid, email text, name text, password_hash text, status text)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.id, u.email, u.name, u.password_hash, u.status
  FROM public.users u
  WHERE u.normalized_email = lower(trim(p_email))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION yinne_authenticate_local(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_authenticate_local(text) TO yinne_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION yinne_user_organizations(p_user_id uuid)
RETURNS TABLE (organization_id uuid, member_id uuid, organization_name text, organization_slug text)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT o.id, m.id, o.name, o.slug
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id AND m.status = 'active' AND o.status = 'active'
  ORDER BY o.name, o.id
$$;
REVOKE ALL ON FUNCTION yinne_user_organizations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_user_organizations(uuid) TO yinne_app;
CREATE OR REPLACE FUNCTION yinne_lookup_api_key(p_prefix text)
RETURNS TABLE (
  id uuid, organization_id uuid, secret_digest text, scopes jsonb,
  environment text, status text, expires_at timestamptz, revoked_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT k.id, k.organization_id, k.secret_digest, k.scopes,
         k.environment, k.status, k.expires_at, k.revoked_at
  FROM public.api_keys k
  WHERE k.prefix = p_prefix
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION yinne_lookup_api_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yinne_lookup_api_key(text) TO yinne_app;
