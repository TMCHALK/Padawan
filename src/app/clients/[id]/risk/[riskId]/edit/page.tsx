import Link from "next/link";
import { notFound } from "next/navigation";
import { getRiskProfile } from "@/lib/riskProfiles";
import { requireSession } from "@/lib/session";
import { RiskProfileEditForm } from "@/components/RiskProfileEditForm";

export const dynamic = "force-dynamic";

export default async function EditRiskProfilePage({
  params,
}: {
  params: Promise<{ id: string; riskId: string }>;
}) {
  const { userId, organizationId } = await requireSession();
  const { id, riskId } = await params;
  const profile = await getRiskProfile(userId, organizationId, riskId);
  // Guard against a profile that belongs to a different client in the URL.
  if (!profile || profile.clientId !== id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/clients/${id}`} className="text-sm text-indigo-300 hover:underline">
        ← Back to client
      </Link>
      <h1 className="mb-1 mt-4 text-2xl font-semibold">Edit risk profile</h1>
      <p className="mb-6 text-sm text-white/60">
        Changes are recorded in the audit log.
      </p>
      <RiskProfileEditForm
        riskProfileId={profile.id}
        lineOfBusiness={profile.lineOfBusiness}
        attributes={profile.attributes}
        notes={profile.notes ?? ""}
      />
    </main>
  );
}
