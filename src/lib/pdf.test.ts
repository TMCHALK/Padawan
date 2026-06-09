import { describe, expect, it } from "vitest";
import { ClientStatus, RiskLineOfBusiness } from "@prisma/client";
import { buildSubmissionPdf } from "@/lib/pdf";
import type { DecryptedClient } from "@/lib/clients";
import type { RiskProfileView } from "@/lib/riskProfiles";

const client: DecryptedClient = {
  id: "c1",
  firstName: "Jane",
  lastName: "Public",
  email: "jane@example.com",
  phone: "555-0100",
  address: "1 Main St",
  dob: "1990-01-01",
  displayName: "J. Public",
  status: ClientStatus.PROSPECT,
  hubspotContactId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const profiles: RiskProfileView[] = [
  {
    id: "r1",
    lineOfBusiness: RiskLineOfBusiness.AUTO,
    attributes: { VIN: "1HGCM82633A004352", Year: "2020" },
    riskScore: null,
    notes: "Garaged overnight",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("buildSubmissionPdf", () => {
  it("produces a non-empty PDF document", async () => {
    const bytes = await buildSubmissionPdf({
      client,
      riskProfiles: profiles,
      organizationName: "Demo Brokerage",
      generatedBy: "tyler@example.com",
    });
    expect(bytes.length).toBeGreaterThan(500);
    // PDF files start with the "%PDF" magic header.
    expect(Buffer.from(bytes.slice(0, 4)).toString("ascii")).toBe("%PDF");
  });

  it("handles a client with no risk profiles", async () => {
    const bytes = await buildSubmissionPdf({
      client,
      riskProfiles: [],
      organizationName: "Demo Brokerage",
      generatedBy: "tyler@example.com",
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString("ascii")).toBe("%PDF");
  });
});
