import Link from "next/link";
import { listDeals } from "@/lib/deals";
import { listClients } from "@/lib/clients";
import { requireSession } from "@/lib/session";
import { summarizePipeline } from "@/lib/pipeline";
import { DealForm } from "@/components/DealForm";
import { PipelineBoard } from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}

export default async function PipelinePage() {
  const { userId, organizationId } = await requireSession();
  const [deals, clients] = await Promise.all([
    listDeals(userId, organizationId),
    listClients(userId, organizationId),
  ]);
  const summary = summarizePipeline(deals);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales pipeline</h1>
        <Link href="/clients" className="text-sm text-indigo-300 hover:underline">
          Clients →
        </Link>
      </div>

      <section className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open pipeline", value: money(summary.openValue) },
          { label: "Open deals", value: String(summary.open) },
          { label: "Won", value: money(summary.valueByStage.WON) },
          { label: "Gmail suggestions", value: String(summary.pendingSuggestions) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-white/10 p-3">
            <div className="text-xs uppercase tracking-wide text-white/50">
              {stat.label}
            </div>
            <div className="mt-1 text-xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </section>
      <p className="mb-8 text-xs text-white/40">
        Open-pipeline sizing only — estimated value of deals in flight, not booked
        revenue. Drag a card between columns to move a deal. Gmail activity auto-advances
        in-progress stages; won / lost / circle back are surfaced as suggestions you
        confirm.
      </p>

      <PipelineBoard initialDeals={deals} />

      <section className="mt-10 max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold">Add a deal</h2>
        <DealForm clients={clients} />
      </section>
    </main>
  );
}
