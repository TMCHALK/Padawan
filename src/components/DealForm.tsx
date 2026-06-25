"use client";

import { useActionState, useState } from "react";
import { PipelineStage } from "@prisma/client";
import { createDealAction, type FormState } from "@/app/actions";
import {
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_LABELS,
  dealRevenue,
} from "@/lib/pipeline";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = {};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400";
const labelClass = "mb-1 block text-sm text-white/70";

export interface DealClientOption {
  id: string;
  displayName: string;
}

export function DealForm({ clients }: { clients: DealClientOption[] }) {
  const [state, action] = useActionState(createDealAction, initial);
  // Live revenue preview as premium / commission are typed.
  const [premium, setPremium] = useState("");
  const [commission, setCommission] = useState("");
  const revenue = dealRevenue(
    premium.replace(/[$,\s]/g, ""),
    commission.replace(/[%\s]/g, ""),
  );

  return (
    <form action={action} className="space-y-4 rounded-md border border-white/10 p-4">
      <div>
        <label className={labelClass} htmlFor="name">
          Deal name
        </label>
        <input
          className={inputClass}
          id="name"
          name="name"
          placeholder="e.g. Acme GL — new business"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="stage">
            Stage
          </label>
          <select
            className={inputClass}
            id="stage"
            name="stage"
            defaultValue={PipelineStage.QUALIFIED}
          >
            {PIPELINE_STAGE_ORDER.map((stage) => (
              <option key={stage} value={stage}>
                {PIPELINE_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="premium">
            Premium
          </label>
          <input
            className={inputClass}
            id="premium"
            name="premium"
            inputMode="decimal"
            placeholder="$10,000"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="commissionRate">
            Commission %
          </label>
          <input
            className={inputClass}
            id="commissionRate"
            name="commissionRate"
            inputMode="decimal"
            placeholder="12.5"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="probability">
            Probability %
          </label>
          <input
            className={inputClass}
            id="probability"
            name="probability"
            inputMode="numeric"
            placeholder="50"
          />
        </div>
        <div className="sm:col-span-2">
          <span className={labelClass}>Revenue (your commission)</span>
          <div className="rounded-md border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm font-semibold text-emerald-300">
            {revenue > 0 ? `$${revenue.toLocaleString()}` : "—"}
            <span className="ml-2 font-normal text-white/40">
              = premium × commission %
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="nextAction">
          Next action
        </label>
        <input
          className={inputClass}
          id="nextAction"
          name="nextAction"
          placeholder="e.g. Follow up to bind; confirm effective date"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="clientId">
          Linked client (optional)
        </label>
        <select className={inputClass} id="clientId" name="clientId" defaultValue="">
          <option value="">— Not linked yet —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="counterpartyEmail">
          Contact email (for Gmail auto-updates)
        </label>
        <input
          className={inputClass}
          id="counterpartyEmail"
          name="counterpartyEmail"
          type="email"
          placeholder="prospect@example.com"
        />
        <p className="mt-1 text-xs text-white/40">
          Used to match incoming Gmail threads to this deal. Stored encrypted.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea className={inputClass} id="notes" name="notes" rows={2} />
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <SubmitButton>Add deal</SubmitButton>
    </form>
  );
}
