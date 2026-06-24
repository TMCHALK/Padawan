import { AuditAction, type PipelineStage, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requireOrgRole } from "@/lib/rbac";
import {
  decryptOptional,
  encryptOptional,
  hashEmail,
  hashEmailOptional,
} from "@/lib/crypto";
import { applyEmailActivity, type EmailEvent } from "@/lib/pipeline";
import {
  parseDate,
  parseMoney,
  parseProbability,
  type DealInput,
  type GmailEventInput,
} from "@/lib/validation";

/**
 * Service layer for sales-pipeline deals. Like the other services, every function
 * enforces org-scoped RBAC and writes an audit entry, so deals can never be read or
 * written outside an authorized, recorded path. The counterparty email is PII and is
 * stored encrypted (display) plus a keyed fingerprint (matching) — never in the clear.
 *
 * First principles: this owns the "track what's in flight and where" job. It moves and
 * organizes data; outcome decisions (won/lost) stay with the broker (see pipeline.ts).
 */

/** Non-PII board summary for one deal — safe to list without a per-read audit. */
export interface DealListItem {
  id: string;
  name: string;
  stage: PipelineStage;
  amount: string | null;
  probability: number | null;
  nextAction: string | null;
  clientId: string | null;
  clientDisplayName: string | null;
  gmailThreadId: string | null;
  lastActivityAt: Date | null;
  lastSignal: string | null;
  suggestedStage: PipelineStage | null;
  createdAt: Date;
}

/** Full deal incl. decrypted counterparty email — fetched only via an audited read. */
export interface DealView extends DealListItem {
  counterpartyEmail: string | null;
  notes: string | null;
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

/**
 * Lists an org's deals for the board — non-PII fields only, so (like listClients) it
 * needs no per-read audit. Ordered by most recent activity, then newest.
 */
export async function listDeals(
  userId: string,
  organizationId: string,
): Promise<DealListItem[]> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  const rows = await prisma.deal.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      stage: true,
      amount: true,
      probability: true,
      nextAction: true,
      clientId: true,
      client: { select: { displayName: true } },
      gmailThreadId: true,
      lastActivityAt: true,
      lastSignal: true,
      suggestedStage: true,
      createdAt: true,
    },
    orderBy: [{ lastActivityAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 500,
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    stage: r.stage,
    amount: r.amount ? r.amount.toString() : null,
    probability: r.probability,
    nextAction: r.nextAction,
    clientId: r.clientId,
    clientDisplayName: r.client?.displayName ?? null,
    gmailThreadId: r.gmailThreadId,
    lastActivityAt: r.lastActivityAt,
    lastSignal: r.lastSignal,
    suggestedStage: r.suggestedStage,
    createdAt: r.createdAt,
  }));
}

/** Fetches one deal, decrypting the counterparty email and recording a READ. */
export async function getDeal(
  userId: string,
  organizationId: string,
  dealId: string,
): Promise<DealView | null> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    include: { client: { select: { displayName: true } } },
  });
  if (!deal) return null;

  await recordAudit({
    organizationId,
    userId,
    action: AuditAction.READ,
    entityType: "Deal",
    entityId: deal.id,
  });

  return {
    id: deal.id,
    name: deal.name,
    stage: deal.stage,
    amount: deal.amount ? deal.amount.toString() : null,
    probability: deal.probability,
    nextAction: deal.nextAction,
    clientId: deal.clientId,
    clientDisplayName: deal.client?.displayName ?? null,
    counterpartyEmail: decryptOptional(deal.counterpartyEmailEnc),
    gmailThreadId: deal.gmailThreadId,
    lastActivityAt: deal.lastActivityAt,
    lastSignal: deal.lastSignal,
    suggestedStage: deal.suggestedStage,
    notes: deal.notes,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

/** Creates a deal: encrypts/fingerprints the counterparty email, writes a CREATE audit. */
export async function createDeal(
  userId: string,
  organizationId: string,
  input: DealInput,
): Promise<{ id: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  const clientId = input.clientId ? input.clientId : null;
  if (clientId) {
    const ok = await assertClientInOrg(clientId, organizationId);
    if (!ok) throw new Error("Client not found in this organization");
  }

  const email = input.counterpartyEmail ? input.counterpartyEmail : null;

  return prisma.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: {
        organizationId,
        clientId,
        name: input.name,
        stage: input.stage,
        amount: parseMoney(input.amount),
        probability: parseProbability(input.probability),
        nextAction: input.nextAction ? input.nextAction : null,
        counterpartyEmailEnc: encryptOptional(email),
        counterpartyEmailHash: hashEmailOptional(email),
        notes: input.notes ? input.notes : null,
      },
      select: { id: true },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.CREATE,
        entityType: "Deal",
        entityId: deal.id,
        metadata: { stage: input.stage, linkedClient: Boolean(clientId) },
      },
      tx,
    );

    return deal;
  });
}

