"use client";

import { useActionState, useState } from "react";
import { PolicyStatus, RiskLineOfBusiness } from "@prisma/client";
import { createPolicyAction, type FormState } from "@/app/actions";
import { POLICY_STATUS_LABELS, RISK_LINE_LABELS } from "@/lib/validation";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = {};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400";
const labelClass = "mb-1 block text-sm text-white/70";

interface CovRow {
  name: string;
  limit: string;
  deductible: string;
}

export function PolicyForm({ clientId }: { clientId: string }) {
  const [state, action] = useActionState(createPolicyAction, initial);
  const [rows, setRows] = useState<CovRow[]>([{ name: "", limit: "", deductible: "" }]);

  function update(i: number, field: keyof CovRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { name: "", limit: "", deductible: "" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  return (
    <form action={action} className="space-y-4 rounded-md border border-white/10 p-4">
      <input type="hidden" name="clientId" value={clientId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="carrier">
            Carrier
          </label>
          <input className={inputClass} id="carrier" name="carrier" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="policyNumber">
            Policy number
          </label>
          <input className={inputClass} id="policyNumber" name="policyNumber" required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="lineOfBusiness">
            Line of business
          </label>
          <select
            className={inputClass}
            id="lineOfBusiness"
            name="lineOfBusiness"
            defaultValue={RiskLineOfBusiness.AUTO}
          >
            {Object.values(RiskLineOfBusiness).map((lob) => (
              <option key={lob} value={lob}>
                {RISK_LINE_LABELS[lob]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="premium">
            Premium
          </label>
          <input className={inputClass} id="premium" name="premium" placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select
            className={inputClass}
            id="status"
            name="status"
            defaultValue={PolicyStatus.QUOTED}
          >
            {Object.values(PolicyStatus).map((s) => (
              <option key={s} value={s}>
                {POLICY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="effectiveDate">
            Effective date
          </label>
          <input
            className={inputClass}
            id="effectiveDate"
            name="effectiveDate"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="expirationDate">
            Expiration date
          </label>
          <input
            className={inputClass}
            id="expirationDate"
            name="expirationDate"
            placeholder="YYYY-MM-DD"
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>Coverage line items</span>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                name="covName"
                placeholder="Coverage (e.g. Bodily Injury)"
                value={row.name}
                onChange={(e) => update(i, "name", e.target.value)}
              />
              <input
                className={inputClass}
                name="covLimit"
                placeholder="Limit"
                value={row.limit}
                onChange={(e) => update(i, "limit", e.target.value)}
              />
              <input
                className={inputClass}
                name="covDeductible"
                placeholder="Deductible"
                value={row.deductible}
                onChange={(e) => update(i, "deductible", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="shrink-0 rounded-md border border-white/10 px-3 text-white/60 hover:bg-white/5"
                aria-label="Remove coverage"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-sm text-indigo-300 hover:underline"
        >
          + Add coverage
        </button>
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <SubmitButton>Add policy</SubmitButton>
    </form>
  );
}
