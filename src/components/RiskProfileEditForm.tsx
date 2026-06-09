"use client";

import { useActionState, useState } from "react";
import { RiskLineOfBusiness } from "@prisma/client";
import { updateRiskProfileAction, type FormState } from "@/app/actions";
import { RISK_LINE_LABELS } from "@/lib/validation";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = {};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400";
const labelClass = "mb-1 block text-sm text-white/70";

interface AttrRow {
  key: string;
  value: string;
}

interface Props {
  riskProfileId: string;
  lineOfBusiness: RiskLineOfBusiness;
  attributes: Record<string, string>;
  notes: string;
}

export function RiskProfileEditForm({
  riskProfileId,
  lineOfBusiness,
  attributes,
  notes,
}: Props) {
  const [state, action] = useActionState(updateRiskProfileAction, initial);
  const initialRows = Object.entries(attributes).map(([key, value]) => ({ key, value }));
  const [rows, setRows] = useState<AttrRow[]>(
    initialRows.length > 0 ? initialRows : [{ key: "", value: "" }],
  );

  function updateRow(index: number, field: keyof AttrRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }
  function addRow() {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }
  function removeRow(index: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <form action={action} className="space-y-4 rounded-md border border-white/10 p-4">
      <input type="hidden" name="riskProfileId" value={riskProfileId} />

      <div>
        <label className={labelClass} htmlFor="lineOfBusiness">
          Line of business
        </label>
        <select
          className={inputClass}
          id="lineOfBusiness"
          name="lineOfBusiness"
          defaultValue={lineOfBusiness}
        >
          {Object.values(RiskLineOfBusiness).map((lob) => (
            <option key={lob} value={lob}>
              {RISK_LINE_LABELS[lob]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={labelClass}>Risk attributes</span>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                name="attrKey"
                placeholder="Field"
                value={row.key}
                onChange={(e) => updateRow(i, "key", e.target.value)}
              />
              <input
                className={inputClass}
                name="attrValue"
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateRow(i, "value", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="shrink-0 rounded-md border border-white/10 px-3 text-white/60 hover:bg-white/5"
                aria-label="Remove attribute"
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
          + Add attribute
        </button>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea className={inputClass} id="notes" name="notes" rows={2} defaultValue={notes} />
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
