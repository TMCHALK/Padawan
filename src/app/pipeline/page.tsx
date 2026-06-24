import Link from "next/link";
import { listDeals } from "@/lib/deals";
import { listClients } from "@/lib/clients";
import { requireSession } from "@/lib/session";
import {
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_LABELS,
  isClosedStage,
  summarizePipeline,
} from "@/lib/pipeline";
import { DealForm } from "@/components/DealForm";
import { DealStageControl } from "@/components/DealStageControl";

export const dynamic = "force-dynamic";

/** Turns a stored signal label like "proposal_sent" into "Proposal sent". */
function signalLabel(signal: string): string {
  const text = signal.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function activityLabel(date: Date | null): string {
  if (!date) return "No activity yet";
  return `Last activity ${new Date(date).toISOString().slice(0, 10)}`;
}

export default async function PipelinePage() {
  const { userId, organizationId } = await requireSession();
  const [deals, clients] = await Promise.all([
    listDeals(userId, organizationId),
    listClients(userId, organizationId),
  ]);
  const summary = summarizePipeline(deals);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales pipeline</h1>
        <Link href="/clients" className="text-sm text-indigo-300 hover:underline">
          Clients →
        </Link>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open pipeline", value: String(summary.open) },
          { label: "Total deals", value: String(summary.total) },
          { label: "Won", value: String(summary.countByStage.WON) },
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
      <p className="-mt-6 mb-8 text-xs text-white/40">
        Pipeline composition only — counts of what&apos;s in flight and where, no
        revenue. Gmail activity auto-advances in-progress stages; won / lost / circle
        back are surfaced as suggestions you confirm.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PIPELINE_STAGE_ORDER.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <section
              key={stage}
              className={`rounded-md border p-3 ${
                isClosedStage(stage) ? "border-white/5 bg-white/[0.02]" : "border-white/10"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  {PIPELINE_STAGE_LABELS[stage]}
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                  {stageDeals.length}
                </span>
              </div>

              {stageDeals.length === 0 ? (
                <p className="py-2 text-xs text-white/30">No deals here.</p>
              ) : (
                <ul className="space-y-3">
                  {stageDeals.map((deal) => (
                    <li
                      key={deal.id}
                      className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="font-medium">{deal.name}</div>
                      {deal.clientDisplayName ? (
                        <Link
                          href={`/clients/${deal.clientId}`}
                          className="text-xs text-indigo-300 hover:underline"
                        >
                          {deal.clientDisplayName}
                        </Link>
                      ) : (
                        <span className="text-xs text-white/30">Unlinked prospect</span>
                      )}
                      <div className="mt-1 text-xs text-white/40">
                        {activityLabel(deal.lastActivityAt)}
                        {deal.lastSignal ? ` · ${signalLabel(deal.lastSignal)}` : ""}
                      </div>
                      <DealStageControl
                        dealId={deal.id}
                        stage={deal.stage}
                        suggestedStage={deal.suggestedStage}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Add a deal</h2>
        <DealForm clients={clients} />
      </section>
    </main>
  );
}
