import { describe, expect, it } from "vitest";
import { PolicyStatus, RiskLineOfBusiness } from "@prisma/client";
import { summarizePortfolio } from "@/lib/portfolio";
import type { PolicyView } from "@/lib/policies";
import type { RiskProfileView } from "@/lib/riskProfiles";

const risk: RiskProfileView = {
  id: "r1",
  lineOfBusiness: RiskLineOfBusiness.AUTO,
  attributes: {},
  riskScore: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function policy(over: Partial<PolicyView>): PolicyView {
  return {
    id: "p",
    carrier: "Acme",
    policyNumber: "PN",
    lineOfBusiness: RiskLineOfBusiness.AUTO,
    premium: null,
    effectiveDate: null,
    expirationDate: null,
    status: PolicyStatus.QUOTED,
    coverageItems: [],
    ...over,
  };
}

describe("summarizePortfolio", () => {
  it("rolls up counts, premium totals, and status breakdown", () => {
    const summary = summarizePortfolio(
      [risk, { ...risk, id: "r2" }],
      [
        policy({
          id: "p1",
          premium: "1000.50",
          status: PolicyStatus.BOUND,
          coverageItems: [
            { id: "c1", name: "BI", limit: null, deductible: null, description: null },
            { id: "c2", name: "PD", limit: null, deductible: null, description: null },
          ],
        }),
        policy({ id: "p2", premium: "250", status: PolicyStatus.BOUND }),
        policy({ id: "p3", premium: null, status: PolicyStatus.QUOTED }),
      ],
    );

    expect(summary.riskProfileCount).toBe(2);
    expect(summary.policyCount).toBe(3);
    expect(summary.coverageItemCount).toBe(2);
    expect(summary.totalPremium).toBe(1250.5);
    expect(summary.policyCountByStatus[PolicyStatus.BOUND]).toBe(2);
    expect(summary.policyCountByStatus[PolicyStatus.QUOTED]).toBe(1);
  });

  it("handles an empty portfolio", () => {
    const summary = summarizePortfolio([], []);
    expect(summary).toEqual({
      riskProfileCount: 0,
      policyCount: 0,
      coverageItemCount: 0,
      totalPremium: 0,
      policyCountByStatus: {},
    });
  });
});
