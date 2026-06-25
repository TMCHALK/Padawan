"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PipelineStage } from "@prisma/client";
import { moveDealStage } from "@/app/actions";
import {
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_LABELS,
  isClosedStage,
} from "@/lib/pipeline";
import type { DealListItem } from "@/lib/deals";

/** Accent colors per stage for the column header chip (Notion-style). */
const STAGE_CHIP: Record<PipelineStage, string> = {
  [PipelineStage.QUALIFIED]: "bg-sky-500/20 text-sky-200",
  [PipelineStage.QUOTING]: "bg-amber-500/20 text-amber-200",
  [PipelineStage.PROPOSED]: "bg-violet-500/20 text-violet-200",
  [PipelineStage.WON]: "bg-emerald-500/20 text-emerald-200",
  [PipelineStage.LOST]: "bg-rose-500/20 text-rose-200",
  [PipelineStage.CIRCLE_BACK]: "bg-white/10 text-white/60",
};

function money(value: string | null): string {
  if (!value) return "";
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : "";
}

function columnTotal(deals: DealListItem[]): string {
  const sum = deals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  return `$${sum.toLocaleString()}`;
}

function signalLabel(signal: string): string {
  const text = signal.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function activityLabel(date: Date | null): string {
  if (!date) return "No activity yet";
  return `Last activity ${new Date(date).toISOString().slice(0, 10)}`;
}

export function PipelineBoard({ initialDeals }: { initialDeals: DealListItem[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);
  const [, startTransition] = useTransition();

  function onDrop(stage: PipelineStage) {
    const id = dragId;
    setOverStage(null);
    setDragId(null);
    if (!id) return;
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;

    const prev = deals;
    // Optimistic move; clear any stale Gmail suggestion locally too.
    setDeals((cur) =>
      cur.map((d) => (d.id === id ? { ...d, stage, suggestedStage: null } : d)),
    );
    startTransition(async () => {
      const res = await moveDealStage(id, stage);
      if (!res.ok) setDeals(prev); // revert on failure
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGE_ORDER.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const isOver = overStage === stage;
        return (
          <section
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={() => onDrop(stage)}
            className={`flex w-56 shrink-0 flex-col rounded-lg border p-2.5 transition-colors ${
              isOver
                ? "border-indigo-400/60 bg-indigo-400/5"
                : isClosedStage(stage)
                  ? "border-white/5 bg-white/[0.02]"
                  : "border-white/10"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${STAGE_CHIP[stage]}`}
              >
                {PIPELINE_STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-white/40">{stageDeals.length}</span>
            </div>
            <div className="mb-2 text-sm font-semibold text-white/80">
              {columnTotal(stageDeals)}
            </div>

            <div className="flex-1 space-y-2">
              {stageDeals.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 py-4 text-center text-xs text-white/25">
                  Drop here
                </p>
              ) : (
                stageDeals.map((deal) => (
                  <article
                    key={deal.id}
                    draggable
                    title={
                      deal.nextAction
                        ? `Next: ${deal.nextAction}\n${activityLabel(deal.lastActivityAt)}${
                            deal.lastSignal ? ` · ${signalLabel(deal.lastSignal)}` : ""
                          }`
                        : `${activityLabel(deal.lastActivityAt)}${
                            deal.lastSignal ? ` · ${signalLabel(deal.lastSignal)}` : ""
                          }`
                    }
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    className={`cursor-grab rounded-md border border-white/10 bg-white/[0.04] p-2 active:cursor-grabbing ${
                      dragId === deal.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="line-clamp-2 text-sm font-medium leading-tight">
                      {deal.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {deal.amount ? (
                        <span className="text-sm font-semibold text-emerald-300">
                          {money(deal.amount)}
                        </span>
                      ) : null}
                      {deal.probability !== null ? (
                        <span className="text-xs text-white/40">{deal.probability}%</span>
                      ) : null}
                    </div>
                    {deal.nextAction ? (
                      <p className="mt-1 line-clamp-1 text-xs text-white/55">
                        {deal.nextAction}
                      </p>
                    ) : null}
                    <div className="mt-1 truncate text-[11px] text-white/35">
                      {deal.clientDisplayName ? (
                        <Link
                          href={`/clients/${deal.clientId}`}
                          className="text-indigo-300 hover:underline"
                        >
                          {deal.clientDisplayName}
                        </Link>
                      ) : (
                        <span>Unlinked</span>
                      )}
                      {deal.lastSignal ? ` · ${signalLabel(deal.lastSignal)}` : ""}
                    </div>
                    {deal.suggestedStage ? (
                      <button
                        type="button"
                        onClick={() => onDropSuggestion(deal.id, deal.suggestedStage!)}
                        className="mt-1.5 block w-full rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-1 text-left text-[11px] leading-tight text-amber-200 hover:bg-amber-400/20"
                      >
                        Gmail: <strong>{PIPELINE_STAGE_LABELS[deal.suggestedStage]}</strong>?
                      </button>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );

  function onDropSuggestion(id: string, stage: PipelineStage) {
    const prev = deals;
    setDeals((cur) =>
      cur.map((d) => (d.id === id ? { ...d, stage, suggestedStage: null } : d)),
    );
    startTransition(async () => {
      const res = await moveDealStage(id, stage);
      if (!res.ok) setDeals(prev);
    });
  }
}
