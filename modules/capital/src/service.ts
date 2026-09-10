import { and, desc, eq } from "drizzle-orm";
import { requirePermission, type RequestContext } from "@yinne/application";
import { capitalProfileSchema, type CapitalProfile } from "@yinne/contracts";
import { createId } from "@yinne/core";
import { capitalProfiles, organizations, withTenantTransaction } from "@yinne/database";
import { buildCapitalProfile } from "./profile";
import { analyticsCapitalSignalProvider, type CapitalSignalProvider } from "./signals";

function mapProfile(row: typeof capitalProfiles.$inferSelect): CapitalProfile {
  return capitalProfileSchema.parse({
    id: row.id,
    organization_id: row.organizationId,
    environment: row.environment,
    status: row.status,
    model_version: row.modelVersion,
    currency: row.currency,
    score: row.score,
    band: row.band,
    data_sufficiency: row.dataSufficiency,
    calculated_at: row.calculatedAt.toISOString(),
    lookback_start: row.lookbackStart.toISOString(),
    lookback_end: row.lookbackEnd.toISOString(),
    dimensions: row.dimensions,
    signals: row.signals,
    strengths: row.strengths,
    watch_areas: row.watchAreas,
    missing_requirements: row.missingRequirements,
    score_change: row.scoreChange,
    limitations: row.limitations,
  });
}

async function authorize(
  context: RequestContext,
  permission: "capital:read" | "capital:recalculate",
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, permission, {
      organizationId: context.tenant.organizationId,
    });
  });
}

export async function currentCapitalProfile(
  context: RequestContext,
): Promise<CapitalProfile | null> {
  await authorize(context, "capital:read");
  return withTenantTransaction(context.tenant, async (tx) => {
    const [row] = await tx
      .select()
      .from(capitalProfiles)
      .where(
        and(
          eq(capitalProfiles.organizationId, context.tenant.organizationId),
          eq(capitalProfiles.environment, context.tenant.environment),
        ),
      )
      .orderBy(desc(capitalProfiles.calculatedAt), desc(capitalProfiles.createdAt))
      .limit(1);
    return row ? mapProfile(row) : null;
  });
}

export async function capitalProfileHistory(
  context: RequestContext,
  limit = 20,
): Promise<CapitalProfile[]> {
  await authorize(context, "capital:read");
  return withTenantTransaction(context.tenant, async (tx) =>
    (
      await tx
        .select()
        .from(capitalProfiles)
        .where(
          and(
            eq(capitalProfiles.organizationId, context.tenant.organizationId),
            eq(capitalProfiles.environment, context.tenant.environment),
          ),
        )
        .orderBy(desc(capitalProfiles.calculatedAt), desc(capitalProfiles.createdAt))
        .limit(Math.max(1, Math.min(100, limit)))
    ).map(mapProfile),
  );
}

export async function calculateCapitalProfile(
  context: RequestContext,
  asOf = new Date(),
  requestedCurrency?: string,
  provider: CapitalSignalProvider = analyticsCapitalSignalProvider,
): Promise<CapitalProfile> {
  const settings = await withTenantTransaction(context.tenant, async (tx) => {
    const [organization] = await tx
      .select({ currency: organizations.defaultCurrency })
      .from(organizations)
      .where(eq(organizations.id, context.tenant.organizationId))
      .limit(1);
    if (!organization) throw new Error("Organization is unavailable.");
    return organization;
  });
  const currency = requestedCurrency ?? settings.currency;
  const features = await provider.load(context, currency, asOf);
  return withTenantTransaction(context.tenant, async (tx) => {
    const [previousRow] = await tx
      .select()
      .from(capitalProfiles)
      .where(
        and(
          eq(capitalProfiles.organizationId, context.tenant.organizationId),
          eq(capitalProfiles.environment, context.tenant.environment),
          eq(capitalProfiles.currency, currency),
        ),
      )
      .orderBy(desc(capitalProfiles.calculatedAt), desc(capitalProfiles.createdAt))
      .limit(1);
    const profile = buildCapitalProfile(
      createId(),
      context.tenant.organizationId,
      context.tenant.environment,
      features,
      asOf,
      previousRow ? mapProfile(previousRow) : null,
    );
    const [inserted] = await tx
      .insert(capitalProfiles)
      .values({
        id: profile.id,
        organizationId: profile.organization_id,
        environment: profile.environment,
        modelVersion: profile.model_version,
        currency: profile.currency,
        status: profile.status,
        score: profile.score,
        band: profile.band,
        dataSufficiency: profile.data_sufficiency,
        calculatedAt: new Date(profile.calculated_at),
        lookbackStart: new Date(profile.lookback_start),
        lookbackEnd: new Date(profile.lookback_end),
        dimensions: profile.dimensions,
        signals: profile.signals,
        strengths: profile.strengths,
        watchAreas: profile.watch_areas,
        missingRequirements: profile.missing_requirements,
        scoreChange: profile.score_change,
        limitations: profile.limitations,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) return mapProfile(inserted);
    const [existing] = await tx
      .select()
      .from(capitalProfiles)
      .where(
        and(
          eq(capitalProfiles.organizationId, profile.organization_id),
          eq(capitalProfiles.environment, profile.environment),
          eq(capitalProfiles.modelVersion, profile.model_version),
          eq(capitalProfiles.currency, profile.currency),
          eq(capitalProfiles.lookbackEnd, new Date(profile.lookback_end)),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Capital profile replay lookup failed.");
    return mapProfile(existing);
  });
}

export { mapProfile };
