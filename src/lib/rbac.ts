import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Org-scoped authorization. Every access to client data must resolve a
 * membership first, so a user can only ever touch data in orgs they belong to.
 */

// Capability ranking: OWNER ⊇ BROKER ⊇ VIEWER.
const ROLE_RANK: Record<Role, number> = {
  [Role.VIEWER]: 1,
  [Role.BROKER]: 2,
  [Role.OWNER]: 3,
};

export function roleSatisfies(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Resolves the caller's role in an org, throwing if they are not a member or
 * lack the required role. Returns the membership's role on success.
 */
export async function requireOrgRole(
  userId: string,
  organizationId: string,
  required: Role = Role.VIEWER,
): Promise<Role> {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });

  if (!membership) {
    throw new AuthorizationError("You are not a member of this organization");
  }
  if (!roleSatisfies(membership.role, required)) {
    throw new AuthorizationError(
      `This action requires the ${required} role or higher`,
    );
  }
  return membership.role;
}
