import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicy } from "@/lib/policies";
import { requireSession } from "@/lib/session";
import { PolicyEditForm } from "@/components/PolicyEditForm";

export const dynamic = "force-dynamic";

function isoDate(value: Date | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string; policyId: string }>;
}) {
  const { userId, organizationId } = await requireSession();
  const { id, policyId } = await params;
  const policy = await getPolicy(userId, organizationId, policyId);
  if (!policy || policy.clientId !== id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/clients/${id}`} className="text-sm text-indigo-300 hover:underline">
        ← Back to client
      </Link>
      <h1 className="mb-1 mt-4 text-2xl font-semibold">Edit policy</h1>
      <p className="mb-6 text-sm text-white/60">Changes are recorded in the audit log.</p>
      <PolicyEditForm
        policyId={policy.id}
        carrier={policy.carrier}
        policyNumber={policy.policyNumber}
        lineOfBusiness={policy.lineOfBusiness}
        premium={policy.premium ?? ""}
        effectiveDate={isoDate(policy.effectiveDate)}
        expirationDate={isoDate(policy.expirationDate)}
        status={policy.status}
        coverages={policy.coverageItems.map((c) => ({
          name: c.name,
          limit: c.limit ?? "",
          deductible: c.deductible ?? "",
        }))}
      />
    </main>
  );
}
