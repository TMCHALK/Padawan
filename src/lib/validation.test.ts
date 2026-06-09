import { describe, expect, it } from "vitest";
import {
  buildDisplayName,
  clientInputSchema,
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