/**
 * Moves a deal to a stage (a manual move, or the broker confirming a Gmail-suggested
 * outcome). Setting a stage always clears any pending suggestion — the human has now
 * decided. Writes an UPDATE audit.
 */
export async function updateDealStage(
  userId: string,
  organizationId: string,
  dealId: string,
  stage: PipelineStage,
): Promise<{ id: string }> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  const existing = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true, stage: true, suggestedStage: true },
  });
  if (!existing) throw new Error("Deal not found in this organization");

  return prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: { stage, suggestedStage: null },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.UPDATE,
        entityType: "Deal",
        entityId: dealId,
        metadata: {
          fromStage: existing.stage,
          toStage: stage,
          confirmedSuggestion: existing.suggestedStage === stage,
        },
      },
      tx,
    );

    return { id: dealId };
  });
}

export interface GmailSyncResult {
  /** Events whose thread/sender matched an existing deal. */
  matched: number;
  /** Deals auto-advanced through an in-progress stage. */
  advanced: number;
  /** Outcome suggestions newly raised for the broker to confirm. */
  suggestionsRaised: number;
  /** Events that matched no deal (a deal must exist first; we never auto-create). */
  unmatched: number;
}

/**
 * The Gmail ingestion seam: folds a batch of email events into matching deals. This is
 * what makes the pipeline "mostly auto-update" — point a Gmail watcher (the connector
 * now; in-app OAuth polling later, Phase 3) at this and deals advance themselves.
 *
 * Matching: a deal is found by its linked Gmail thread first, then by the sender's
 * email fingerprint (and, when matched that way, the thread id is linked for next time).
 * We never create deals from unrecognized mail — that's deliberate, to keep the board
 * signal-rich rather than full of noise. The per-event stage logic lives in the pure
 * engine (applyEmailActivity); this function only persists and audits.
 */
export async function ingestGmailEvents(
  userId: string,
  organizationId: string,
  events: GmailEventInput[],
): Promise<GmailSyncResult> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  const result: GmailSyncResult = {
    matched: 0,
    advanced: 0,
    suggestionsRaised: 0,
    unmatched: 0,
  };

  for (const event of events) {
    const fromHash = event.from ? hashEmail(event.from) : null;

    const deal = await prisma.deal.findFirst({
      where: {
        organizationId,
        OR: [
          { gmailThreadId: event.threadId },
          ...(fromHash ? [{ counterpartyEmailHash: fromHash }] : []),
        ],
      },
      select: {
        id: true,
        stage: true,
        lastActivityAt: true,
        lastSignal: true,
        suggestedStage: true,
        gmailThreadId: true,
      },
    });

    if (!deal) {
      result.unmatched += 1;
      continue;
    }
    result.matched += 1;

    const emailEvent: EmailEvent = {
      subject: event.subject ?? "",
      snippet: event.snippet ?? "",
      occurredAt: parseDate(event.occurredAt) ?? new Date(),
    };

    const outcome = applyEmailActivity(
      {
        stage: deal.stage,
        lastActivityAt: deal.lastActivityAt,
        lastSignal: deal.lastSignal,
        suggestedStage: deal.suggestedStage,
      },
      emailEvent,
    );

    const linkThread = !deal.gmailThreadId;
    if (!outcome.changed && !linkThread) continue;

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          stage: outcome.stage,
          lastActivityAt: outcome.lastActivityAt,
          lastSignal: outcome.lastSignal,
          suggestedStage: outcome.suggestedStage,
          ...(linkThread ? { gmailThreadId: event.threadId } : {}),
        },
      });

      await recordAudit(
        {
          organizationId,
          userId,
          action: AuditAction.UPDATE,
          entityType: "Deal",
          entityId: deal.id,
          metadata: {
            source: "gmail",
            signal: outcome.lastSignal,
            advanced: outcome.advanced,
            stage: outcome.stage,
            raisedSuggestion: outcome.raisedSuggestion,
          },
        },
        tx,
      );
    });

    if (outcome.advanced) result.advanced += 1;
    if (outcome.raisedSuggestion) result.suggestionsRaised += 1;
  }

  return result;
}
