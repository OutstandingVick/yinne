import { spawn } from "node:child_process";
import { config as loadDotEnv } from "dotenv";
import postgres from "postgres";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL is required.");
const workerUrlValue = process.env.WORKER_DATABASE_URL;
if (!workerUrlValue) throw new Error("WORKER_DATABASE_URL is required.");
const workerUrl = new URL(workerUrlValue);
const workerRole = decodeURIComponent(workerUrl.username);
const workerPassword = decodeURIComponent(workerUrl.password);
if (workerRole !== "yinne_worker" || workerPassword.length < 12) {
  throw new Error(
    "WORKER_DATABASE_URL must use yinne_worker with a password of at least 12 characters.",
  );
}

await new Promise<void>((resolve, reject) => {
  const child = spawn("graphile-worker", ["--connection", migrationUrl, "--schema-only"], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error("Graphile Worker migration failed.")),
  );
});

const client = postgres(migrationUrl, { max: 1, prepare: false });
try {
  const escapedWorkerPassword = workerPassword.replaceAll("'", "''");
  await client.unsafe(`
    DO $role$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yinne_worker') THEN
        CREATE ROLE yinne_worker LOGIN PASSWORD '${escapedWorkerPassword}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION BYPASSRLS;
      END IF;
    END
    $role$
  `);
  await client.unsafe("GRANT CONNECT ON DATABASE yinne TO yinne_worker");
  await client.unsafe("GRANT USAGE ON SCHEMA graphile_worker TO yinne_app");
  await client.unsafe(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO yinne_app",
  );
  await client.unsafe(
    "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA graphile_worker TO yinne_app",
  );
  await client.unsafe("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker TO yinne_app");
  await client.unsafe("GRANT USAGE ON SCHEMA graphile_worker TO yinne_worker");
  await client.unsafe(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO yinne_worker",
  );
  await client.unsafe(
    "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA graphile_worker TO yinne_worker",
  );
  await client.unsafe("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker TO yinne_worker");
  await client.unsafe(`
    CREATE OR REPLACE FUNCTION public.yinne_enqueue_outbox_job(
      p_organization_id uuid,
      p_environment text,
      p_outbox_message_id uuid
    ) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, graphile_worker, pg_temp
    AS $function$
    BEGIN
      IF current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id::text
        OR current_setting('app.environment', true) IS DISTINCT FROM p_environment THEN
        RAISE EXCEPTION 'Tenant context does not match the outbox job payload';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.outbox_messages outbox
        JOIN public.events event ON event.id = outbox.event_id
        WHERE outbox.id = p_outbox_message_id
          AND outbox.organization_id = p_organization_id
          AND outbox.state = 'processing'
          AND event.environment = p_environment
      ) THEN
        RAISE EXCEPTION 'The tenant-scoped outbox message is not dispatchable';
      END IF;

      PERFORM graphile_worker.add_job(
        'outbox_dispatch',
        json_build_object(
          'organizationId', p_organization_id,
          'environment', p_environment,
          'outboxMessageId', p_outbox_message_id
        )
      );
    END;
    $function$
  `);
  await client.unsafe(
    "REVOKE ALL ON FUNCTION public.yinne_enqueue_outbox_job(uuid, text, uuid) FROM PUBLIC",
  );
  await client.unsafe(
    "GRANT EXECUTE ON FUNCTION public.yinne_enqueue_outbox_job(uuid, text, uuid) TO yinne_app",
  );
  console.log("Graphile Worker schema and runtime grants are current.");
} finally {
  await client.end();
}
