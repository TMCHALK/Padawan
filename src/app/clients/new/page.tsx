import Link from "next/link";
import { ClientForm } from "@/components/ClientForm";
import { requireSession } from "@/lib/session";

export default async function NewClientPage() {
  // Gate the page on an authenticated session with an active org.
  await requireSession();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/clients" className="text-sm text-indigo-300 hover:underline">
        ← Back to clients
      </Link>
      <h1 className="mb-1 mt-4 text-2xl font-semibold">New client</h1>
      <p className="mb-6 text-sm text-white/60">
        Personal details are encrypted at rest. Every access is recorded in the audit
        log.
      </p>
      <ClientForm />
    </main>
  );
}
