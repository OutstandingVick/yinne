import { and, eq, isNull, or, sql } from "drizzle-orm";
import { parseApiKeyPrefix, verifyApiKey } from "@yinne/auth/api-keys";
import { verifyPassword } from "@yinne/auth/passwords";
import type { ApiKeyPrincipal } from "@yinne/auth/principal";
import { env } from "@yinne/config";
import { database, apiKeys, users, withTenantTransaction } from "@yinne/database";
import type { OperatingMode } from "@yinne/core";

export interface LocalIdentity {
  id: string;
  email: string;
  name: string;
}

export async function authenticateLocalUser(
  email: string,
  password: string,
): Promise<LocalIdentity | null> {
  const [user] = await database
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.normalizedEmail, email.trim().toLowerCase()))
    .limit(1);
  if (!user?.passwordHash || user.status !== "active") return null;
  if (!(await verifyPassword(user.passwordHash, password))) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function listUserOrganizations(userId: string) {
  return database.execute<{
    organization_id: string;
    member_id: string;
    organization_name: string;
    organization_slug: string;
  }>(sql`select * from yinne_user_organizations(${userId}::uuid)`);
}

export async function authenticateApiKey(secret: string): Promise<ApiKeyPrincipal | null> {
  const prefix = parseApiKeyPrefix(secret);
  if (!prefix) return null;
  const rows = await database.execute<{
    id: string;
    organization_id: string;
    secret_digest: string;
    scopes: string[];
    environment: OperatingMode;
    status: string;
    expires_at: Date | null;
    revoked_at: Date | null;
  }>(sql`select * from yinne_lookup_api_key(${prefix})`);
  const key = rows[0];
  if (!key || key.status !== "active" || key.revoked_at) return null;
  if (key.expires_at && key.expires_at <= new Date()) return null;
  if (!verifyApiKey(secret, key.secret_digest, env().API_KEY_PEPPER)) return null;

  await withTenantTransaction(
    { organizationId: key.organization_id, environment: key.environment },
    async (tx) => {
      await tx
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(
          and(
            eq(apiKeys.organizationId, key.organization_id),
            eq(apiKeys.id, key.id),
            eq(apiKeys.status, "active"),
            or(isNull(apiKeys.expiresAt), sql`${apiKeys.expiresAt} > now()`),
          ),
        );
    },
  );

  return {
    type: "api_key",
    apiKeyId: key.id,
    organizationId: key.organization_id,
    scopes: key.scopes,
    environment: key.environment,
  };
}
