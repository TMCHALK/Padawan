import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { requireSession } from "@/lib/session";
import { ClientEditForm } from "@/components/ClientEditForm";

export const dynamic = "force-dynamic";

export default async function ClientEditPage({
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
      <Link
        href={`/clients/${client.id}`}
        className="text-sm text-indigo-300 hover:underline"
      >
        ← Back to client
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">Edit client</h1>

      <ClientEditForm
        clientId={client.id}
        firstName={client.firstName}
        lastName={client.lastName}
        email={client.email}
        phone={client.phone}
        address={client.address}
        dob={client.dob}
        status={client.status}
      />
    </main>
  );
}
