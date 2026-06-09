import { describe, expect, it } from "vitest";
import { ClientStatus } from "@prisma/client";
import { buildDisplayName, clientInputSchema } from "@/lib/validation";

/**
 * Unit tests for the pure pieces the "edit & status-change client" flow relies
 * on: recomputing the display name from edited names, parsing the same input as
 * create (incl. status), and normalizing optional fields. These stay DB-free —
 * the encrypt/RBAC/audit behavior of updateClient is exercised separately.
 */

describe("edit client: display name recompute", () => {
  it("recomputes the non-PII label when the surname changes", () => {
    // e.g. an edit that corrects "Jane Public" to "Jane Doe"
    expect(buildDisplayName("Jane", "Doe")).toBe("J. Doe");
  });

  it("trims whitespace introduced during editing", () => {
    expect(buildDisplayName("  Sam  ", "  Vega  ")).toBe("S. Vega");
  });
});

describe("edit client: input parsing", () => {
  it("parses an edit that changes the status", () => {
    const result = clientInputSchema.safeParse({
      firstName: "Jane",
      lastName: "Public",
      status: ClientStatus.ACTIVE,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe(ClientStatus.ACTIVE);
  });

  it("defaults status to PROSPECT when omitted on edit", () => {
    const result = clientInputSchema.safeParse({
      firstName: "Jane",
      lastName: "Public",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe(ClientStatus.PROSPECT);
  });

  it("rejects an edit that blanks a required name", () => {
    const result = clientInputSchema.safeParse({
      firstName: "",
      lastName: "Public",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes a cleared optional email to empty string", () => {
    const result = clientInputSchema.safeParse({
      firstName: "Jane",
      lastName: "Public",
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("");
  });
});
