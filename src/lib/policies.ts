import { AuditAction, type PolicyStatus, type RiskLineOfBusiness, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requireOrgRole } from "@/lib/rbac";
import { parseDate, parseMoney, type PolicyInput } from "@/lib/validation";

/**
 * Service layer for policies and their coverage line items. Enforces org-scoped
 * RBAC, verifies the parent client belongs to the org, and writes an audit entry
 * on every read/write — same security model as clients and risk profiles.
 *
 * First principles: organizes coverage *data*. It records what coverage exists; it
 * does not assess adequacy or recommend changes — that's Tyler's licensed judgment.
 */

export interface CoverageItemView {
  id: string;
  name: string;
  limit: string | null;
  deductible: string | null;
  description: string | null;
}

export interface PolicyView {
  id: string;
  carrier: string;
  policyNumber: string;
  lineOfBusiness: RiskLineOfBusiness;
  premium: string | null;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  status: PolicyStatus;
  coverageItems: CoverageItemView[];
}

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

/** Lists a client's policies (with coverage items), recording a READ. */
export async function listPolicies(
  userId: string,
  organizationId: string,
  clientId: string,
): Promise<PolicyView[]> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);
  const ok = await assertClientInOrg(clientId, organizationId);
  if (!ok) return [];

  const rows = await prisma.policy.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { coverageItems: true },
  });

  await recordAudit({
    organizationId,
    userId,
    action: AuditAction.READ,
    entityType: "Policy",
    entityId: clientId,
    metadata: { count: rows.length },
  });

  return rows.map((p) => ({
    id: p.id,
    carrier: p.carrier,
    policyNumber: p.policyNumber,
    lineOfBusiness: p.lineOfBusiness,
    premium: p.premium ? p.premium.toString() : null,
    effectiveDate: p.effectiveDate,
    expirationDate: p.expirationDate,
    status: p.status,
    coverageItems: p.coverageItems.map((c) => ({
      id: c.id,
      name: c.name,
      limit: c.limit ? c.limit.toString() : null,
      deductible: c.deductible ? c.deductible.toString() : null,
      description: c.description,
    })),
  }));
}

/** Creates a policy and its coverage items, writing a CREATE audit atomically. */
export async function createPolicy(
  userId: string,
  organizationId: string,
  clientId: string,
  input: PolicyInput,
): Promise<{ id: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);
  const ok = await assertClientInOrg(clientId, organizationId);
  if (!ok) {
    throw new Error("Client not found in this organization");
  }

  return prisma.$transaction(async (tx) => {
    const policy = await tx.policy.create({
      data: {
        clientId,
        carrier: input.carrier,
        policyNumber: input.policyNumber,
        lineOfBusiness: input.lineOfBusiness,
        premium: parseMoney(input.premium),
        effectiveDate: parseDate(input.effectiveDate),
        expirationDate: parseDate(input.expirationDate),
        status: input.status,
        coverageItems: {
          create: input.coverages.map((c) => ({
            name: c.name,
            limit: parseMoney(c.limit),
            deductible: parseMoney(c.deductible),
          })),
        },
      },
      select: { id: true },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.CREATE,
        entityType: "Policy",
        entityId: policy.id,
        metadata: { clientId, lineOfBusiness: input.lineOfBusiness },
      },
      tx,
    );

    return policy;
  });
}

/** Fetches a single policy (org-scoped via its client), recording a READ. */
export async function getPolicy(
  userId: string,
  organizationId: string,
  policyId: string,
): Promise<(PolicyView & { clientId: string }) | null> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  const p = await prisma.policy.findFirst({
    where: { id: policyId, client: { organizationId } },
    include: { coverageItems: true },
  });
  if (!p) return null;

  await recordAudit({
    organizationId,
    userId,
    action: AuditAction.READ,
    entityType: "Policy",
    entityId: p.id,
  });

  return {
    id: p.id,
    carrier: p.carrier,
    policyNumber: p.policyNumber,
    lineOfBusiness: p.lineOfBusiness,
    premium: p.premium ? p.premium.toString() : null,
    effectiveDate: p.effectiveDate,
    expirationDate: p.expirationDate,
    status: p.status,
    coverageItems: p.coverageItems.map((c) => ({
      id: c.id,
      name: c.name,
      limit: c.limit ? c.limit.toString() : null,
      deductible: c.deductible ? c.deductible.toString() : null,
      description: c.description,
    })),
    clientId: p.clientId,
  };
}

/**
 * Updates a policy and replaces its coverage line items (the form sends the full
 * desired set), writing an UPDATE audit atomically.
 */
export async function updatePolicy(
  userId: string,
  organizationId: string,
  policyId: string,
  input: PolicyInput,
): Promise<{ id: string; clientId: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  const existing = await prisma.policy.findFirst({
    where: { id: policyId, client: { organizationId } },
    select: { id: true, clientId: true },
  });
  if (!existing) {
    throw new Error("Policy not found in this organization");
  }

  return prisma.$transaction(async (tx) => {
    await tx.coverageItem.deleteMany({ where: { policyId } });
    await tx.policy.update({
      where: { id: policyId },
      data: {
        carrier: input.carrier,
        policyNumber: input.policyNumber,
        lineOfBusiness: input.lineOfBusiness,
        premium: parseMoney(input.premium),
        effectiveDate: parseDate(input.effectiveDate),
        expirationDate: parseDate(input.expirationDate),
        status: input.status,
        coverageItems: {
          create: input.coverages.map((c) => ({
            name: c.name,
            limit: parseMoney(c.limit),
            deductible: parseMoney(c.deductible),
          })),
        },
      },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.UPDATE,
        entityType: "Policy",
        entityId: policyId,
        metadata: { clientId: existing.clientId, lineOfBusiness: input.lineOfBusiness },
      },
      tx,
    );

    return existing;
  });
}
