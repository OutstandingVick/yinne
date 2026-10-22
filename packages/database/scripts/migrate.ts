import { config as loadDotEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL is required.");

const applicationUrlValue = process.env.DATABASE_URL;
if (!applicationUrlValue) throw new Error("DATABASE_URL is required.");
const applicationUrl = new URL(applicationUrlValue);
const applicationRole = decodeURIComponent(applicationUrl.username);
const applicationPassword = decodeURIComponent(applicationUrl.password);
if (applicationRole !== "yinne_app" || applicationPassword.length < 12) {
  throw new Error("DATABASE_URL must use yinne_app with a password of at least 12 characters.");
}

const client = postgres(migrationUrl, { max: 1, prepare: false });
const database = drizzle(client);
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");

try {
  await migrate(database, { migrationsFolder: directory });
  // The role is created without a password, so the application login is always the one in
  // DATABASE_URL rather than a value committed to the repository.
  const escapedPassword = applicationPassword.replaceAll("'", "''");
  await client.unsafe(`ALTER ROLE yinne_app WITH LOGIN PASSWORD '${escapedPassword}'`);
  console.log("Database migrations are current.");
} finally {
  await client.end();
}
