import { AuditAction, Prisma, type RiskLineOfBusiness, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requireOrgRole } from "@/lib/rbac";
import type { RiskProfileInput } from "@/lib/validation";

/**
 * Service layer for structured risk data. Like the client service, every function
 * enforces org-scoped RBAC, verifies the parent client belongs to the org, and
 * writes an audit entry — so risk data can never be read or written outside an
 * authorized, recorded path.
 *
 * First principles: this owns the "risk data in / structured" job. It organizes
 * data; it makes no placement or coverage judgment.
 */

export interface RiskProfileView {
  id: string;
  lineOfBusiness: RiskLineOfBusiness;
  attributes: Record<string, string>;
  riskScore: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Confirms a client exists within the org, returning its id or null. */
async function assertClientInOrg(
  clientId: string,
  organizationId: string,
): Promise<string | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  return client?.id ?? null;
}

function toView(row: {
  id: string;
  lineOfBusiness: RiskLineOfBusiness;
  attributes: Prisma.JsonValue;
  riskScore: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RiskProfileView {
  // attributes is stored as a JSON object of string→string; coerce defensively.
  const attributes: Record<string, string> = {};
  if (row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)) {
    for (const [k, v] of Object.entries(row.attributes as Record<string, unknown>)) {
      attributes[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  return {
    id: row.id,
    lineOfBusiness: row.lineOfBusiness,
    attributes,
    riskScore: row.riskScore,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Lists a client's risk profiles, recording a READ in the audit log. */
export async function listRiskProfiles(
  userId: string,
  organizationId: string,
  clientId: string,
): Promise<RiskProfileView[]> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);
  const ok = await assertClientInOrg(clientId, organizationId);
  if (!ok) return [];

  const rows = await prisma.riskProfile.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  await recordAudit({
    organizationId,
    userId,
    action: AuditAction.READ,
    entityType: "RiskProfile",
    entityId: clientId,
    metadata: { count: rows.length },
  });

  return rows.map(toView);
}

/** Creates a risk profile for a client; writes the row + a CREATE audit atomically. */
export async function createRiskProfile(
  userId: string,
  organizationId: string,
  clientId: string,
  input: RiskProfileInput,
): Promise<{ id: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);
  const ok = await assertClientInOrg(clientId, organizationId);
  if (!ok) {
    throw new Error("Client not found in this organization");
  }

  return prisma.$transaction(async (tx) => {
    const profile = await tx.riskProfile.create({
      data: {
        clientId,
        lineOfBusiness: input.lineOfBusiness,
        attributes: input.attributes as Prisma.InputJsonValue,
        notes: input.notes ? input.notes : null,
      },
      select: { id: true },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.CREATE,
        entityType: "RiskProfile",
        entityId: profile.id,
        metadata: { clientId, lineOfBusiness: input.lineOfBusiness },
      },
      tx,
    );

    return profile;
  });
}

/** Fetches a single risk profile (org-scoped via its client), recording a READ. */
export async function getRiskProfile(
  userId: string,
  organizationId: string,
  profileId: string,
): Promise<(RiskProfileView & { clientId: string }) | null> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  const row = await prisma.riskProfile.findFirst({
    where: { id: profileId, client: { organizationId } },
  });
  if (!row) return null;

  await recordAudit({
    organizationId,
    userId,
    action: AuditAction.READ,
    entityType: "RiskProfile",
    entityId: row.id,
  });

  return { ...toView(row), clientId: row.clientId };
}

/** Updates a risk profile (line of business, attributes, notes), writing an UPDATE audit. */
export async function updateRiskProfile(
  userId: string,
  organizationId: string,
  profileId: string,
  input: RiskProfileInput,
): Promise<{ id: string; clientId: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  const existing = await prisma.riskProfile.findFirst({
    where: { id: profileId, client: { organizationId } },
    select: { id: true, clientId: true },
  });
  if (!existing) {
    throw new Error("Risk profile not found in this organization");
  }

  return prisma.$transaction(async (tx) => {
    await tx.riskProfile.update({
      where: { id: profileId },
      data: {
        lineOfBusiness: input.lineOfBusiness,
        attributes: input.attributes as Prisma.InputJsonValue,
        notes: input.notes ? input.notes : null,
      },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.UPDATE,
        entityType: "RiskProfile",
        entityId: profileId,
        metadata: { clientId: existing.clientId, lineOfBusiness: input.lineOfBusiness },
      },
      tx,
    );

    return existing;
  });
}
