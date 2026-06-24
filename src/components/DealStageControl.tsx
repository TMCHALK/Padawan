"use client";

import { useActionState, useRef } from "react";
import { PipelineStage } from "@prisma/client";
import { updateDealStageAction, type FormState } from "@/app/actions";
import { PIPELINE_STAGE_ORDER, PIPELINE_STAGE_LABELS } from "@/lib/pipeline";

const initial: FormState = {};

/**
 * Per-deal stage control on the board. Changing the select moves the deal; the
 * suggestion button confirms a Gmail-suggested outcome (won/lost/circle-back). The
 * connector never sets those itself — confirming here is the broker's call.
 */
export function DealStageControl({
  dealId,
  stage,
  suggestedStage,
}: {
  dealId: string;
  stage: PipelineStage;
  suggestedStage: PipelineStage | null;
}) {
  const [state, action, pending] = useActionState(updateDealStageAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  function applySuggestion() {
    if (!suggestedStage || !selectRef.current) return;
    selectRef.current.value = suggestedStage;
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="dealId" value={dealId} />
      <select
        ref={selectRef}
        name="stage"
        defaultValue={stage}
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Deal stage"
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none focus:border-indigo-400 disabled:opacity-50"
      >
        {PIPELINE_STAGE_ORDER.map((s) => (
          <option key={s} value={s}>
            {PIPELINE_STAGE_LABELS[s]}
          </option>
        ))}
      </select>

      {suggestedStage ? (
        <button
          type="button"
          onClick={applySuggestion}
          disabled={pending}
          className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-left text-xs text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
        >
          Gmail suggests <strong>{PIPELINE_STAGE_LABELS[suggestedStage]}</strong> — confirm
        </button>
      ) : null}

      {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
    </form>
  );
}
