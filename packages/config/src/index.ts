import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  WORKER_DATABASE_URL: z.string().url(),
  MIGRATION_DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32),
  API_KEY_PEPPER: z.string().min(32),
  AUTH_TRUST_HOST: z.coerce.boolean().default(false),
  NEXT_PUBLIC_YINNE_MODE: z.enum(["test", "live"]).default("test"),
  YINNE_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  YINNE_SEED_PASSWORD: z.string().min(12).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Environment = z.infer<typeof schema>;

let cached: Environment | undefined;

export function env(): Environment {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error("Invalid environment configuration: " + fields);
  }
  cached = parsed.data;
  return cached;
}

export function allowedOrigins(): ReadonlySet<string> {
  return new Set(
    env()
      .YINNE_ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function resetEnvironmentForTests(): void {
  cached = undefined;
}
