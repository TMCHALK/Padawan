import { describe, expect, it } from "vitest";
import { AuditAction } from "@prisma/client";
import { auditActionLabel } from "@/lib/auditView";

describe("auditActionLabel", () => {
  it("maps CREATE to 'Created'", () => {
    expect(auditActionLabel(AuditAction.CREATE)).toBe("Created");
  });

  it("maps READ to 'Viewed'", () => {
    expect(auditActionLabel(AuditAction.READ)).toBe("Viewed");
  });

  it("maps UPDATE to 'Updated'", () => {
    expect(auditActionLabel(AuditAction.UPDATE)).toBe("Updated");
  });

  it("maps DELETE to 'Deleted'", () => {
    expect(auditActionLabel(AuditAction.DELETE)).toBe("Deleted");
  });

  it("produces a non-empty label for every AuditAction value", () => {
    for (const action of Object.values(AuditAction)) {
      const label = auditActionLabel(action);
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
    }
  });
});
