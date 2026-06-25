import { AuditAction, PipelineStage, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requireOrgRole } from "@/lib/rbac";
import { dealRevenue, summarizeGoals, type GoalsSummary } from "@/lib/pipeline";
import { parseMoney, type GoalsInput } from "@/lib/validation";

/**
 * Revenue-goal service. Goals live on the Organization (one row per org) and are
 * compared against won revenue per period by the pure engine (summarizeGoals). Reads
 * require VIEWER; edits require BROKER and are audited (no client PII involved).
 */

export interface Goals {
  monthly: string | null;
  quarterly: string | null;
  annual: string | null;
}

export interface GoalsView {
  /** Raw current targets, for the editor form. */
  goals: Goals;
  /** Won-vs-goal progress for month / quarter / year. */
  progress: GoalsSummary;
}

function toNum(v: { toString(): string } | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

/** Loads current goals plus how the org stands against them this period. */
export async function getGoalsView(
  userId: string,
  organizationId: string,
): Promise<GoalsView> {
  await requireOrgRole(userId, organizationId, Role.VIEWER);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      monthlyRevenueGoal: true,
      quarterlyRevenueGoal: true,
      annualRevenueGoal: true,
    },
  });

  const wonRows = await prisma.deal.findMany({
    where: { organizationId, stage: PipelineStage.WON, wonAt: { not: null } },
    select: { premium: true, commissionRate: true, wonAt: true },
  });
  // Goals track revenue (commission), so each won deal contributes premium × rate%.
  const wonDeals = wonRows.map((r) => ({
    amount: dealRevenue(
      r.premium ? r.premium.toString() : null,
      r.commissionRate ? Number(r.commissionRate) : null,
    ),
    wonAt: r.wonAt as Date,
  }));

  const progress = summarizeGoals(
    new Date(),
    {
      monthly: toNum(org?.monthlyRevenueGoal),
      quarterly: toNum(org?.quarterlyRevenueGoal),
      annual: toNum(org?.annualRevenueGoal),
    },
    wonDeals,
  );

  return {
    goals: {
      monthly: org?.monthlyRevenueGoal?.toString() ?? null,
      quarterly: org?.quarterlyRevenueGoal?.toString() ?? null,
      annual: org?.annualRevenueGoal?.toString() ?? null,
    },
    progress,
  };
}

/** Updates the org's revenue targets (any subset), writing an UPDATE audit. */
export async function updateGoals(
  userId: string,
  organizationId: string,
  input: GoalsInput,
): Promise<void> {
  await requireOrgRole(userId, organizationId, Role.BROKER);

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        monthlyRevenueGoal: parseMoney(input.monthly),
        quarterlyRevenueGoal: parseMoney(input.quarterly),
        annualRevenueGoal: parseMoney(input.annual),
      },
    });

    await recordAudit(
      {
        organizationId,
        userId,
        action: AuditAction.UPDATE,
        entityType: "PipelineGoal",
        entityId: organizationId,
      },
      tx,
    );
  });
}
