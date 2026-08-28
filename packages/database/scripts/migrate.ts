import { config as loadDotEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL is required.");

const client = postgres(migrationUrl, { max: 1, prepare: false });
const database = drizzle(client);
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");

try {
  await migrate(database, { migrationsFolder: directory });
  console.log("Database migrations are current.");
} finally {
  await client.end();
}
