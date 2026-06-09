import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { requireSession } from "@/lib/session";

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/clients" className="text-sm text-indigo-300 hover:underline">
        ← Back to clients
      </Link>
      <div className="mb-6 mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {client.firstName} {client.lastName}
        </h1>
        <span className="text-xs uppercase tracking-wide text-white/50">
          {client.status}
        </span>
      </div>

      <dl>
        <Field label="Email" value={client.email} />
        <Field label="Phone" value={client.phone} />
        <Field label="Date of birth" value={client.dob} />
        <Field label="Address" value={client.address} />
      </dl>

      <p className="mt-6 text-sm text-white/40">
        Risk profiles, policies, and coverage analysis attach to this client in
        upcoming phases.
      </p>
    </main>
  );
}
