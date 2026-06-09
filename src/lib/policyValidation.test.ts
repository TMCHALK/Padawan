import { describe, expect, it } from "vitest";
import { PolicyStatus, RiskLineOfBusiness } from "@prisma/client";
import {
  parseCoverageRows,
  parseDate,
  parseMoney,
  policyInputSchema,
} from "@/lib/validation";

describe("parseMoney", () => {
  it("strips currency formatting to a numeric string", () => {
    expect(parseMoney("$1,250.50")).toBe("1250.5");
    expect(parseMoney("2000")).toBe("2000");
  });
  it("returns null for empty/invalid", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("parseDate", () => {
  it("parses an ISO date", () => {
    expect(parseDate("2026-01-15")?.toISOString().slice(0, 10)).toBe("2026-01-15");
  });
  it("returns null for empty/invalid", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
  });
});

describe("parseCoverageRows", () => {
  it("folds rows and drops empty names", () => {
    expect(
      parseCoverageRows(["Bodily Injury", "", " "], ["100000", "x", "y"], ["500", "", ""]),
    ).toEqual([{ name: "Bodily Injury", limit: "100000", deductible: "500" }]);
  });
});

describe("policyInputSchema", () => {
  it("requires carrier and policy number", () => {
    expect(
      policyInputSchema.safeParse({
        carrier: "",
        policyNumber: "",
        lineOfBusiness: RiskLineOfBusiness.AUTO,
      }).success,
    ).toBe(false);
  });

  it("accepts a valid policy with coverages and defaults status to QUOTED", () => {
    const result = policyInputSchema.safeParse({
      carrier: "Acme Mutual",
      policyNumber: "POL-123",
      lineOfBusiness: RiskLineOfBusiness.AUTO,
      coverages: [{ name: "Liability", limit: "100000", deductible: "500" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe(PolicyStatus.QUOTED);
  });
});
