import { NextResponse } from "next/server";
import { getClient } from "@/lib/clients";
import { listRiskProfiles } from "@/lib/riskProfiles";
import { listPolicies } from "@/lib/policies";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { buildSubmissionPdf } from "@/lib/pdf";

// GET /clients/[id]/submission -> downloads a populated Risk Submission Summary PDF.
// Reads go through the audited service layer (getClient records a READ), so every
// generation is authorized and logged.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, organizationId, email } = await requireSession();
  const { id } = await params;

  const client = await getClient(userId, organizationId, id);
  if (!client) {
    return new NextResponse("Not found", { status: 404 });
  }
  const riskProfiles = await listRiskProfiles(userId, organizationId, id);
  const policies = await listPolicies(userId, organizationId, id);
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const pdf = await buildSubmissionPdf({
    client,
    riskProfiles,
    policies,
    organizationName: org?.name ?? "Padawan",
    generatedBy: email,
  });

  const filename = `submission-${client.displayName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
