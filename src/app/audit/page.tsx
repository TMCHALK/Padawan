import Link from "next/link";
import { auditActionLabel, listAuditLogs, type AuditLogView } from "@/lib/auditView";
import { AuthorizationError } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { userId, organizationId } = await requireSession();

  let logs: AuditLogView[];
  try {
    logs = await listAuditLogs(userId, organizationId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="mb-4 text-2xl font-semibold">Audit log</h1>
          <p className="text-white/60">
            Owners only. You need the OWNER role to view this organization&apos;s
            audit log.
          </p>
          <Link
            href="/clients"
            className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
          >
            ← Back to clients
          </Link>
        </main>
      );
    }
    throw error;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <Link
          href="/clients"
          className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
        >
          Back to clients
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="text-white/60">
          No audit entries yet. Activity on client data will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3 text-white/70">
                    {log.createdAt.toISOString()}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {log.actorEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {auditActionLabel(log.action)}
                  </td>
                  <td className="px-4 py-3 text-white/70">{log.entityType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/50">
                    {log.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
