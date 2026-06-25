"use client";

import { useActionState, useState } from "react";
import { updateGoalsAction, type FormState } from "@/app/actions";
import type { GoalsView } from "@/lib/goals";

const initial: FormState = {};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400";

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}

function GoalBar({
  label,
  line,
}: {
  label: string;
  line: { goal: number | null; won: number; pct: number | null };
}) {
  const pct = line.pct ?? 0;
  const width = Math.min(100, pct);
  const hit = pct >= 100;
  return (
    <div className="rounded-md border border-white/10 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
        <span className="text-xs text-white/50">
          {line.goal === null ? "No goal set" : `${line.pct}%`}
        </span>
      </div>
      <div className="mt-1 text-sm font-semibold">
        {money(line.won)}
        {line.goal !== null ? (
          <span className="font-normal text-white/40"> of {money(line.goal)}</span>
        ) : null}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${hit ? "bg-emerald-400" : "bg-indigo-400"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function GoalsPanel({ goals, progress }: GoalsView) {
  const [state, action] = useActionState(updateGoalsAction, initial);
  const [editing, setEditing] = useState(false);

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Revenue goals — how we stand
        </h2>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="text-xs text-indigo-300 hover:underline"
        >
          {editing ? "Close" : "Adjust goals"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GoalBar label="This month" line={progress.month} />
        <GoalBar label="This quarter" line={progress.quarter} />
        <GoalBar label="This year" line={progress.year} />
      </div>

      {editing ? (
        <form
          action={action}
          className="mt-3 grid grid-cols-1 gap-3 rounded-md border border-white/10 p-4 sm:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-xs text-white/60" htmlFor="monthly">
              Monthly goal
            </label>
            <input
              className={inputClass}
              id="monthly"
              name="monthly"
              inputMode="decimal"
              placeholder="$20,000"
              defaultValue={goals.monthly ?? ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60" htmlFor="quarterly">
              Quarterly goal
            </label>
            <input
              className={inputClass}
              id="quarterly"
              name="quarterly"
              inputMode="decimal"
              placeholder="$50,000"
              defaultValue={goals.quarterly ?? ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60" htmlFor="annual">
              Annual goal
            </label>
            <input
              className={inputClass}
              id="annual"
              name="annual"
              inputMode="decimal"
              placeholder="$200,000"
              defaultValue={goals.annual ?? ""}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Save goals
            </button>
          </div>
          {state.error ? (
            <p className="text-sm text-red-400 sm:col-span-4">{state.error}</p>
          ) : null}
        </form>
      ) : null}
      <p className="mt-2 text-xs text-white/40">
        Progress is won revenue in the period vs. your goal — closed business, not
        pipeline. Set or change the targets anytime with “Adjust goals”.
      </p>
    </section>
  );
}
