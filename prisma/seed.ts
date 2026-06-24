import { PipelineStage, PrismaClient, RiskLineOfBusiness, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt, encryptOptional, hashEmailOptional } from "../src/lib/crypto";
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
    const createdClients: { id: string; displayName: string }[] = [];
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
      createdClients.push({ id: client.id, displayName: client.displayName });

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

    // Synthetic sales-pipeline deals, demonstrating each stage, estimated value /
    // probability / next action, and the Gmail-driven activity fields. `amount` is
    // open-pipeline sizing, not booked revenue. The suggestedStage on the proposed
    // deal shows a Gmail-raised outcome the broker would confirm; it is never auto-set.
    const days = (n: number) => new Date(Date.now() - n * 86_400_000);
    const SYNTHETIC_DEALS = [
      {
        name: "Lovelace Auto — new business",
        stage: PipelineStage.QUOTING,
        amount: "8500",
        probability: 50,
        nextAction: "Send revised quote; follow up Friday.",
        email: "ada@example.com",
        clientId: createdClients[0]?.id ?? null,
        gmailThreadId: "thread-ada-001",
        lastActivityAt: days(1),
        lastSignal: "quote_sent",
        suggestedStage: null,
      },
      {
        name: "Hopper Homeowners — renewal",
        stage: PipelineStage.PROPOSED,
        amount: "12000",
        probability: 75,
        nextAction: "Confirm bind + effective date with client.",
        email: "grace@example.com",
        clientId: createdClients[1]?.id ?? null,
        gmailThreadId: "thread-grace-001",
        lastActivityAt: days(3),
        lastSignal: "proposal_sent",
        suggestedStage: PipelineStage.WON,
      },
      {
        name: "Turing Umbrella — qualified lead",
        stage: PipelineStage.QUALIFIED,
        amount: "4000",
        probability: 30,
        nextAction: "Collect prior carrier docs.",
        email: "alan@example.com",
        clientId: createdClients[2]?.id ?? null,
        gmailThreadId: null,
        lastActivityAt: days(6),
        lastSignal: null,
        suggestedStage: null,
      },
      {
        name: "Babbage Manufacturing — GL",
        stage: PipelineStage.WON,
        amount: "26000",
        probability: 100,
        nextAction: "Issue policy documents.",
        email: "charles@example.com",
        clientId: null,
        gmailThreadId: "thread-babbage-001",
        lastActivityAt: days(10),
        lastSignal: "won",
        suggestedStage: null,
      },
      {
        name: "Nightingale Clinic — package",
        stage: PipelineStage.LOST,
        amount: "18000",
        probability: 0,
        nextAction: "Lost to incumbent — note reason.",
        email: "flo@example.com",
        clientId: null,
        gmailThreadId: "thread-flo-001",
        lastActivityAt: days(20),
        lastSignal: "lost",
        suggestedStage: null,
      },
      {
        name: "Shannon Cyber — prospect",
        stage: PipelineStage.CIRCLE_BACK,
        amount: "9000",
        probability: 20,
        nextAction: "Revisit at renewal (Q1).",
        email: "claude@example.com",
        clientId: null,
        gmailThreadId: "thread-shannon-001",
        lastActivityAt: days(45),
        lastSignal: "circle_back",
        suggestedStage: null,
      },
    ];

    for (const d of SYNTHETIC_DEALS) {
      await prisma.deal.create({
        data: {
          organizationId: org.id,
          clientId: d.clientId,
          name: d.name,
          stage: d.stage,
          amount: d.amount,
          probability: d.probability,
          nextAction: d.nextAction,
          counterpartyEmailEnc: encryptOptional(d.email),
          counterpartyEmailHash: hashEmailOptional(d.email),
          gmailThreadId: d.gmailThreadId,
          lastActivityAt: d.lastActivityAt,
          lastSignal: d.lastSignal,
          suggestedStage: d.suggestedStage,
        },
      });
    }
  }

  console.log(
    "Seeded demo org, owner (demo@padawan.local / password123), clients, and pipeline deals.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
