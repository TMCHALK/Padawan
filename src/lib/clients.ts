import { AuditAction, ClientStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requireOrgRole } from "@/lib/rbac";
import {
  decrypt,
  decryptOptional,
  encrypt,
  encryptOptional,
} from "@/lib/crypto";
import { buildDisplayName, type ClientInput } from "@/lib/validation";

/**
 * Service layer for client records. Every function enforces org-scoped RBAC,
 * encrypts/decrypts PII at the boundary, and writes an audit entry — so callers
 * (UI, API) cannot accidentally bypass those controls.
 */

export interface DecryptedClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dob: string | null;
  displayName: string;
  status: ClientStatus;
  hubspotContactId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientListItem {
  id: string;
  displayName: string;
  status: ClientStatus;
  createdAt: Date;
}

/** Lists clients in an org (non-PII summary), with optional case-insensitive search. */
export async function listClients(
  userId: string,
  organizationId: string,
  search?: string,
): Promise<ClientListItem[]> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  return prisma.client.findMany({
    where: {
      organizationId,
      ...(search
        ? { displayName: { contains: search, mode: "insensitive" } }
        : {}),
    },
    select: { id: true, displayName: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Fetches and decrypts a single client, recording a READ in the audit log. */
export async function getClient(
  userId: string,
  organizationId: string,
  clientId: string,
): Promise<DecryptedClient | null> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
  });
  if (!client) return null;

  await recordAudit({
    organizationId,
    userId,
    action: AuditAction.READ,
    entityType: "Client",
    entityId: client.id,
  });

  return {
    id: client.id,
    firstName: decrypt(client.firstNameEnc),
    lastName: decrypt(client.lastNameEnc),
    email: decryptOptional(client.emailEnc),
    phone: decryptOptional(client.phoneEnc),
    address: decryptOptional(client.addressEnc),
    dob: decryptOptional(client.dobEnc),
    displayName: client.displayName,
    status: client.status,
    hubspotContactId: client.hubspotContactId,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

/** Creates a client: encrypts PII, writes the row and a CREATE audit entry atomically. */
export async function createClient(
  userId: string,
  organizationId: string,
  input: ClientInput,
): Promise<{ id: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  const created = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        organizationId,
        firstNameEnc: encrypt(input.firstName),
        lastNameEnc: encrypt(input.lastName),
        emailEnc: encryptOptional(input.email),
        phoneEnc: encryptOptional(input.phone),
        addressEnc: encryptOptional(input.address),
        dobEnc: encryptOptional(input.dob),
        displayName: buildDisplayName(input.firstName, input.lastName),
        status: input.status,
      },
      select: { id: true },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.CREATE,
        entityType: "Client",
        entityId: client.id,
      },
      tx,
    );

    return client;
  });

  return created;
}
