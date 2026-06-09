import { AuditAction, type Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/rbac";

/**
 * Read side of the audit log. OWNER-only: surfacing who accessed what is a
 * privileged, organization-administrative view, so it sits above the
 * read/write access that BROKER/VIEWER have to the data itself.
 */

export interface AuditLogView {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorEmail: string | null;
  createdAt: Date;
  /** Non-sensitive context only — never holds raw PII (enforced on write). */
  metadata: Prisma.JsonValue;
}

/** Human-readable label for an audit action. Pure — safe to unit-test. */
export function auditActionLabel(action: AuditAction): string {
  switch (action) {
    case AuditAction.CREATE:
      return "Created";
    case AuditAction.READ:
      return "Viewed";
    case AuditAction.UPDATE:
      return "Updated";
    case AuditAction.DELETE:
      return "Deleted";
    default: {
      // Exhaustiveness guard: a new AuditAction value will fail typecheck here.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Lists recent audit entries for an organization, newest first. Throws
 * `AuthorizationError` if the caller is not an OWNER of the org.
 */
export async function listAuditLogs(
  userId: string,
  organizationId: string,
  limit = 100,
): Promise<AuditLogView[]> {
  await requireOrgRole(userId, organizationId, Role.OWNER);

  const rows = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true, name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorEmail: row.user?.email ?? null,
    createdAt: row.createdAt,
    metadata: row.metadata ?? null,
  }));
}
