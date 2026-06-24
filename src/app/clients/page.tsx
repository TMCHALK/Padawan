import Link from "next/link";
import { listClients } from "@/lib/clients";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { userId, organizationId } = await requireSession();
  const { q } = await searchParams;
  const clients = await listClients(userId, organizationId, q?.trim() || undefined);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/pipeline"
            className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
          >
            Pipeline
          </Link>
          <Link
            href="/audit"
            className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
          >
            Audit log
          </Link>
          <Link
            href="/clients/new"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            New client
          </Link>
        </div>
      </div>

      <form className="mb-6" action="/clients" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search clients…"
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </form>

      {clients.length === 0 ? (
        <p className="text-white/60">
          No clients yet. Create your first one to start capturing risk data.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-md border border-white/10">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5"
              >
                <span className="font-medium">{client.displayName}</span>
                <span className="text-xs uppercase tracking-wide text-white/50">
                  {client.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
