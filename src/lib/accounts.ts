import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SignUpInput } from "@/lib/validation";

export class SignUpError extends Error {}

/**
 * Creates a new user, their first organization, and an OWNER membership in a
 * single transaction. This is how a broker bootstraps their own workspace before
 * inviting others.
 */
export async function registerUserAndOrg(input: SignUpInput): Promise<{ userId: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new SignUpError("An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: input.organizationName },
      select: { id: true },
    });
    const created = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
      select: { id: true },
    });
    await tx.membership.create({
      data: { userId: created.id, organizationId: org.id, role: Role.OWNER },
    });
    return created;
  });

  return { userId: user.id };
}
