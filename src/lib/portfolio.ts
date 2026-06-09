import type { PolicyStatus } from "@prisma/client";
import type { PolicyView } from "@/lib/policies";
import type { RiskProfileView } from "@/lib/riskProfiles";

/**
 * Pure, descriptive roll-up of a client's captured data — totals and counts only.
 *
 * First principles: this organizes and reports the data that exists. It makes NO
 * adequacy assessment, gap analysis, or recommendation — that's Tyler's licensed
 * judgment. Keep it strictly descriptive to stay off the E&O line.
 */
export interface PortfolioSummary {
  riskProfileCount: number;
  policyCount: number;
  coverageItemCount: number;
  totalPremium: number;
  policyCountByStatus: Partial<Record<PolicyStatus, number>>;
}

export function summarizePortfolio(
  riskProfiles: RiskProfileView[],
  policies: PolicyView[],
): PortfolioSummary {
  let totalPremium = 0;
  let coverageItemCount = 0;
  const policyCountByStatus: Partial<Record<PolicyStatus, number>> = {};

  for (const policy of policies) {
    if (policy.premium) {
      const n = Number(policy.premium);
      if (Number.isFinite(n)) totalPremium += n;
    }
    coverageItemCount += policy.coverageItems.length;
    policyCountByStatus[policy.status] =
      (policyCountByStatus[policy.status] ?? 0) + 1;
  }

  return {
    riskProfileCount: riskProfiles.length,
    policyCount: policies.length,
    coverageItemCount,
    totalPremium,
    policyCountByStatus,
  };
}
