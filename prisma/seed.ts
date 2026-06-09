import { PrismaClient, RiskLineOfBusiness, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt, encryptOptional } from "../src/lib/crypto";
import { buildDisplayName } from "../src/lib/validation";

/**
 * Seeds the database with a demo org, an owner login, and SYNTHETIC clients.
 * No real PII ever belongs in this file.
 *
 * Demo login: demo@padawan.local / password123
 */
const prisma = new PrismaClient();

const SYNTHETIC_CLIENTS = [
  { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "555-0100" },
  { firstName: "Grace", lastName: "Hopper", email: "grace@example.com", phone: "555-0101" },
  { firstName: "Alan", lastName: "Turing", email: "alan@example.com", phone: "555-0102" },
];

async function main() {
  if (!process.env.PII_ENCRYPTION_KEY) {
    throw new Error("Set PII_ENCRYPTION_KEY before seeding (see .env.example).");
  }

  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: { id: "seed-org", name: "Demo Brokerage" },
  });

  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@padawan.local" },
    update: {},
    create: { email: "demo@padawan.local", name: "Demo Owner", passwordHash },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: Role.OWNER },
  });

  const existing = await prisma.client.count({ where: { organizationId: org.id } });
  if (existing === 0) {
    for (const [i, c] of SYNTHETIC_CLIENTS.entries()) {
      const client = await prisma.client.create({
        data: {
          organizationId: org.id,
          firstNameEnc: encrypt(c.firstName),
          lastNameEnc: encrypt(c.lastName),
          emailEnc: encryptOptional(c.email),
          phoneEnc: encryptOptional(c.phone),
          displayName: buildDisplayName(c.firstName, c.lastName),
        },
      });

      // Give the first client a sample risk profile so the end-to-end loop
      // (capture risk data -> download submission PDF) is demonstrable on a
      // fresh seed. Synthetic data only.
      if (i === 0) {
        await prisma.riskProfile.create({
          data: {
            clientId: client.id,
            lineOfBusiness: RiskLineOfBusiness.AUTO,
            attributes: {
              "Vehicle VIN": "1HGCM82633A004352",
              "Vehicle Year": "2020",
              "Primary Use": "Commute",
              "Annual Mileage": "12000",
            },
            notes: "Garaged overnight; single driver.",
          },
        });
      }
    }
  }

  console.log("Seeded demo org, owner (demo@padawan.local / password123), and clients.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
