import { describe, expect, it } from "vitest";
import { RiskLineOfBusiness } from "@prisma/client";
import {
  buildDisplayName,
  clientInputSchema,
  parseAttributePairs,
  riskProfileInputSchema,
  signUpSchema,
} from "@/lib/validation";

describe("buildDisplayName", () => {
  it("produces a non-PII label", () => {
    expect(buildDisplayName("Jane", "Public")).toBe("J. Public");
  });
});

describe("signUpSchema", () => {
  it("rejects short passwords", () => {
    const result = signUpSchema.safeParse({
      name: "Tyler",
      email: "t@example.com",
      password: "short",
      organizationName: "Acme",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email to lowercase", () => {
    const result = signUpSchema.safeParse({
      name: "Tyler",
      email: "T@Example.COM",
      password: "longenough",
      organizationName: "Acme",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("t@example.com");
  });
});

describe("clientInputSchema", () => {
  it("requires first and last name", () => {
    expect(clientInputSchema.safeParse({ firstName: "", lastName: "" }).success).toBe(
      false,
    );
  });

  it("accepts a minimal valid client", () => {
    const result = clientInputSchema.safeParse({
      firstName: "Jane",
      lastName: "Public",
    });
    expect(result.success).toBe(true);
  });
});

describe("parseAttributePairs", () => {
  it("folds parallel arrays into a record and trims", () => {
    expect(
      parseAttributePairs([" VIN ", "Year"], [" 123 ", "2020"]),
    ).toEqual({ VIN: "123", Year: "2020" });
  });

  it("drops rows with an empty key", () => {
    expect(parseAttributePairs(["", "Make"], ["ignored", "Honda"])).toEqual({
      Make: "Honda",
    });
  });

  it("tolerates a missing value", () => {
    expect(parseAttributePairs(["Make"], [])).toEqual({ Make: "" });
  });

  it("last value wins on duplicate keys", () => {
    expect(parseAttributePairs(["k", "k"], ["a", "b"])).toEqual({ k: "b" });
  });
});

describe("riskProfileInputSchema", () => {
  it("requires a valid line of business", () => {
    expect(
      riskProfileInputSchema.safeParse({ lineOfBusiness: "NOPE", attributes: {} })
        .success,
    ).toBe(false);
  });

  it("accepts a valid profile with attributes", () => {
    const result = riskProfileInputSchema.safeParse({
      lineOfBusiness: RiskLineOfBusiness.AUTO,
      attributes: { VIN: "123" },
      notes: "garaged",
    });
    expect(result.success).toBe(true);
  });
});
