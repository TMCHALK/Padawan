import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  /** Non-sensitive context only — never put raw PII here. */
  metadata?: Prisma.InputJsonValue;
}

/**
 * Records an access to client data in the append-only audit log.
 *
 * Pass a transaction client (`tx`) when the audit write should be atomic with the
 * data change it describes, so a row can never be modified without a matching log.
 */
export async function recordAudit(entry: AuditEntry, db: Db = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      organizationId: entry.organizationId,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata,
    },
  });
}
