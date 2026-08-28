import { spawnSync } from "node:child_process";
import { config as loadDotEnv } from "dotenv";
import postgres from "postgres";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
const applicationUrl = process.env.DATABASE_URL;
if (!migrationUrl || !applicationUrl) throw new Error("Database URLs are required.");

const databaseName = "yinne_phase2_verify";
const administration = new URL(migrationUrl);
administration.pathname = "/postgres";
const migrationTarget = new URL(migrationUrl);
migrationTarget.pathname = `/${databaseName}`;
const applicationTarget = new URL(applicationUrl);
applicationTarget.pathname = `/${databaseName}`;
const client = postgres(administration.toString(), { max: 1, prepare: false });

function run(script: "db:migrate" | "db:seed" | "db:check") {
  const result = spawnSync("pnpm", [script], {
    cwd: new URL("../../..", import.meta.url),
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: migrationTarget.toString(),
      DATABASE_URL: applicationTarget.toString(),
    },
    stdio: "inherit",
  });
  if (result.status !== 0)
    throw new Error(`${script} failed against the clean verification database.`);
}

try {
  await client`select pg_terminate_backend(pid) from pg_stat_activity where datname = ${databaseName}`;
  await client.unsafe(`drop database if exists ${databaseName}`);
  await client.unsafe(`create database ${databaseName}`);
  run("db:migrate");
  run("db:seed");
  run("db:check");
  process.stdout.write("Clean-database migration and seed verification passed.\n");
} finally {
  await client`select pg_terminate_backend(pid) from pg_stat_activity where datname = ${databaseName}`;
  await client.unsafe(`drop database if exists ${databaseName}`);
  await client.end();
  process.stdout.write(`Temporary database ${databaseName} was removed.\n`);
}
