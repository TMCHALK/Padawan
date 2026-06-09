import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { listRiskProfiles } from "@/lib/riskProfiles";
import { requireSession } from "@/lib/session";
import { RISK_LINE_LABELS } from "@/lib/validation";
import { RiskProfileForm } from "@/components/RiskProfileForm";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-white/10 py-3">
      <dt className="text-xs uppercase tracking-wide text-white/50">{label}</dt>
      <dd className="mt-1 text-sm">{value || <span className="text-white/30">—</span>}</dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, organizationId } = await requireSession();
  const { id } = await params;
  const client = await getClient(userId, organizationId, id);
  if (!client) notFound();
  const riskProfiles = await listRiskProfiles(userId, organizationId, id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/clients" className="text-sm text-indigo-300 hover:underline">
        ← Back to clients
      </Link>
      <div className="mb-6 mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {client.firstName} {client.lastName}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-wide text-white/50">
            {client.status}
          </span>
          <a
            href={`/clients/${client.id}/submission`}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-400"
          >
            Download submission PDF
          </a>
          <Link
            href={`/clients/${client.id}/edit`}
            className="text-sm text-indigo-300 hover:underline"
          >
            Edit
          </Link>
        </div>
      </div>

      <dl>
        <Field label="Email" value={client.email} />
        <Field label="Phone" value={client.phone} />
        <Field label="Date of birth" value={client.dob} />
        <Field label="Address" value={client.address} />
      </dl>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Risk profiles</h2>

        {riskProfiles.length === 0 ? (
          <p className="mb-4 text-sm text-white/50">
            No risk data captured yet. Add a profile below.
          </p>
        ) : (
          <ul className="mb-6 space-y-3">
            {riskProfiles.map((profile) => (
              <li
                key={profile.id}
                className="rounded-md border border-white/10 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">
                    {RISK_LINE_LABELS[profile.lineOfBusiness]}
                  </span>
                  {profile.riskScore !== null ? (
                    <span className="text-xs text-white/50">
                      Risk score: {profile.riskScore}
                    </span>
                  ) : null}
                </div>
                {Object.keys(profile.attributes).length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {Object.entries(profile.attributes).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-white/50">{k}</dt>
                        <dd>{v || <span className="text-white/30">—</span>}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {profile.notes ? (
                  <p className="mt-2 text-sm text-white/60">{profile.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <RiskProfileForm clientId={client.id} />
      </section>
    </main>
  );
}
